import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { chromium } from "playwright";
import { server } from "../tools/serve.mjs";

const pendingText = "Os dados foram validados neste navegador, mas ainda não foram enviados. Este template precisa de uma integração de transporte. Seus dados permanecem preenchidos; use um canal direto abaixo ou configure a integração para continuar.";
const fieldNames = ["inquiryType", "name", "company", "email", "phone", "reference", "application", "material", "dimensions", "standards", "quantity", "message"];
const productQuery = "/contato/?tipo=produto&ref=%5B%5BPRODUTO.SLUG%5D%5D";
const serviceQuery = "/contato/?tipo=servico&ref=%5B%5BSERVICO.SLUG%5D%5D";
const rssLimitMb = Number(process.env.INTERACTION_RSS_LIMIT_MB ?? 768);
const activeContexts = new Set();
let browser;
let origin;

function isLoopback(url) {
  return ["127.0.0.1", "localhost", "::1"].includes(new URL(url).hostname);
}

before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    headless: true,
    args: ["--disable-background-networking", "--disable-dev-shm-usage", "--disable-gpu", "--renderer-process-limit=2"],
  });
});

afterEach(async (context) => {
  const leakedContexts = activeContexts.size;
  await Promise.all([...activeContexts].map(async (browserContext) => {
    activeContexts.delete(browserContext);
    await browserContext.close().catch(() => {});
  }));

  const rssMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
  process.stdout.write(`# RSS after ${context.name}: ${rssMb} MB\n`);
  assert.equal(leakedContexts, 0, `${context.name}: browser context leaked past test cleanup`);
  assert.ok(rssMb <= rssLimitMb, `${context.name}: Node RSS ${rssMb} MB exceeded ${rssLimitMb} MB`);
});

after(async () => {
  await Promise.all([...activeContexts].map(async (context) => {
    activeContexts.delete(context);
    await context.close().catch(() => {});
  }));
  if (browser) await browser.close();
  if (server.listening) await new Promise((resolve) => server.close(resolve));
});

async function withPage(route, { contextOptions = {}, initScript } = {}, run) {
  assert.ok(browser?.isConnected(), "shared Chromium is not available");
  assert.ok(origin, "shared loopback server is not available");

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
    ...contextOptions,
  });
  activeContexts.add(context);
  const page = await context.newPage();
  const diagnostics = {
    consoleErrors: [],
    pageErrors: [],
    localErrors: [],
    externalRequests: [],
    localRequests: [],
  };
  page.on("console", (message) => {
    if (message.type() === "error") diagnostics.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => diagnostics.pageErrors.push(error.message));
  page.on("request", (request) => {
    if (isLoopback(request.url())) diagnostics.localRequests.push(request.url());
    else diagnostics.externalRequests.push(request.url());
  });
  page.on("response", (response) => {
    if (isLoopback(response.url()) && response.status() >= 400) diagnostics.localErrors.push(`${response.status()} ${response.url()}`);
  });
  await page.route("**/*", async (routeRequest) => {
    if (!isLoopback(routeRequest.request().url())) return routeRequest.abort("blockedbyclient");
    return routeRequest.continue();
  });

  let failure;
  try {
    if (initScript) await page.addInitScript(initScript);
    await page.goto(origin + route, { waitUntil: "load" });
    await run(page, origin, diagnostics);
  } catch (error) {
    failure = error;
  } finally {
    activeContexts.delete(context);
    await context.close().catch(() => {});
  }

  if (failure) throw failure;
  assert.deepEqual(diagnostics.consoleErrors, [], "console errors");
  assert.deepEqual(diagnostics.pageErrors, [], "page errors");
  assert.deepEqual(diagnostics.localErrors, [], "local HTTP responses >= 400");
  assert.deepEqual(diagnostics.externalRequests, [], "non-loopback requests");
}

async function fillValidForm(page) {
  await page.locator("#inquiryType").check();
  const values = {
    name: "Pessoa teste",
    company: "Empresa teste",
    email: "pessoa@example.test",
    phone: "5511999999999",
    reference: "Referência teste",
    application: "Aplicação de teste",
    material: "Material teste",
    dimensions: "100 x 200 mm",
    standards: "Norma teste",
    quantity: "10 unidades",
    message: "Requisito de teste",
  };
  for (const [name, value] of Object.entries(values)) await page.locator(`[name="${name}"]`).fill(value);
  return values;
}

test("test harness isolates a loopback page and records every forbidden diagnostic", async () => {
  await withPage("/", {}, async (_page, _origin, diagnostics) => {
    assert.equal(diagnostics.externalRequests.length, 0);
    assert.equal(diagnostics.localErrors.length, 0);
    assert.ok(diagnostics.localRequests.length > 0);
  });
});

test("mobile nav exposes its real panel and traps, closes, restores, and unlocks", async () => {
  await withPage("/", {}, async (page) => {
    const menu = page.locator("details.mobile-nav");
    const summary = menu.locator("summary");
    const panel = menu.locator("nav");
    assert.equal(await summary.getAttribute("aria-expanded"), "false");
    assert.equal(await summary.getAttribute("aria-controls"), await panel.getAttribute("id"));
    assert.notEqual(await summary.getAttribute("aria-controls"), await menu.getAttribute("id"));
    assert.ok(await panel.getAttribute("id"));

    await summary.click();
    await page.waitForFunction(() => document.querySelector("details.mobile-nav summary")?.getAttribute("aria-expanded") === "true");
    assert.equal(await summary.getAttribute("aria-expanded"), "true");
    await page.waitForFunction(() => document.body.dataset.scrollLockOwners === "1");
    await page.waitForFunction(() => document.activeElement === document.querySelector("details.mobile-nav nav a"));
    assert.equal(await panel.locator("a").first().evaluate((element) => element === document.activeElement), true);
    await page.keyboard.press("Shift+Tab");
    assert.equal(await panel.locator("a").last().evaluate((element) => element === document.activeElement), true);
    await page.keyboard.press("Tab");
    assert.equal(await panel.locator("a").first().evaluate((element) => element === document.activeElement), true);

    await page.keyboard.press("Escape");
    assert.equal(await menu.getAttribute("open"), null);
    assert.equal(await summary.getAttribute("aria-expanded"), "false");
    assert.equal(await summary.evaluate((element) => element === document.activeElement), true);
    await page.waitForFunction(() => document.body.dataset.scrollLockOwners === "0");

    await summary.click();
    await page.waitForFunction(() => document.body.dataset.scrollLockOwners === "1");
    await page.mouse.click(4, 200);
    await page.waitForFunction(() => !document.querySelector("details.mobile-nav")?.open);
    await page.waitForFunction(() => document.activeElement === document.querySelector("details.mobile-nav summary"));
    assert.equal(await menu.getAttribute("open"), null);
    assert.equal(await summary.evaluate((element) => element === document.activeElement), true);
    for (let cycle = 0; cycle < 2; cycle += 1) {
      await summary.click();
      await page.waitForFunction(() => document.body.dataset.scrollLockOwners === "1");
      await summary.click();
      await page.waitForFunction(() => document.body.dataset.scrollLockOwners === "0");
    }
  });
});

test("mobile nav link closes and navigates through the authored local route", async () => {
  await withPage("/", {}, async (page) => {
    await page.locator("details.mobile-nav summary").click();
    await Promise.all([
      page.waitForURL("**/empresa/index.html"),
      page.locator("details.mobile-nav nav a", { hasText: "Empresa" }).click(),
    ]);
    assert.equal(new URL(page.url()).pathname, "/empresa/index.html");
  });
});

test("catalog filter covers all cards, categories, reset, and an empty selection", async () => {
  await withPage("/catalogo/", {}, async (page) => {
    const cards = page.locator("[data-catalog-card]");
    const order = await cards.evaluateAll((elements) => elements.map((element) => element.querySelector("h3")?.textContent.trim()));
    assert.equal(await cards.count(), 6);
    assert.equal(await cards.evaluateAll((elements) => elements.every((element) => !element.hidden)), true);
    assert.equal(await page.locator("[data-filter-count]").textContent(), "6 famílias encontradas");

    await page.locator("[data-filter='category-01']").click();
    assert.equal(await cards.evaluateAll((elements) => elements.filter((element) => !element.hidden).length), 3);
    assert.equal(await page.locator("[data-filter='category-01']").getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator("[data-filter='all']").getAttribute("aria-pressed"), "false");
    assert.equal(await page.locator("[data-filter-count]").textContent(), "3 famílias encontradas");

    await page.locator("[data-filter='category-02']").click();
    assert.equal(await cards.evaluateAll((elements) => elements.filter((element) => !element.hidden).length), 3);
    assert.equal(await page.locator("[data-filter='category-02']").getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator("[data-filter-count]").textContent(), "3 famílias encontradas");

    await page.evaluate(async () => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.filter = "synthetic-empty";
      button.setAttribute("aria-pressed", "false");
      button.textContent = "Vazio";
      document.querySelector(".filter-controls").append(button);
      const { initCatalogFilter } = await import("/scripts/catalog-filter.js?synthetic-empty-test");
      initCatalogFilter();
    });
    await page.locator("[data-filter='synthetic-empty']").click();
    assert.equal(await cards.evaluateAll((elements) => elements.filter((element) => !element.hidden).length), 0);
    assert.equal(await page.locator("[data-filter-empty]").isVisible(), true);
    assert.equal(await page.locator("[data-filter-count]").textContent(), "0 famílias encontradas");

    await page.locator("[data-filter-reset]").click();
    assert.equal(await cards.evaluateAll((elements) => elements.every((element) => !element.hidden)), true);
    assert.deepEqual(await cards.evaluateAll((elements) => elements.map((element) => element.querySelector("h3")?.textContent.trim())), order);
  });
});

test("catalog malformed metadata fails open with the exact announcement", async () => {
  await withPage("/catalogo/", {}, async (page) => {
    await page.locator("[data-catalog-card]").first().evaluate((card) => card.removeAttribute("data-category"));
    await page.locator("[data-filter='category-02']").click();
    assert.equal(await page.locator("[data-filter-count]").textContent(), "Não foi possível aplicar os filtros. Todos os itens permanecem visíveis.");
    assert.equal(await page.locator("[data-filter-count]").getAttribute("aria-live"), "polite");
    assert.equal(await page.locator("[data-catalog-card]").evaluateAll((elements) => elements.every((element) => !element.hidden)), true);
    assert.equal(await page.locator("[data-filter='all']").getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator("[data-filter-reset]").isHidden(), true);
  });
});

test("catalog remains fully visible when JavaScript is disabled", async () => {
  await withPage("/catalogo/", { contextOptions: { javaScriptEnabled: false } }, async (page) => {
    assert.equal(await page.locator("[data-catalog-card]").count(), 6);
    assert.equal(await page.locator("[data-catalog-card]").evaluateAll((elements) => elements.every((element) => !element.hidden)), true);
  });
});

test("catalog rail stays inside the comparison it annotates at every foundation width", async () => {
  for (const width of [390, 768, 1440]) {
    await withPage("/catalogo/", { contextOptions: { viewport: { width, height: 844 } } }, async (page) => {
      const containment = await page.evaluate(() => {
        const filter = document.querySelector("[data-component='filter']");
        const grid = document.querySelector("[data-component='catalog-grid']");
        const rail = document.querySelector(".catalog-rail");
        return {
          gridInsideFilter: filter.contains(grid),
          railInsideFilter: filter.contains(rail),
          position: getComputedStyle(rail).position,
          filterHoldsGrid: filter.querySelectorAll("[data-catalog-card]").length,
        };
      });
      assert.deepEqual(containment, { gridInsideFilter: true, railInsideFilter: true, position: "sticky", filterHoldsGrid: 6 }, `${width}px containment`);

      // Scrolling three quarters through the comparison must keep the rail pinned, not leave it behind with the first row.
      await page.evaluate(() => {
        const grid = document.querySelector("[data-component='catalog-grid']").getBoundingClientRect();
        window.scrollTo({ top: window.scrollY + grid.top + grid.height * 0.75, behavior: "instant" });
      });
      // The reveal transition translates the section while it runs, so geometry is read only after it settles.
      await page.waitForFunction(() => getComputedStyle(document.querySelector("[data-component='filter']")).transform === "none");
      const pinned = await page.evaluate(async () => {
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const rail = document.querySelector(".catalog-rail").getBoundingClientRect();
        return {
          railTop: rail.top,
          railVisible: rail.bottom > 0 && rail.top < window.innerHeight,
          scrolled: window.scrollY > 0,
          overflows: document.documentElement.scrollWidth > window.innerWidth,
        };
      });
      assert.equal(pinned.scrolled, true, `${width}px: the comparison scrolls`);
      assert.equal(pinned.railVisible, true, `${width}px: the rail is still on screen inside the comparison`);
      assert.ok(pinned.railTop <= 24, `${width}px: the rail is pinned near the viewport top, measured ${pinned.railTop}`);
      assert.equal(pinned.overflows, false, `${width}px: no document overflow`);

      // Past the comparison the rail must release instead of covering the following sections.
      const released = await page.evaluate(async () => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const rail = document.querySelector(".catalog-rail").getBoundingClientRect();
        const help = document.querySelector("[data-component='selection-help']").getBoundingClientRect();
        return { railBottom: rail.bottom, helpTop: help.top };
      });
      assert.ok(released.railBottom <= released.helpTop + 1, `${width}px: the rail never covers the following section (${JSON.stringify(released)})`);
    });
  }
});

// What is pinned costs screen for as long as the comparison lasts. The rail once carried the heading
// and the no-scripting notice, stood 270px on a 900px viewport and covered three cards at a time; the
// ceiling keeps that content above the rail instead of inside it.
test("the pinned rail stays a control strip, not a panel", async () => {
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    await withPage("/catalogo/", { contextOptions: { viewport: { width, height } } }, async (page) => {
      const rail = await page.evaluate(() => {
        const element = document.querySelector(".catalog-rail");
        return {
          height: Math.round(element.getBoundingClientRect().height),
          holdsHeading: Boolean(element.querySelector("h1, h2, h3")),
          keepsControls: Boolean(element.querySelector("[data-filter]")),
          keepsCount: Boolean(element.querySelector("[data-filter-count]")),
        };
      });
      assert.equal(rail.holdsHeading, false, `${width}px: the heading reads once and stays above the rail`);
      assert.equal(rail.keepsControls, true, `${width}px: the controls are what must follow the comparison`);
      assert.equal(rail.keepsCount, true, `${width}px: the count answers the controls it travels with`);
      assert.ok(rail.height <= height * 0.2, `${width}px: pinned rail is ${rail.height}px, over 20% of the ${height}px viewport`);
    });
  }
});

test("narrow catalog controls scroll horizontally instead of overflowing the document", async () => {
  await withPage("/catalogo/", {}, async (page) => {
    const controls = page.locator(".catalog-rail__controls");
    const geometry = await controls.evaluate((element) => ({
      wrap: getComputedStyle(element).flexWrap,
      overflowX: getComputedStyle(element).overflowX,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      buttons: element.querySelectorAll("[data-filter]").length,
      documentOverflows: document.documentElement.scrollWidth > window.innerWidth,
    }));
    assert.equal(geometry.wrap, "nowrap");
    assert.equal(geometry.overflowX, "auto");
    assert.equal(geometry.buttons, 3);
    assert.equal(geometry.documentOverflows, false);
    assert.ok(geometry.scrollWidth > geometry.clientWidth, `controls overflow their rail at 390px (${geometry.scrollWidth} > ${geometry.clientWidth})`);
    const scrolled = await controls.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
      return element.scrollLeft;
    });
    assert.ok(scrolled > 0, "the control strip actually scrolls horizontally");
    assert.equal(await page.locator("[data-filter='category-02']").isVisible(), true);
    assert.equal(await page.locator(".filter-fallback").isVisible(), false, "the native fallback stays hidden while scripting works");
  });
});

test("no-JS catalog navigates by native category anchors with every card visible", async () => {
  await withPage("/catalogo/", { contextOptions: { javaScriptEnabled: false } }, async (page) => {
    const cards = page.locator("[data-catalog-card]");
    assert.equal(await cards.count(), 6);
    assert.equal(await cards.evaluateAll((elements) => elements.every((element) => element.getClientRects().length > 0)), true, "every card is rendered");
    assert.deepEqual(await cards.evaluateAll((elements) => elements.map((element) => element.dataset.category)), ["category-01", "category-01", "category-01", "category-02", "category-02", "category-02"]);
    assert.equal(await page.locator(".filter-controls").isVisible(), false, "the inert enhanced controls are not presented");

    const fallback = page.locator(".filter-fallback");
    assert.equal(await fallback.isVisible(), true);
    assert.equal(await fallback.getAttribute("aria-label"), "Categorias sem JavaScript");
    const links = await fallback.locator("a").evaluateAll((elements) => elements.map((element) => ({
      href: element.getAttribute("href"),
      label: element.textContent.trim(),
      pressed: element.getAttribute("aria-pressed"),
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
    })));
    assert.deepEqual(links.map(({ href, label, pressed }) => ({ href, label, pressed })), [
      { href: "#catalogo-familias", label: "Todas", pressed: null },
      { href: "#familia-01", label: "[[CATEGORIA 01]]", pressed: null },
      { href: "#familia-04", label: "[[CATEGORIA 02]]", pressed: null },
    ]);
    for (const link of links) assert.ok(link.width >= 44 && link.height >= 44, `fallback target: ${JSON.stringify(link)}`);

    // Each fallback target must be a real element of the preserved comparison, reached without scripting.
    for (const [hash, heading] of [["#catalogo-familias", "Famílias de exemplo para substituição"], ["#familia-01", "[[FAMÍLIA 01]]"], ["#familia-04", "[[FAMÍLIA 04]]"]]) {
      // Native anchors scroll smoothly, so the link is activated by keyboard instead of waiting for a stable hit box.
      await page.locator(`.filter-fallback a[href="${hash}"]`).focus();
      await page.keyboard.press("Enter");
      assert.equal(new URL(page.url()).hash, hash, `${hash} is reached natively`);
      const target = page.locator(hash);
      assert.equal(await target.count(), 1, `${hash} resolves to exactly one element`);
      assert.equal((await target.locator("h2, h3").first().innerText()).trim(), heading, `${hash} reaches its authored content`);
      assert.equal(await cards.evaluateAll((elements) => elements.every((element) => !element.hidden && element.getClientRects().length > 0)), true, `${hash} hides no static card`);
    }
    assert.equal(await page.locator("[data-filter-empty]").isVisible(), false, "no false empty state without scripting");
    assert.equal(await page.locator("[data-filter-reset]").isVisible(), false, "no false reset state without scripting");
  });
});

test("card RFQ action reaches Contact generically and carries no item context", async () => {
  await withPage("/catalogo/", {}, async (page) => {
    const actions = await page.locator("[data-catalog-card] .card-actions").evaluateAll((groups) => groups.map((group) => [...group.querySelectorAll("a")].map((link) => ({
      href: link.getAttribute("href"),
      label: link.textContent.trim(),
      height: link.getBoundingClientRect().height,
    }))));
    assert.equal(actions.length, 6);
    for (const group of actions) {
      assert.deepEqual(group.map(({ href, label }) => ({ href, label })), [
        { href: "solucao-exemplo/", label: "Consultar detalhes" },
        { href: "../contato/", label: "Solicitar avaliação" },
      ]);
      for (const link of group) assert.ok(link.height >= 44, `card action target: ${JSON.stringify(link)}`);
    }

    await page.locator("[data-catalog-card] .card-actions a[href='../contato/']").first().click();
    await page.waitForURL("**/contato/");
    const location = new URL(page.url());
    assert.equal(location.pathname, "/contato/");
    assert.equal(location.search, "", "the generic action carries no query");
    assert.equal(await page.locator("[data-context-summary]").textContent(), "Nenhum item específico selecionado");
    assert.equal(await page.locator("#reference").inputValue(), "");
    assert.equal(await page.locator("#inquiryType:checked").count(), 0);
    await fillValidForm(page);
    const context = await page.evaluate(() => new Promise((resolve) => {
      const form = document.querySelector("[data-inquiry-form]");
      form.addEventListener("seed:inquiry-submit", (event) => resolve(event.detail.context), { once: true });
      form.querySelector("[data-form-submit]").click();
    }));
    assert.equal(context, null);
    assert.equal(await page.locator("[data-form-status]").textContent(), pendingText);
  });
});

test("gallery preserves authored links and owns its complete keyboard lifecycle", async () => {
  await withPage("/catalogo/solucao-exemplo/", {}, async (page) => {
    const items = page.locator(".gallery a[data-gallery-item]");
    const authoredHrefs = await items.evaluateAll((elements) => elements.map((element) => element.getAttribute("href")));
    assert.equal(await items.count(), 2);
    await items.first().click();
    assert.deepEqual(await items.evaluateAll((elements) => elements.map((element) => element.getAttribute("href"))), authoredHrefs);
    assert.equal(await page.locator("dialog.gallery-dialog").isVisible(), true);
    assert.equal(await page.locator("[data-gallery-counter]").textContent(), "Imagem 1 de 2");
    assert.equal(await page.locator("[data-gallery-prev]").isDisabled(), true);
    assert.equal(await page.locator("[data-gallery-next]").isDisabled(), false);
    await page.waitForFunction(() => document.body.dataset.scrollLockOwners === "1");

    await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator("[data-gallery-counter]").textContent(), "Imagem 2 de 2");
    assert.equal(await page.locator("[data-gallery-next]").isDisabled(), true);
    await page.keyboard.press("ArrowLeft");
    assert.equal(await page.locator("[data-gallery-counter]").textContent(), "Imagem 1 de 2");
    assert.equal(await page.locator("[data-gallery-prev]").isDisabled(), true);
    assert.equal(await page.locator("[data-gallery-counter]").textContent(), "Imagem 1 de 2");

    await page.keyboard.press("Escape");
    assert.equal(await page.locator("dialog.gallery-dialog").isVisible(), false);
    assert.equal(await items.first().evaluate((element) => element === document.activeElement), true);
    await page.waitForFunction(() => document.body.dataset.scrollLockOwners === "0");

    for (let cycle = 0; cycle < 2; cycle += 1) {
      await items.first().click();
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.body.dataset.scrollLockOwners === "0");
    }
    await items.first().click();
    await page.locator("[data-gallery-image]").evaluate((image) => image.dispatchEvent(new Event("error")));
    assert.equal(await page.locator("[data-gallery-unavailable]").getAttribute("role"), "status");
    assert.equal(await page.locator("[data-gallery-unavailable]").getAttribute("aria-live"), "polite");
    assert.equal(await page.locator("[data-gallery-unavailable]").textContent(), "Esta mídia não está disponível.");
    assert.equal(await page.locator("[data-gallery-unavailable]").isVisible(), true);
    await page.waitForFunction(() => document.body.dataset.scrollLockOwners === "1");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.body.dataset.scrollLockOwners === "0");
  });
});

test("FAQ keeps native details semantics and exposes initial and toggled state", async () => {
  await withPage("/", {}, async (page) => {
    const details = page.locator("details:not(.mobile-nav)");
    assert.ok(await details.count() >= 2);
    const first = details.nth(0);
    const second = details.nth(1);
    assert.equal(await first.locator("summary").getAttribute("aria-expanded"), "false");
    assert.equal(await first.locator("summary").getAttribute("data-state-label"), "Expandir resposta");
    await first.locator("summary").press("Enter");
    await page.waitForFunction(() => document.querySelector("details:not(.mobile-nav)")?.open === true);
    assert.equal(await first.getAttribute("open"), "");
    assert.equal(await first.locator("summary").getAttribute("aria-expanded"), "true");
    assert.equal(await first.locator("summary").getAttribute("data-state-label"), "Recolher resposta");
    await second.locator("summary").click();
    await page.waitForFunction(() => document.querySelectorAll("details:not(.mobile-nav)[open]").length === 2);
    assert.equal(await first.getAttribute("open"), "");
    assert.equal(await second.getAttribute("open"), "");
    await first.locator("summary").click();
    await page.waitForFunction(() => document.querySelector("details:not(.mobile-nav)")?.open === false);
    await page.waitForFunction(() => document.querySelector("details:not(.mobile-nav) summary")?.getAttribute("aria-expanded") === "false");
    assert.equal(await first.locator("summary").getAttribute("aria-expanded"), "false");
    assert.equal(await first.locator("summary").getAttribute("data-state-label"), "Expandir resposta");
  });
});

test("reveal never leaves above-fold content pending", async () => {
  await withPage("/", {}, async (page) => {
    const pendingAboveFold = await page.locator("main > section.section").evaluateAll((sections) => sections.filter((section) => section.getBoundingClientRect().top <= innerHeight).some((section) => section.classList.contains("is-reveal-pending")));
    assert.equal(pendingAboveFold, false);
  });
});

test("reveal completes every section for reduced motion", async () => {
  await withPage("/", { contextOptions: { reducedMotion: "reduce" } }, async (page) => {
    assert.equal(await page.locator("main > section.section").evaluateAll((sections) => sections.every((section) => section.classList.contains("is-revealed") && !section.classList.contains("is-reveal-pending"))), true);
  });
});

test("reveal completes every section when IntersectionObserver is unavailable", async () => {
  await withPage("/", {}, async (page) => {
    await page.evaluate(async () => {
      delete window.IntersectionObserver;
      const { initReveal } = await import("/scripts/reveal.js?missing-intersection-observer");
      initReveal();
    });
    assert.equal(await page.locator("main > section.section").evaluateAll((sections) => sections.every((section) => section.classList.contains("is-revealed") && !section.classList.contains("is-reveal-pending"))), true);
  });
});

test("video initializer requires a poster and keeps valid local video safe", async () => {
  await withPage("/", { contextOptions: { reducedMotion: "reduce" } }, async (page) => {
    await page.setViewportSize({ width: 1440, height: 844 });
    const result = await page.evaluate(async () => {
      const { initVideo } = await import("/scripts/video.js?video-contract");
      const missingWrapper = document.createElement("div");
      missingWrapper.className = "hero-media";
      missingWrapper.innerHTML = "<video autoplay></video>";
      document.body.append(missingWrapper);
      const failedHero = document.createElement("section");
      failedHero.className = "hero hero--editorial no-media";
      failedHero.innerHTML = '<div class="container hero-grid"><div>Copy remains primary.</div></div>';
      const failedHeroWrapper = document.createElement("div");
      failedHeroWrapper.className = "hero-media hero-media--video";
      failedHeroWrapper.innerHTML = "<video autoplay></video>";
      failedHero.querySelector(".hero-grid").append(failedHeroWrapper);
      document.body.append(failedHero);
      const validWrapper = document.createElement("div");
      validWrapper.className = "hero-media";
      validWrapper.innerHTML = '<video autoplay poster="/assets/diagrams/material-stack.svg"></video>';
      document.body.append(validWrapper);
      initVideo();
      const missing = missingWrapper.querySelector("video");
      const valid = validWrapper.querySelector("video");
      const failedHeroGrid = failedHero.querySelector(".hero-grid");
      const failedHeroTracks = getComputedStyle(failedHeroGrid).gridTemplateColumns.trim().split(/\s+/).filter(Boolean);
      return {
        missingHidden: missing.hidden,
        missingFallback: missingWrapper.classList.contains("no-media"),
        failedHeroFallback: failedHeroWrapper.classList.contains("no-media"),
        failedHeroWrapperHidden: getComputedStyle(failedHeroWrapper).display === "none",
        failedHeroWrapperHasNoBox: failedHeroWrapper.getBoundingClientRect().width === 0 && failedHeroWrapper.getBoundingClientRect().height === 0,
        failedHeroTrackCount: failedHeroTracks.length,
        validHidden: valid.hidden,
        validControls: valid.controls,
        validMuted: valid.muted,
        validAutoplay: valid.autoplay,
        validAutoplayAttribute: valid.hasAttribute("autoplay"),
      };
    });
    assert.deepEqual(result, {
      missingHidden: true,
      missingFallback: true,
      failedHeroFallback: true,
      failedHeroWrapperHidden: true,
      failedHeroWrapperHasNoBox: true,
      failedHeroTrackCount: 1,
      validHidden: false,
      validControls: true,
      validMuted: true,
      validAutoplay: false,
      validAutoplayAttribute: false,
    });
  });
});

test("invalid RFQ focuses the exact summary, links fields, and preserves invalid values", async () => {
  await withPage("/contato/", {}, async (page) => {
    await page.locator("#inquiryType").check();
    await page.locator("#name").fill("Nome preservado");
    await page.locator("#company").fill("Empresa preservada");
    await page.locator("#email").fill("email-invalido");
    await page.locator("#application").fill("Aplicação preservada");
    await page.locator("#message").fill("Mensagem preservada");
    await page.locator("[data-form-submit]").click();
    const summary = page.locator("[data-error-summary]");
    assert.equal(await summary.locator("h3").textContent(), "Revise os campos indicados");
    assert.equal(await summary.evaluate((element) => element === document.activeElement), true);
    for (const link of await summary.locator("a").all()) {
      const target = await link.getAttribute("href");
      assert.ok(target?.startsWith("#"));
      await link.click();
      assert.equal(await page.locator(target).evaluate((element) => element === document.activeElement), true);
    }
    assert.equal(await page.locator("#email").getAttribute("aria-invalid"), "true");
    assert.ok((await page.locator("#email").getAttribute("aria-describedby"))?.includes("email-error"));
    assert.equal(await page.locator("#name").inputValue(), "Nome preservado");
    assert.equal(await page.locator("#email").inputValue(), "email-invalido");
  });
});

test("valid RFQ without query dispatches one fixed event and only pending status", async () => {
  await withPage("/contato/", {}, async (page, origin, diagnostics) => {
    const values = await fillValidForm(page);
    const originalUrl = page.url();
    const requestCount = diagnostics.localRequests.length;
    const event = await page.evaluate(() => new Promise((resolve) => {
      const form = document.querySelector("[data-inquiry-form]");
      form.addEventListener("seed:inquiry-submit", (event) => {
        form.querySelector("[data-form-status]").textContent = "sucesso";
        resolve({ bubbles: event.bubbles, cancelable: event.cancelable, values: event.detail.values, context: event.detail.context });
      }, { once: true });
      form.querySelector("[data-form-submit]").click();
    }));
    assert.equal(origin + "/contato/", originalUrl);
    assert.equal(page.url(), originalUrl);
    assert.equal(diagnostics.localRequests.length, requestCount);
    assert.deepEqual(event, { bubbles: true, cancelable: false, values: { inquiryType: "produto", ...values }, context: null });
    assert.deepEqual(Object.keys(event.values), fieldNames);
    assert.equal(await page.locator("[data-form-status]").textContent(), pendingText);
    assert.equal(await page.locator("#name").inputValue(), values.name);
  });
});

for (const [route, expected] of [
  [productQuery, { type: "produto", reference: "[[PRODUTO.SLUG]]", label: "[[PRODUTO.NOME]]" }],
  [serviceQuery, { type: "servico", reference: "[[SERVICO.SLUG]]", label: "[[SERVICO.NOME]]" }],
]) {
  test(`allowlisted contextual query ${expected.type} renders and dispatches exact context`, async () => {
    await withPage(route, {}, async (page) => {
      assert.equal(await page.locator("[data-context-summary]").textContent(), `Assunto selecionado: ${expected.label}`);
      await fillValidForm(page);
      const event = await page.evaluate(() => new Promise((resolve) => {
        const form = document.querySelector("[data-inquiry-form]");
        form.addEventListener("seed:inquiry-submit", (event) => resolve(event.detail.context), { once: true });
        form.querySelector("[data-form-submit]").click();
      }));
      assert.deepEqual(event, expected);
      assert.equal(await page.locator("[data-form-status]").textContent(), pendingText);
    });
  });
}

test("unknown contextual query remains null and cannot prefill or infer context", async () => {
  await withPage("/contato/?tipo=produto&ref=unsafe-reference", {}, async (page) => {
    assert.equal(await page.locator("[data-context-summary]").textContent(), "Nenhum item específico selecionado");
    assert.equal(await page.locator("#reference").inputValue(), "");
    assert.equal(await page.locator("#inquiryType:checked").count(), 0);
    await fillValidForm(page);
    const context = await page.evaluate(() => new Promise((resolve) => {
      const form = document.querySelector("[data-inquiry-form]");
      form.addEventListener("seed:inquiry-submit", (event) => resolve(event.detail.context), { once: true });
      form.querySelector("[data-form-submit]").click();
    }));
    assert.equal(context, null);
  });
});

test("with JavaScript enabled the no-JS notice remains present but unrendered", async () => {
  await withPage("/contato/", {}, async (page) => {
    const state = await page.evaluate(() => {
      const form = document.querySelector("[data-inquiry-form]");
      const notice = form.querySelector("noscript.notice");
      return {
        exists: Boolean(notice),
        rendered: Boolean(notice?.getClientRects().length),
        visibleText: form.innerText.includes("A validação assistida requer JavaScript."),
      };
    });
    assert.deepEqual(state, { exists: true, rendered: false, visibleText: false });
  });
});

test("capability hero actions are keyboard reachable and keep their exact targets", async () => {
  await withPage("/servicos/servico-exemplo/", {}, async (page) => {
    const actions = await page.evaluate(() => {
      const links = [...document.querySelectorAll(".hero .actions a")];
      return links.map((link) => ({
        label: link.textContent.trim(),
        href: link.getAttribute("href"),
        className: link.className,
        visible: link.getBoundingClientRect().height >= 44,
      }));
    });
    assert.deepEqual(actions, [
      { label: "Solicitar avaliação desta capacidade", href: "../../contato/?tipo=servico&ref=[[SERVICO.SLUG]]", className: "button", visible: true },
      { label: "Ver como funciona", href: "#processo-capacidade", className: "button secondary", visible: true },
    ]);

    await page.evaluate(() => document.querySelector(".hero .actions a").focus());
    assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), "Solicitar avaliação desta capacidade");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute("href")), "#processo-capacidade");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => window.location.hash === "#processo-capacidade");
    const target = await page.evaluate(() => {
      const section = document.querySelector("#processo-capacidade");
      return { heading: section.querySelector("h2").textContent.trim(), overflows: document.documentElement.scrollWidth > window.innerWidth };
    });
    assert.deepEqual(target, { heading: "Etapas da capacidade", overflows: false });
  });
});

// The density contract sends a shallow family to `.sector-list` plus one shared action, but the seed
// itself never composes that pair on any page, so no test rendered it and the CSS was never checked.
// Four of five generated sites then shipped the button flush against the last chip. The composition
// is built here because the contract prescribes it: a rule the seed asks adapters to use is a rule
// the seed has to render at least once.
test("a shallow family and its one shared action do not touch", async () => {
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    await withPage("/", { contextOptions: { viewport: { width, height } } }, async (page) => {
      const gaps = await page.evaluate(() => {
        const host = document.querySelector("main .container");
        const block = document.createElement("div");
        block.innerHTML = `
          <ul class="sector-list"><li>Alfa</li><li>Beta</li><li>Gama</li></ul>
          <p><a class="button secondary" href="#contato">Compartilhar contexto</a></p>`;
        host.append(block);
        const list = block.querySelector(".sector-list");
        const button = block.querySelector("a.button");
        const gap = button.getBoundingClientRect().top - list.getBoundingClientRect().bottom;

        // The same list ending its section must not push the section padding open.
        const solo = document.createElement("div");
        solo.innerHTML = `<ul class="sector-list"><li>Alfa</li></ul>`;
        host.append(solo);
        const trailing = getComputedStyle(solo.querySelector(".sector-list")).marginBottom;

        block.remove();
        solo.remove();
        return { gap: Math.round(gap), trailing };
      });
      assert.ok(gaps.gap >= 16, `${width}px: the shared action sits ${gaps.gap}px from the chips`);
      assert.equal(gaps.trailing, "0px", `${width}px: a list that ends its section adds no trailing gap`);
    });
  }
});
