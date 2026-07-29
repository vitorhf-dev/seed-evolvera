import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PRESETS, SECTION_KINDS, SECTION_KINDS_REGISTERED, RenderPreviewError, renderPagePreview, renderSitePreview, validateRenderedHtml } from "../src/index.js";
import { catalogConfig, hybridConfig, multipageConfig, serviceConfig, stageCatalogAssets, writePng } from "./fixtures.js";

const temporary = (): string => mkdtempSync(join(tmpdir(), "seed-renderer-unit-"));
const renderRoot = (config: Parameters<typeof renderPagePreview>[0], outDir: string) => renderPagePreview(config, { route: "/", outDir });

test("registry closes every section kind and presets remain distinct", () => {
  assert.deepEqual([...SECTION_KINDS_REGISTERED].sort(), [...SECTION_KINDS].sort()); assert.equal(new Set(SECTION_KINDS_REGISTERED).size, SECTION_KINDS.length); assert.deepEqual(PRESETS, ["service-driven", "catalog-driven", "hybrid"]);
});

test("no-media service Home is complete, escaped, deterministic, and preserves caller files", () => {
  const root = temporary(); try { writeFileSync(join(root, "sentinel.txt"), "caller-owned\n"); const config = serviceConfig(); const hero = config.pages[0]!.sections[0]!; assert.equal(hero.kind, "hero"); if (hero.kind === "hero") hero.title = `Controle <seguro> & "claro"`;
    const first = renderRoot(config, root); const bytes = first.files.map((name) => readFileSync(join(root, name), "utf8")); const second = renderRoot(config, root);
    assert.deepEqual(second.files.map((name) => readFileSync(join(root, name), "utf8")), bytes); assert.equal(readFileSync(join(root, "sentinel.txt"), "utf8"), "caller-owned\n");
    const html = bytes[0]!; assert.ok(html.length >= 3000); assert.match(html, /Controle &lt;seguro&gt; &amp; "claro"/); assert.doesNotMatch(html, /<img\b|placeholder|<script\b|<svg\b/i); assert.match(html, /class="hero-grid no-media"/); assert.match(html, /data-blueprint-section="splitFeature"/); assert.match(html, /Uma seção completa mesmo quando nenhuma imagem/); assert.ok(first.validation.valid);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("catalog media uses contain/no-crop, all ten markers, and preserves assets", () => {
  const root = temporary(); try { stageCatalogAssets(root); const sentinel = join(root, "assets", "keep.bin"); writeFileSync(sentinel, "keep"); const result = renderRoot(catalogConfig(), root); const html = readFileSync(join(root, "index.html"), "utf8");
    for (const kind of SECTION_KINDS) assert.match(html, new RegExp(`data-blueprint-section="${kind}"`)); assert.match(html, /preset-catalog-driven/); assert.equal(readFileSync(sentinel, "utf8"), "keep"); const selected = result.receipt.decisions.filter((item) => item.selected); assert.ok(selected.length >= 2); assert.ok(selected.every((item) => item.fit === "contain" && item.cropPolicy === "no-crop")); assert.deepEqual(readdirSync(join(root, "assets")).sort(), ["keep.bin", "produto.png"]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("all controlled media fields affect closed markup, intrinsic caps, logo containment, and card-grid traversal", () => {
  const root = temporary(); try {
    stageCatalogAssets(root); writePng(join(root, "assets", "editorial.png"), 360, 240); writePng(join(root, "assets", "editorial-no-crop.png"), 360, 240); writePng(join(root, "assets", "logo.png"), 600, 60);
    const config = catalogConfig(); config.assets!.push(
      { id: "editorial", path: "assets/editorial.png", role: "editorial", alt: "Detalhe editorial", width: 360, height: 240, provenance: { kind: "caller-staged", source: "fixture", license: "teste" } },
      { id: "editorial-no-crop", path: "assets/editorial-no-crop.png", role: "editorial", alt: "Detalhe editorial sem corte", width: 360, height: 240, provenance: { kind: "caller-staged", source: "fixture", license: "teste" } },
      { id: "logo", path: "assets/logo.png", role: "logo", alt: "Marca de teste", width: 600, height: 60, provenance: { kind: "caller-staged", source: "fixture", license: "teste" } },
      { id: "ausente", path: "assets/ausente.png", role: "editorial", alt: "Mídia ausente", width: 360, height: 240, provenance: { kind: "caller-staged", source: "fixture", license: "teste" } },
    ); config.company.logoAssetId = "logo";
    const grid = config.pages[0]!.sections.find((item) => item.kind === "cardGrid"); assert.equal(grid?.kind, "cardGrid"); if (grid?.kind === "cardGrid") grid.media = [
      { assetId: "editorial", treatment: { fit: "cover", cropPolicy: "allow", aspect: "wide", frame: "bordered", composition: "full-bleed", density: "spacious", sizeBucket: "large" } },
      { assetId: "editorial-no-crop", treatment: { fit: "cover", cropPolicy: "no-crop" } },
      { assetId: "ausente" },
    ];
    const result = renderRoot(config, root); const html = readFileSync(join(root, "index.html"), "utf8");
    const decision = result.receipt.decisions.find((item) => item.assetId === "editorial"); assert.deepEqual({ fit: decision?.fit, cropPolicy: decision?.cropPolicy, frame: decision?.frame, composition: decision?.composition, density: decision?.density, sizeBucket: decision?.sizeBucket }, { fit: "cover", cropPolicy: "allow", frame: "bordered", composition: "full-bleed", density: "spacious", sizeBucket: "large" });
    const noCropDecision = result.receipt.decisions.find((item) => item.assetId === "editorial-no-crop"); assert.deepEqual({ fit: noCropDecision?.fit, cropPolicy: noCropDecision?.cropPolicy }, { fit: "contain", cropPolicy: "no-crop" });
    assert.match(html, /frame-bordered composition-full-bleed size-large density-spacious/); assert.match(html, /style="--fit:contain;[^>]*><img src="assets\/editorial-no-crop\.png"/); assert.match(html, /data-card-grid-media/); assert.match(html, /--intrinsic-width:360px;--intrinsic-height:240px/); assert.match(html, /class="brand-logo"[^>]*--logo-width:600px;--logo-height:60px/); assert.ok(result.receipt.decisions.some((item) => item.assetId === "ausente" && !item.selected)); assert.doesNotMatch(html, /src="[^"]*ausente/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("header solutions link follows an existing section id and never dangles", () => {
  const root = temporary(); try { const config = serviceConfig(); const grid = config.pages[0]!.sections.find((item) => item.kind === "cardGrid"); assert.equal(grid?.kind, "cardGrid"); if (grid?.kind === "cardGrid") grid.id = "ofertas"; config.mainNavigation = [{ label: "Soluções", href: "#ofertas" }]; renderRoot(config, root); const html = readFileSync(join(root, "index.html"), "utf8"); assert.match(html, /href="#ofertas">Soluções/); assert.doesNotMatch(html, /href="#solucoes"/); for (const target of html.matchAll(/href="#([a-z][a-z0-9-]*)"/g)) assert.match(html, new RegExp(`id="${target[1]}"`)); } finally { rmSync(root, { recursive: true, force: true }); }
});

test("hybrid composition selects its own client-neutral preset", () => {
  const root = temporary(); try { renderRoot(hybridConfig(), root); const html = readFileSync(join(root, "index.html"), "utf8"); assert.match(html, /class="preset-hybrid"/); assert.match(html, /Soluções Industriais Integradas/); assert.doesNotMatch(html, /class="preset-catalog-driven"/); } finally { rmSync(root, { recursive: true, force: true }); }
});

test("semantic foregrounds choose the higher WCAG contrast candidate", () => {
  const root = temporary(); try { const config = serviceConfig(); config.theme.primary = "#777777"; config.theme.accent = "#777777"; renderRoot(config, root); const html = readFileSync(join(root, "index.html"), "utf8"); assert.match(html, /--primary:#777777;--on-primary:#000000;--accent:#777777;--on-accent:#000000/); assert.doesNotMatch(html, /grid-auto-flow:column|overflow-x:auto/); } finally { rmSync(root, { recursive: true, force: true }); }
});

test("missing media is omitted with a reason and validation is independently recomputed", () => {
  const root = temporary(); try { const config = catalogConfig(); const result = renderRoot(config, root); assert.ok(result.receipt.warnings.some((item) => item.reason === "file-missing")); const html = readFileSync(join(root, "index.html"), "utf8"); assert.doesNotMatch(html, /produto\.png/); const forged = html.replace("<main", "<div"); assert.equal(validateRenderedHtml(forged, []).valid, false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("invalid input leaves directory and existing finals unchanged", () => {
  const root = temporary(); try { writeFileSync(join(root, "index.html"), "original"); const invalid = serviceConfig(); invalid.pages[0]!.route = "/invalid/"; assert.throws(() => renderRoot(invalid, root), RenderPreviewError); assert.equal(readFileSync(join(root, "index.html"), "utf8"), "original"); assert.deepEqual(readdirSync(root), ["index.html"]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("selected nested page follows its exact route despite authored page order and keeps caller assets at root", () => {
  const root = temporary(); try { stageCatalogAssets(root); const config = multipageConfig(); const result = renderPagePreview(config, { route: "/servicos/manutencao", outDir: root }); const html = readFileSync(join(root, "index.html"), "utf8");
    assert.equal(result.receipt.route, "/servicos/manutencao"); assert.match(html, /Manutenção industrial/); assert.match(html, /src="assets\/produto\.png"/); assert.equal(existsSync(join(root, "servicos")), false); assert.equal(existsSync(join(root, "assets", "produto.png")), true);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("unknown route does not create a nonexistent output directory", () => {
  const parent = temporary(); const outDir = join(parent, "missing", "nested", "site"); try {
    assert.throws(() => renderPagePreview(multipageConfig(), { route: "/does-not-exist", outDir }), RenderPreviewError); assert.equal(existsSync(outDir), false); assert.deepEqual(readdirSync(parent), []);
  } finally { rmSync(parent, { recursive: true, force: true }); }
});

test("full-site output writes authored route indexes and site receipts deterministically", () => {
  const root = temporary(); try { stageCatalogAssets(root); writeFileSync(join(root, "sentinel.txt"), "keep"); writeFileSync(join(root, "stale.txt"), "stale"); const config = multipageConfig();
    const first = renderSitePreview(config, { outDir: root }); const names = ["servicos/manutencao/index.html", "index.html", "contato/index.html", "seed-receipt.json", "seed-validation.json"];
    assert.deepEqual(first.files, names); for (const name of names) assert.equal(existsSync(join(root, name)), true); assert.equal(JSON.parse(readFileSync(join(root, "seed-receipt.json"), "utf8")).mode, "site"); assert.equal(JSON.parse(readFileSync(join(root, "seed-validation.json"), "utf8")).valid, true); assert.equal(readFileSync(join(root, "sentinel.txt"), "utf8"), "keep"); assert.equal(readFileSync(join(root, "stale.txt"), "utf8"), "stale");
    const firstBytes = names.map((name) => readFileSync(join(root, name))); const second = renderSitePreview(config, { outDir: root }); assert.deepEqual(second.files, names); assert.deepEqual(names.map((name) => readFileSync(join(root, name))), firstBytes);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("site preflight preserves old finals and creates no route directories after a later parent conflict", () => {
  const root = temporary(); try { writeFileSync(join(root, "index.html"), "old root final"); writeFileSync(join(root, "seed-receipt.json"), "old receipt"); writeFileSync(join(root, "seed-validation.json"), "old validation"); writeFileSync(join(root, "sentinel.txt"), "caller sentinel"); writeFileSync(join(root, "servicos"), "caller file blocks route"); const before = readdirSync(root).sort();
    assert.throws(() => renderSitePreview(multipageConfig(), { outDir: root }), RenderPreviewError); for (const [name, value] of [["index.html", "old root final"], ["seed-receipt.json", "old receipt"], ["seed-validation.json", "old validation"], ["sentinel.txt", "caller sentinel"], ["servicos", "caller file blocks route"]] as const) assert.equal(readFileSync(join(root, name), "utf8"), value); assert.deepEqual(readdirSync(root).sort(), before); assert.equal(existsSync(join(root, "contato")), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("site output creates a fully absent nested directory but rejects symlink output boundaries", () => {
  const parent = temporary(); try { const outDir = join(parent, "absent", "nested", "site"); const result = renderSitePreview(multipageConfig(), { outDir }); assert.equal(result.validation.valid, true); assert.equal(existsSync(join(outDir, "servicos", "manutencao", "index.html")), true);
    const target = join(parent, "real"); const link = join(parent, "link"); mkdirSync(target); symlinkSync(target, link); assert.throws(() => renderPagePreview(serviceConfig(), { route: "/", outDir: link }), RenderPreviewError); assert.deepEqual(readdirSync(target), []);
  } finally { rmSync(parent, { recursive: true, force: true }); }
});
