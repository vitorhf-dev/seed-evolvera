import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { server } from "../tools/serve.mjs";

const routes = [
  "/",
  "/empresa/",
  "/catalogo/",
  "/catalogo/solucao-exemplo/",
  "/servicos/capacidade-exemplo/",
  "/contato/",
];
const viewports = [390, 768, 1440];

async function listen() {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

test("six pages render locally without JavaScript at all foundation widths", async () => {
  const origin = await listen();
  const browser = await chromium.launch({ headless: true });

  try {
    for (const width of viewports) {
      for (const route of routes) {
        const context = await browser.newContext({
          viewport: { width, height: 844 },
          javaScriptEnabled: false,
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        const runtimeErrors = [];
        const externalAttempts = [];
        const failedLocalResponses = [];

        page.on("console", (message) => {
          if (message.type() === "error") runtimeErrors.push(message.text());
        });
        page.on("pageerror", (error) => runtimeErrors.push(error.message));
        page.on("request", (request) => {
          const url = new URL(request.url());
          if (url.hostname !== "127.0.0.1") externalAttempts.push(request.url());
        });
        page.on("response", (response) => {
          const url = new URL(response.url());
          if (url.hostname === "127.0.0.1" && response.status() >= 400) {
            failedLocalResponses.push(`${response.status()} ${response.url()}`);
          }
        });
        await page.route("**/*", async (requestRoute) => {
          const url = new URL(requestRoute.request().url());
          if (url.hostname !== "127.0.0.1") {
            await requestRoute.abort("blockedbyclient");
            return;
          }
          await requestRoute.continue();
        });

        const response = await page.goto(origin + route, { waitUntil: "load" });
        assert.equal(response?.status(), 200, `${route} at ${width}px`);

        const state = await page.evaluate(() => ({
          h1Count: document.querySelectorAll("h1").length,
          hasMain: Boolean(document.querySelector("main")),
          overflows: document.documentElement.scrollWidth > window.innerWidth,
          targetSizes: [...document.querySelectorAll("a:not(.skip-link), button, input:not([type=radio]), select, textarea, summary")]
            .filter((element) => element.getClientRects().length > 0)
            .map((element) => ({
              label: element.textContent?.trim() || element.getAttribute("name"),
              width: element.getBoundingClientRect().width,
              height: element.getBoundingClientRect().height,
            })),
        }));

        assert.equal(state.h1Count, 1, route);
        assert.equal(state.hasMain, true, route);
        assert.equal(state.overflows, false, `${route} at ${width}px`);
        for (const target of state.targetSizes) {
          assert.equal(target.width >= 44 && target.height >= 44, true, `${route} ${width}px: ${JSON.stringify(target)}`);
        }
        assert.deepEqual(runtimeErrors, [], `${route} at ${width}px`);
        assert.deepEqual(externalAttempts, [], `${route} at ${width}px`);
        assert.deepEqual(failedLocalResponses, [], `${route} at ${width}px`);
        await context.close();
      }
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("canonical no-media heroes reserve one grid column at tablet and desktop widths", async () => {
  const origin = await listen();
  const browser = await chromium.launch({ headless: true });

  try {
    for (const width of [768, 1440]) {
      for (const route of routes) {
        const context = await browser.newContext({
          viewport: { width, height: 844 },
          javaScriptEnabled: false,
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        await page.route("**/*", async (requestRoute) => {
          const url = new URL(requestRoute.request().url());
          if (url.hostname !== "127.0.0.1") {
            await requestRoute.abort("blockedbyclient");
            return;
          }
          await requestRoute.continue();
        });
        await page.goto(origin + route, { waitUntil: "load" });
        const layout = await page.locator(".hero-grid").evaluate((heroGrid) => {
          const style = getComputedStyle(heroGrid);
          const tracks = style.gridTemplateColumns.trim().split(/\s+/).filter(Boolean);
          const rail = heroGrid.querySelector(":scope > .hero-media--editorial");
          return {
            trackCount: tracks.length,
            railHeight: rail?.getBoundingClientRect().height ?? 0,
            railDisplay: rail ? getComputedStyle(rail).display : "missing",
          };
        });
        assert.equal(layout.trackCount, 1, `${route} at ${width}px has no reserved media column`);
        assert.ok(layout.railHeight <= 64, `${route} at ${width}px editorial rail stays compact`);
        assert.notEqual(layout.railDisplay, "none", `${route} at ${width}px keeps the editorial rail`);
        await context.close();
      }
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("desktop headers render one grouped rounded-rectangle navigation with a stronger CTA", async () => {
  const origin = await listen();
  const browser = await chromium.launch({ headless: true });

  try {
    for (const route of routes) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        javaScriptEnabled: false,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      await page.route("**/*", async (requestRoute) => {
        const url = new URL(requestRoute.request().url());
        if (url.hostname !== "127.0.0.1") {
          await requestRoute.abort("blockedbyclient");
          return;
        }
        await requestRoute.continue();
      });
      await page.goto(origin + route, { waitUntil: "load" });

      const header = await page.evaluate(() => {
        const nav = document.querySelector(".nav.desktop-nav");
        const cta = document.querySelector(".header-cta");
        const navStyle = getComputedStyle(nav);
        const ctaStyle = getComputedStyle(cta);
        const navBox = nav.getBoundingClientRect();
        const links = [...nav.querySelectorAll("a")].map((link) => {
          const style = getComputedStyle(link);
          const box = link.getBoundingClientRect();
          return {
            radius: Number.parseFloat(style.borderTopLeftRadius),
            height: box.height,
            width: box.width,
            insideGroup: box.left >= navBox.left - 0.5 && box.right <= navBox.right + 0.5,
            current: link.getAttribute("aria-current") === "page",
            background: style.backgroundColor,
          };
        });
        return {
          navVisible: navBox.width > 0 && navBox.height > 0,
          navRadius: Number.parseFloat(navStyle.borderTopLeftRadius),
          navBorderWidth: Number.parseFloat(navStyle.borderTopWidth),
          navBackground: navStyle.backgroundColor,
          navTransparent: navStyle.backgroundColor === "rgba(0, 0, 0, 0)",
          navHeight: navBox.height,
          links,
          ctaVisible: cta.getBoundingClientRect().height > 0,
          ctaBackground: ctaStyle.backgroundColor,
          ctaTransparent: ctaStyle.backgroundColor === "rgba(0, 0, 0, 0)",
          ctaRadius: Number.parseFloat(ctaStyle.borderTopLeftRadius),
          ctaHeight: cta.getBoundingClientRect().height,
        };
      });

      assert.equal(header.navVisible, true, `${route} desktop nav is visible at 1440px`);
      assert.equal(header.navTransparent, false, `${route} nav group is one filled surface`);
      assert.ok(header.navBorderWidth >= 1, `${route} nav group is bounded by a border`);
      assert.ok(header.navRadius >= 10 && header.navRadius <= 28, `${route} nav group uses a medium radius: ${header.navRadius}`);
      assert.equal(header.links.length, 5, `${route} keeps five nav links`);
      assert.equal(header.links.filter((link) => link.current).length, 1, `${route} marks exactly one current link`);
      for (const link of header.links) {
        assert.ok(link.height >= 44 && link.width >= 44, `${route} nav target: ${JSON.stringify(link)}`);
        assert.ok(link.radius >= 4 && link.radius < link.height / 2, `${route} nav link is a rounded rectangle, not a pill: ${link.radius}`);
        assert.equal(link.insideGroup, true, `${route} nav link sits inside the group surface`);
      }
      const current = header.links.find((link) => link.current);
      const resting = header.links.find((link) => !link.current);
      assert.notEqual(current.background, resting.background, `${route} current link is visually distinct`);
      assert.notEqual(current.background, header.navBackground, `${route} current link separates from the group surface`);

      assert.equal(header.ctaVisible, true, `${route} header CTA is visible at 1440px`);
      assert.equal(header.ctaTransparent, false, `${route} header CTA stays a solid primary control`);
      assert.notEqual(header.ctaBackground, header.navBackground, `${route} header CTA is not part of the nav group`);
      for (const link of header.links) {
        assert.notEqual(header.ctaBackground, link.background, `${route} header CTA outranks every nav link`);
      }
      assert.ok(header.ctaRadius >= header.ctaHeight / 2, `${route} header CTA keeps its pill shape: ${header.ctaRadius}`);
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("Contact states the no-JavaScript boundary directly before the inert control", async () => {
  const origin = await listen();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    javaScriptEnabled: false,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  try {
    await page.goto(origin + "/contato/", { waitUntil: "load" });
    const notice = await page.evaluate(() => {
      const control = document.querySelector("[data-form-submit]");
      const element = document.querySelector("form[data-inquiry-form] .notice");
      if (!control || !element) return null;
      const box = element.getBoundingClientRect();
      return {
        text: element.textContent.trim(),
        visible: box.width > 0 && box.height > 0,
        precedesControl: Boolean(element.compareDocumentPosition(control) & Node.DOCUMENT_POSITION_FOLLOWING),
        links: element.querySelectorAll("a").length,
      };
    });

    assert.deepEqual(notice, {
      text: "A validação assistida requer JavaScript. Use um canal direto verificado.",
      visible: true,
      precedesControl: true,
      links: 0,
    });
  } finally {
    await context.close();
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("Home mobile first viewport and native no-JS navigation remain complete", async () => {
  const origin = await listen();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    javaScriptEnabled: false,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  try {
    await page.goto(origin + "/", { waitUntil: "load" });
    for (const selector of ["h1", ".lead", "[data-primary-cta]", "[data-trust-cue]"]) {
      const box = await page.locator(selector).boundingBox();
      assert.ok(box, `${selector} is visible`);
      assert.ok(box.y >= 0 && box.y + box.height <= 844, `${selector} is inside the first viewport`);
    }

    assert.equal(await page.locator(".desktop-nav").isVisible(), false);
    const menu = page.locator("details.mobile-nav");
    assert.equal(await menu.isVisible(), true);
    await menu.locator("summary").click();
    assert.equal(await menu.getAttribute("open"), "");
    const links = menu.locator("nav a");
    assert.equal(await links.count(), 5);
    for (let index = 0; index < 5; index += 1) {
      assert.equal(await links.nth(index).isVisible(), true);
    }
    await links.filter({ hasText: "Catálogo" }).click();
    assert.equal(new URL(page.url()).pathname, "/catalogo/index.html");
  } finally {
    await context.close();
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
