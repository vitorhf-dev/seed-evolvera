import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { server } from "../tools/serve.mjs";

const routes = [
  "/", "/empresa/", "/catalogo/", "/catalogo/solucao-exemplo/", "/servicos/servico-exemplo/", "/contato/",
];
const canonicalFiles = [
  "index.html", "empresa/index.html", "catalogo/index.html", "catalogo/solucao-exemplo/index.html", "servicos/servico-exemplo/index.html", "contato/index.html",
  "styles/tokens.css", "styles/base.css", "styles/components.css",
  "scripts/main.js", "scripts/mobile-nav.js", "scripts/scroll-lock.js", "scripts/catalog-filter.js", "scripts/gallery.js", "scripts/faq.js", "scripts/reveal.js", "scripts/video.js", "scripts/inquiry-form.js",
  "assets/diagrams/material-stack.svg", "assets/diagrams/dimension-guide.svg", "assets/diagrams/process-map.svg", "blueprint.json",
  "README.md", "package.json", "package-lock.json", "docs/ADAPTATION.md", "docs/BOSTOIDE_ADAPTER.md", "docs/TESTING.md", "docs/REFERENCE_ATTRIBUTION.md",
];

function sourceFingerprint() {
  const inventory = canonicalFiles.map((path) => {
    assert.equal(existsSync(path), true, `canonical source exists: ${path}`);
    const contentHash = createHash("sha256").update(readFileSync(path)).digest("hex");
    return `${path}:${statSync(path).size}:${contentHash}`;
  }).join("\n");
  return createHash("sha256").update(inventory).digest("hex");
}

async function request(base, path, options) {
  return fetch(base + path, options);
}

async function listen() {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

test("fixed local routes/resources and read-only methods are closed", async () => {
  const before = sourceFingerprint();
  const base = await listen();
  try {
    for (const route of routes) {
      const response = await request(base, route);
      assert.equal(response.status, 200, route);
      assert.match(response.headers.get("content-type") ?? "", /text\/html/);
    }
    for (const [path, mime] of [
      ["/styles/tokens.css", "text/css"], ["/styles/base.css", "text/css"], ["/styles/components.css", "text/css"],
      ["/scripts/main.js", "text/javascript"], ["/blueprint.json", "application/json"],
      ["/assets/diagrams/material-stack.svg", "image/svg+xml"], ["/assets/diagrams/dimension-guide.svg", "image/svg+xml"], ["/assets/diagrams/process-map.svg", "image/svg+xml"],
      ["/docs/ADAPTATION.md", "application/octet-stream"],
    ]) {
      const response = await request(base, path);
      assert.equal(response.status, 200, path);
      assert.equal(response.headers.get("content-type")?.includes(mime), true, `${path}: MIME`);
    }
    assert.equal((await request(base, "/missing")).status, 404);
    assert.equal((await request(base, "/", { method: "POST" })).status, 405);
    assert.equal((await request(base, "/../package.json")).status, 200, "normal URL normalization stays local");
    assert.equal((await request(base, "/..%2f..%2fetc%2fpasswd")).status, 404);
    assert.equal((await request(base, "/%2e%2e/%2e%2e/etc/passwd")).status, 404);
    assert.equal((await request(base, "/%00")).status, 400);
    const head = await request(base, "/catalogo/solucao-exemplo/", { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  assert.equal(sourceFingerprint(), before, "canonical HTML/CSS/JS/assets/manifest/docs/package changed while serving requests");
});
