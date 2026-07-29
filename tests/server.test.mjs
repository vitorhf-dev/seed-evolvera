import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { server } from "../tools/serve.mjs";

const excludedDirectories = new Set([".git", ".pi", "node_modules", "dist"]);
const routes = [
  "/",
  "/empresa/",
  "/catalogo/",
  "/catalogo/solucao-exemplo/",
  "/servicos/capacidade-exemplo/",
  "/contato/",
];

function walk(directory = ".") {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => !excludedDirectories.has(entry.name))
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? walk(path) : [path];
    });
}

function sourceFingerprint() {
  const inventory = walk()
    .sort()
    .map((path) => {
      const contentHash = createHash("sha256").update(readFileSync(path)).digest("hex");
      return `${path}:${statSync(path).size}:${contentHash}`;
    })
    .join("\n");
  return createHash("sha256").update(inventory).digest("hex");
}

async function request(base, path, options) {
  return fetch(base + path, options);
}

test("read-only server closes routes, MIME types, traversal and methods", async () => {
  const before = sourceFingerprint();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    for (const route of routes) {
      const response = await request(base, route);
      assert.equal(response.status, 200, route);
      assert.match(response.headers.get("content-type") ?? "", /text\/html/);
    }

    for (const [path, mime] of [
      ["/styles/tokens.css", "text/css"],
      ["/blueprint.json", "application/json"],
      ["/assets/diagrams/material-stack.svg", "image/svg+xml"],
    ]) {
      const response = await request(base, path);
      assert.equal(response.status, 200, path);
      assert.equal(response.headers.get("content-type")?.includes(mime), true);
    }

    assert.equal((await request(base, "/missing")).status, 404);
    assert.equal((await request(base, "/", { method: "POST" })).status, 405);
    assert.equal((await request(base, "/..%2f..%2fetc%2fpasswd")).status, 404);
    assert.equal((await request(base, "/%2e%2e/%2e%2e/etc/passwd")).status, 404);

    const head = await request(base, "/catalogo/solucao-exemplo/", { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  assert.equal(sourceFingerprint(), before, "project source changed while serving requests");
});
