import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PRESETS, SECTION_KINDS, SECTION_KINDS_REGISTERED, RenderSiteError, renderSite, validateRenderedHtml } from "../src/index.js";
import { catalogConfig, hybridConfig, serviceConfig, stageCatalogAssets, writePng } from "./fixtures.js";

const temporary = (): string => mkdtempSync(join(tmpdir(), "seed-renderer-unit-"));

test("registry closes every section kind and presets remain distinct", () => {
  assert.deepEqual([...SECTION_KINDS_REGISTERED].sort(), [...SECTION_KINDS].sort()); assert.equal(new Set(SECTION_KINDS_REGISTERED).size, SECTION_KINDS.length); assert.deepEqual(PRESETS, ["service-driven", "catalog-driven", "hybrid"]);
});

test("no-media service Home is complete, escaped, deterministic, and preserves caller files", () => {
  const root = temporary(); try { writeFileSync(join(root, "sentinel.txt"), "caller-owned\n"); const config = serviceConfig(); const hero = config.pages[0]!.sections[0]!; assert.equal(hero.kind, "hero"); if (hero.kind === "hero") hero.title = `Controle <seguro> & "claro"`;
    const first = renderSite(config, { outDir: root }); const bytes = first.files.map((name) => readFileSync(join(root, name), "utf8")); const second = renderSite(config, { outDir: root });
    assert.deepEqual(second.files.map((name) => readFileSync(join(root, name), "utf8")), bytes); assert.equal(readFileSync(join(root, "sentinel.txt"), "utf8"), "caller-owned\n");
    const html = bytes[0]!; assert.ok(html.length >= 3000); assert.match(html, /Controle &lt;seguro&gt; &amp; "claro"/); assert.doesNotMatch(html, /<img\b|placeholder|<script\b|<svg\b/i); assert.match(html, /class="hero-grid no-media"/); assert.match(html, /data-home-section="splitFeature"/); assert.match(html, /Uma seção completa mesmo quando nenhuma imagem/); assert.ok(first.validation.valid);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("catalog media uses contain/no-crop, all ten markers, and preserves assets", () => {
  const root = temporary(); try { stageCatalogAssets(root); const sentinel = join(root, "assets", "keep.bin"); writeFileSync(sentinel, "keep"); const result = renderSite(catalogConfig(), { outDir: root }); const html = readFileSync(join(root, "index.html"), "utf8");
    for (const kind of SECTION_KINDS) assert.match(html, new RegExp(`data-home-section="${kind}"`)); assert.match(html, /preset-catalog-driven/); assert.equal(readFileSync(sentinel, "utf8"), "keep"); const selected = result.receipt.decisions.filter((item) => item.selected); assert.ok(selected.length >= 2); assert.ok(selected.every((item) => item.fit === "contain" && item.cropPolicy === "no-crop")); assert.deepEqual(readdirSync(join(root, "assets")).sort(), ["keep.bin", "produto.png"]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("all controlled media fields affect closed markup, intrinsic caps, logo containment, and card-grid traversal", () => {
  const root = temporary(); try {
    stageCatalogAssets(root); writePng(join(root, "assets", "editorial.png"), 360, 240); writePng(join(root, "assets", "logo.png"), 600, 60);
    const config = catalogConfig(); config.assets!.push(
      { id: "editorial", path: "assets/editorial.png", role: "editorial", alt: "Detalhe editorial", width: 360, height: 240, provenance: { kind: "caller-staged", source: "fixture", license: "teste" } },
      { id: "logo", path: "assets/logo.png", role: "logo", alt: "Marca de teste", width: 600, height: 60, provenance: { kind: "caller-staged", source: "fixture", license: "teste" } },
      { id: "ausente", path: "assets/ausente.png", role: "editorial", alt: "Mídia ausente", width: 360, height: 240, provenance: { kind: "caller-staged", source: "fixture", license: "teste" } },
    ); config.company.logoAssetId = "logo";
    const grid = config.pages[0]!.sections.find((item) => item.kind === "cardGrid"); assert.equal(grid?.kind, "cardGrid"); if (grid?.kind === "cardGrid") grid.media = [
      { assetId: "editorial", treatment: { fit: "cover", cropPolicy: "allow", aspect: "wide", frame: "bordered", composition: "full-bleed", density: "spacious", sizeBucket: "large" } },
      { assetId: "ausente" },
    ];
    const result = renderSite(config, { outDir: root }); const html = readFileSync(join(root, "index.html"), "utf8");
    const decision = result.receipt.decisions.find((item) => item.assetId === "editorial"); assert.deepEqual({ frame: decision?.frame, composition: decision?.composition, density: decision?.density, sizeBucket: decision?.sizeBucket }, { frame: "bordered", composition: "full-bleed", density: "spacious", sizeBucket: "large" });
    assert.match(html, /frame-bordered composition-full-bleed size-large density-spacious/); assert.match(html, /data-card-grid-media/); assert.match(html, /--intrinsic-width:360px;--intrinsic-height:240px/); assert.match(html, /class="brand-logo"[^>]*--logo-width:600px;--logo-height:60px/); assert.ok(result.receipt.decisions.some((item) => item.assetId === "ausente" && !item.selected)); assert.doesNotMatch(html, /src="[^"]*ausente/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("header solutions link follows an existing section id and never dangles", () => {
  const root = temporary(); try { const config = serviceConfig(); const grid = config.pages[0]!.sections.find((item) => item.kind === "cardGrid"); assert.equal(grid?.kind, "cardGrid"); if (grid?.kind === "cardGrid") grid.id = "ofertas"; renderSite(config, { outDir: root }); const html = readFileSync(join(root, "index.html"), "utf8"); assert.match(html, /href="#ofertas">Soluções/); assert.doesNotMatch(html, /href="#solucoes"/); for (const target of html.matchAll(/href="#([a-z][a-z0-9-]*)"/g)) assert.match(html, new RegExp(`id="${target[1]}"`)); } finally { rmSync(root, { recursive: true, force: true }); }
});

test("hybrid composition selects its own client-neutral preset", () => {
  const root = temporary(); try { renderSite(hybridConfig(), { outDir: root }); const html = readFileSync(join(root, "index.html"), "utf8"); assert.match(html, /class="preset-hybrid"/); assert.match(html, /Soluções Industriais Integradas/); assert.doesNotMatch(html, /class="preset-catalog-driven"/); } finally { rmSync(root, { recursive: true, force: true }); }
});

test("semantic foregrounds choose the higher WCAG contrast candidate", () => {
  const root = temporary(); try { const config = serviceConfig(); config.theme.primary = "#777777"; config.theme.accent = "#777777"; renderSite(config, { outDir: root }); const html = readFileSync(join(root, "index.html"), "utf8"); assert.match(html, /--primary:#777777;--on-primary:#000000;--accent:#777777;--on-accent:#000000/); assert.doesNotMatch(html, /grid-auto-flow:column|overflow-x:auto/); } finally { rmSync(root, { recursive: true, force: true }); }
});

test("missing media is omitted with a reason and validation is independently recomputed", () => {
  const root = temporary(); try { const config = catalogConfig(); const result = renderSite(config, { outDir: root }); assert.ok(result.receipt.warnings.some((item) => item.reason === "file-missing")); const html = readFileSync(join(root, "index.html"), "utf8"); assert.doesNotMatch(html, /produto\.png/); const forged = html.replace("<main", "<div"); assert.equal(validateRenderedHtml(forged, []).valid, false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("invalid input leaves directory and existing finals unchanged", () => {
  const root = temporary(); try { writeFileSync(join(root, "index.html"), "original"); const invalid = serviceConfig(); invalid.pages[0]!.route = "/invalid/"; assert.throws(() => renderSite(invalid, { outDir: root }), RenderSiteError); assert.equal(readFileSync(join(root, "index.html"), "utf8"), "original"); assert.deepEqual(readdirSync(root), ["index.html"]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
