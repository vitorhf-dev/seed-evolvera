import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { server } from "../tools/serve.mjs";

const routes = [
  "/",
  "/empresa/",
  "/catalogo/",
  "/catalogo/solucao-exemplo/",
  "/servicos/servico-exemplo/",
  "/contato/",
];
const viewports = [390, 768, 1440];
const ctaBandRoutes = ["/", "/empresa/"];

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

test("canonical no-media heroes are one copy-only track that centers at the reading measure on desktop", async () => {
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
          const children = [...heroGrid.children];
          const copy = children[0];
          const gridBox = heroGrid.getBoundingClientRect();
          const copyBox = copy.getBoundingClientRect();
          return {
            trackCount: tracks.length,
            childCount: children.length,
            mediaChildCount: heroGrid.querySelectorAll(":scope > .hero-media").length,
            gridWidth: gridBox.width,
            copyWidth: copyBox.width,
            leftInset: copyBox.left - gridBox.left,
            rightInset: gridBox.right - copyBox.right,
            textAlign: getComputedStyle(copy).textAlign,
          };
        });
        assert.equal(layout.trackCount, 1, `${route} at ${width}px has no reserved media column`);
        assert.equal(layout.childCount, 1, `${route} at ${width}px has a copy-only hero grid`);
        assert.equal(layout.mediaChildCount, 0, `${route} at ${width}px has no media or rail child`);
        // `start` is the untouched initial value and resolves to left in this LTR document.
        assert.ok(
          ["left", "start"].includes(layout.textAlign),
          `${route} at ${width}px keeps left-aligned copy, got ${layout.textAlign}`,
        );

        if (width >= 1024) {
          const expected = Math.min(720, layout.gridWidth);
          assert.ok(
            Math.abs(layout.copyWidth - expected) <= 1,
            `${route} at ${width}px holds the reading measure: ${layout.copyWidth} vs ${expected}`,
          );
          assert.ok(layout.leftInset > 1, `${route} at ${width}px has a nonzero left inset: ${layout.leftInset}`);
          assert.ok(
            Math.abs(layout.leftInset - layout.rightInset) <= 1,
            `${route} at ${width}px centers the copy: ${layout.leftInset} vs ${layout.rightInset}`,
          );
        } else {
          assert.ok(
            Math.abs(layout.copyWidth - layout.gridWidth) <= 1,
            `${route} at ${width}px fills the hero grid: ${layout.copyWidth} vs ${layout.gridWidth}`,
          );
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("closing CTA bands anchor their action to the container edge on desktop", async () => {
  const origin = await listen();
  const browser = await chromium.launch({ headless: true });

  try {
    for (const width of [768, 1440]) {
      for (const route of ctaBandRoutes) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          javaScriptEnabled: false,
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        await page.goto(origin + route, { waitUntil: "load" });
        const layout = await page.locator(".cta-band .split").evaluate((split) => {
          const button = split.querySelector(":scope > .button");
          const splitBox = split.getBoundingClientRect();
          const buttonBox = button.getBoundingClientRect();
          return {
            buttonWidth: buttonBox.width,
            rightInset: splitBox.right - buttonBox.right,
          };
        });
        assert.ok(layout.buttonWidth >= 44, `${route} at ${width}px keeps a usable closing CTA`);
        assert.ok(
          Math.abs(layout.rightInset) <= 1,
          `${route} at ${width}px anchors the closing CTA to the container edge: ${layout.rightInset}`,
        );
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

test("the opt-in stacked section head reads as one left-aligned column without changing default heads", async () => {
  const origin = await listen();
  const browser = await chromium.launch({ headless: true });

  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
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
      await page.goto(origin + "/", { waitUntil: "load" });

      const layout = await page.evaluate(() => {
        const read = (head) => {
          const description = head.querySelector(":scope > p");
          const headingBlock = head.querySelector(":scope > div");
          const headBox = head.getBoundingClientRect();
          const headingBox = headingBlock.getBoundingClientRect();
          const descriptionBox = description.getBoundingClientRect();
          return {
            trackCount: getComputedStyle(head).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length,
            headLeft: headBox.left,
            headRight: headBox.right,
            headingBottom: headingBox.bottom,
            descriptionTop: descriptionBox.top,
            descriptionLeft: descriptionBox.left,
            descriptionRight: descriptionBox.right,
          };
        };
        return {
          stacked: read(document.querySelector('[data-component="route-choice"] .section-head')),
          stackedModifierCount: document.querySelectorAll(".section-head--stacked").length,
          defaults: [...document.querySelectorAll(".section-head:not(.section-head--stacked)")].map(read),
          overflows: document.documentElement.scrollWidth > window.innerWidth,
        };
      });

      assert.equal(layout.stackedModifierCount, 1, `${width}px: the modifier stays a single intentional example`);
      assert.equal(layout.overflows, false, `${width}px: the stacked head does not overflow`);
      assert.equal(layout.stacked.trackCount, 1, `${width}px: the stacked head keeps one grid track`);
      assert.ok(
        layout.stacked.descriptionTop >= layout.stacked.headingBottom - 1,
        `${width}px: the description begins below the heading block: ${layout.stacked.descriptionTop} vs ${layout.stacked.headingBottom}`,
      );
      assert.ok(
        Math.abs(layout.stacked.descriptionLeft - layout.stacked.headLeft) <= 1,
        `${width}px: the description aligns to the head left edge: ${layout.stacked.descriptionLeft} vs ${layout.stacked.headLeft}`,
      );
      assert.ok(
        layout.stacked.descriptionRight <= layout.stacked.headRight + 1,
        `${width}px: the description stays inside the head: ${layout.stacked.descriptionRight} vs ${layout.stacked.headRight}`,
      );

      assert.ok(layout.defaults.length > 0, `${width}px: default heads are still present`);
      for (const head of layout.defaults) {
        assert.equal(
          head.trackCount,
          width >= 768 ? 2 : 1,
          `${width}px: default heads keep their own layout, got ${head.trackCount} tracks`,
        );
        if (width >= 768) {
          assert.ok(
            head.descriptionTop < head.headingBottom,
            `${width}px: default heads keep the description beside the heading: ${head.descriptionTop} vs ${head.headingBottom}`,
          );
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
