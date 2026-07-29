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
