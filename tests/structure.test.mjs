import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

// This inventory is intentionally independent of blueprint.json. The manifest is descriptive evidence, not the oracle.
const expectedPages = [
  { id: "home", file: "index.html", route: "/", current: { label: "Início", href: "index.html" }, sections: ["hero", "proof-rail", "route-choice", "catalog-families", "technical-fit", "sectors", "process", "evidence", "faq", "cta"] },
  { id: "empresa", file: "empresa/index.html", route: "/empresa/", current: { label: "Empresa", href: "../empresa/index.html" }, sections: ["hero", "profile", "principles", "process", "sectors", "evidence", "faq-cta", "cta"] },
  { id: "catalogo", file: "catalogo/index.html", route: "/catalogo/", current: { label: "Catálogo", href: "../catalogo/index.html" }, sections: ["hero", "filter", "catalog-grid", "selection-help", "process-faq", "cta"] },
  { id: "solucao-exemplo", file: "catalogo/solucao-exemplo/index.html", route: "/catalogo/solucao-exemplo/", current: { label: "Catálogo", href: "../../catalogo/index.html" }, sections: ["hero", "fit-limits", "specifications", "gallery", "process-documents", "related", "faq-cta", "cta"] },
  { id: "capacidade-exemplo", file: "servicos/capacidade-exemplo/index.html", route: "/servicos/capacidade-exemplo/", current: { label: "Capacidade", href: "../../servicos/capacidade-exemplo/index.html" }, sections: ["hero", "scope-exclusions", "process", "technical-inputs", "evidence", "sectors", "faq-cta", "cta"] },
  { id: "contato", file: "contato/index.html", route: "/contato/", current: { label: "Contato", href: "../contato/index.html" }, sections: ["hero", "form-direct-channels", "next-steps", "checklist-faq"] },
];

const runtimeModules = [
  "scripts/main.js", "scripts/mobile-nav.js", "scripts/scroll-lock.js", "scripts/catalog-filter.js", "scripts/gallery.js",
  "scripts/faq.js", "scripts/reveal.js", "scripts/video.js", "scripts/inquiry-form.js",
];
const shellMarkers = ["<!-- SHELL:HEADER START -->", "<!-- SHELL:HEADER END -->", "<!-- SHELL:FOOTER START -->", "<!-- SHELL:FOOTER END -->"];
const requiredDocs = ["docs/ADAPTATION.md", "docs/BOSTOIDE_ADAPTER.md", "docs/TESTING.md", "docs/REFERENCE_ATTRIBUTION.md"];
const fixedComponents = ["site-shell", "hero", "proof-rail", "cards", "split-feature", "sectors", "process", "specifications", "gallery", "faq", "cta", "inquiry-form"];
const activeRoots = ["README.md", "package.json", "tools", "scripts", "docs"];
const forbiddenActiveInstructions = /renderPagePreview|renderSitePreview|render-page|render-site|SiteConfig|npm\s+(?:run\s+)?(?:build|generate)|generateSite/i;

function currentLinks(html) {
  return [...html.matchAll(/<a\s+([^>]*aria-current="page"[^>]*)>([^<]+)<\/a>/g)].map((match) => ({ href: match[1].match(/href="([^"]+)"/)?.[1], label: match[2].trim() }));
}
function localFiles(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = `${root}/${entry.name}`;
    return entry.isDirectory() ? localFiles(path) : [path];
  });
}
function readActiveFiles() {
  return activeRoots.flatMap((root) => existsSync(root) && !root.endsWith(".json") && !root.endsWith(".md") ? localFiles(root) : [root]).filter((path) => existsSync(path));
}

test("fixed route, component, section, shell and current-page inventories agree", () => {
  assert.deepEqual(expectedPages.map(({ file }) => file), ["index.html", "empresa/index.html", "catalogo/index.html", "catalogo/solucao-exemplo/index.html", "servicos/capacidade-exemplo/index.html", "contato/index.html"]);
  const blueprint = JSON.parse(readFileSync("blueprint.json", "utf8"));
  assert.equal(blueprint.drivesGeneration, false);
  assert.deepEqual(blueprint.runtimeModules, runtimeModules);
  assert.deepEqual(blueprint.components, fixedComponents);
  assert.deepEqual(runtimeModules.filter((path) => existsSync(path)), runtimeModules, "runtime module files exist");
  assert.deepEqual(readdirSync("scripts").filter((file) => file.endsWith(".js")).map((file) => `scripts/${file}`).sort(), [...runtimeModules].sort(), "runtime inventory matches scripts");

  for (const expected of expectedPages) {
    assert.equal(existsSync(expected.file), true, expected.file);
    const html = readFileSync(expected.file, "utf8");
    const actualSections = [...html.matchAll(/<section\b[^>]*data-component="([^"]+)"/g)].map((match) => match[1]);
    const manifestPage = blueprint.pages.find((page) => page.path === expected.route);
    assert.deepEqual(actualSections, expected.sections, `${expected.file}: HTML section inventory`);
    assert.deepEqual(manifestPage, { id: expected.id, path: expected.route, sections: expected.sections }, `${expected.file}: manifest description`);
    assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1, `${expected.file}: one H1`);
    assert.match(html, /<!doctype html>/i);
    assert.match(html, /<html lang="pt-BR">/);
    assert.match(html, /<meta name="robots" content="noindex,nofollow">/);
    assert.match(html, /<title>[\s\S]+<\/title>/);
    assert.match(html, /<meta name="description" content="[^"]+">/);
    assert.match(html, /<main id="conteudo">/);
    assert.match(html, /<header\b/);
    assert.match(html, /<footer\b/);
    assert.match(html, /<details class="mobile-nav">[\s\S]*?<summary>\s*Menu\s*<\/summary>/);
    assert.equal((html.match(/aria-label="Navegação principal"/g) ?? []).length, 1);
    assert.equal((html.match(/aria-label="Navegação principal móvel"/g) ?? []).length, 1);
    assert.deepEqual(currentLinks(html), [expected.current, expected.current, expected.current]);
    for (const marker of shellMarkers) assert.equal(html.includes(marker), true, `${expected.file}: ${marker}`);
    assert.match(html, /Conteúdo de demonstração — substituir antes da publicação/);
  }
});

test("owned runtime paths and every HTML resource resolve locally", () => {
  for (const { file } of expectedPages) {
    const html = readFileSync(file, "utf8");
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
    assert.equal(scripts.length, 1, `${file}: exactly one script`);
    const attributes = scripts[0][1];
    assert.match(attributes, /\btype="module"/i);
    assert.equal(scripts[0][2].trim(), "", `${file}: no inline script`);
    const source = attributes.match(/\bsrc="([^"]+)"/i)?.[1];
    assert.ok(source);
    assert.equal(resolve(dirname(file), source), resolve("scripts/main.js"), `${file}: depth-correct entry`);
    assert.doesNotMatch(html, /(?:href|src|poster|action)\s*=\s*["'](?:https?:)?\/\//i, `${file}: remote resource`);
    for (const match of html.matchAll(/(?:href|src|poster|action)="([^"]+)"/g)) {
      const url = match[1];
      if (url.startsWith("#") || url.startsWith("?") || url.startsWith("mailto:") || url.startsWith("tel:")) continue;
      assert.equal(existsSync(resolve(dirname(file), url.split(/[?#]/)[0])), true, `${file}: missing ${url}`);
    }
  }
});

test("semantic token/color authority, media contracts and static package are fixed", () => {
  const tokens = readFileSync("styles/tokens.css", "utf8");
  const base = readFileSync("styles/base.css", "utf8");
  const components = readFileSync("styles/components.css", "utf8");
  const blueprint = JSON.parse(readFileSync("blueprint.json", "utf8"));
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
  const semanticColors = { "--color-ink": "#142126", "--color-paper": "#fcfcf8", "--color-primary": "#0c5967", "--color-focus": "#f2b544" };
  for (const [role, value] of Object.entries(semanticColors)) assert.match(tokens, new RegExp(`${role}\\s*:\\s*${value}`));
  for (const name of ["--radius-0", "--radius-xs", "--radius-sm", "--radius-md", "--radius-lg", "--radius-xl", "--radius-pill", "--color-line-strong", "--color-accent-on-dark", "--shadow-raised", "--shadow-lifted", "--shadow-focus"]) {
    assert.match(tokens, new RegExp(`${name}\\s*:`), `${name} is declared`);
  }
  for (const name of ["--radius-0", "--radius-xs", "--radius-sm", "--radius-md", "--radius-lg", "--radius-pill"]) {
    assert.match(components, new RegExp(`var\\(${name}\\)`), `${name} is used by components`);
  }
  assert.match(components, /var\(--shadow-raised\)/, "raised elevation is used");
  assert.match(components, /var\(--shadow-lifted\)/, "lifted elevation is used");
  assert.match(base, /box-shadow:\s*var\(--shadow-focus\)/, "focus halo is applied");
  const dark = token(tokens, "--color-dark");
  const darkSoft = token(tokens, "--color-dark-soft");
  const accentOnDark = token(tokens, "--color-accent-on-dark");
  const lineStrong = token(tokens, "--color-line-strong");
  assert.ok(contrast(accentOnDark, dark) >= 4.5, "dark-stage accent contrast");
  assert.ok(contrast(accentOnDark, darkSoft) >= 4.5, "dark-soft accent contrast");
  assert.ok(contrast(lineStrong, token(tokens, "--color-paper")) >= 3, "control boundary contrast on paper");
  assert.ok(contrast(lineStrong, dark) >= 3, "control boundary contrast on dark");
  assert.match(components, /\.hero-grid\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,1fr\)/, "no-media hero starts as one column");
  assert.match(components, /\.hero-grid:has\(> \.hero-media--(?:image|product|diagram|video):not\(\.no-media\)\)/, "media columns are opt-in");
  assert.doesNotMatch(base, /#[0-9a-f]{3,8}\b|rgba?\(/i);
  assert.doesNotMatch(components, /#[0-9a-f]{3,8}\b|rgba?\(/i);
  for (const contract of [".media-rich", ".media-light", ".no-media", ".hero-media--image", ".hero-media--video", ".hero-media--product", ".hero-media--diagram", ".hero-media--editorial"]) assert.match(components, new RegExp(`\\${contract}`));
  assert.deepEqual(blueprint.mediaModes, ["media-rich", "media-light", "no-media"]);
  assert.deepEqual(blueprint.mediaContracts.heroVariants, ["image", "local-video", "product-or-diagram", "editorial-no-media"]);
  assert.equal(pkg.private, true);
  assert.equal(pkg.type, "module");
  assert.equal(pkg.engines.node, ">=20");
  assert.equal(pkg.dependencies, undefined);
  assert.deepEqual(Object.keys(pkg.devDependencies), ["playwright"]);
  assert.equal(pkg.exports, undefined);
  assert.equal(pkg.bin, undefined);
  assert.equal(lock.packages[""].name, pkg.name);
  assert.deepEqual(lock.packages[""].devDependencies, pkg.devDependencies);
  assert.equal(lock.packages[""].engines.node, pkg.engines.node);
  assert.equal(pkg.scripts.serve, "node tools/serve.mjs");
  assert.match(pkg.scripts["test:structure"], /--test-concurrency=1/);
  assert.match(pkg.scripts["test:browser"], /--max-old-space-size=768/);
  assert.match(pkg.scripts["test:browser"], /--test-concurrency=1/);
  assert.match(pkg.scripts["test:interactions"], /--max-old-space-size=768/);
  assert.doesNotMatch(Object.keys(pkg.scripts).join(" "), /build|generate|export/i);
  for (const path of ["src", "examples", "tsconfig.json", "tsconfig.build.json", "docs/CONFIGURATION.md"]) assert.equal(existsSync(path), false, path);
});

// Fixed orientation/conversion contracts introduced by the polish checkpoint. Independent of blueprint.json.
const breadcrumbTrails = {
  "empresa/index.html": { home: "../index.html", parents: [], current: "Empresa" },
  "catalogo/index.html": { home: "../index.html", parents: [], current: "Catálogo" },
  "catalogo/solucao-exemplo/index.html": { home: "../../index.html", parents: [{ href: "../index.html", label: "Catálogo" }], current: "[[PRODUTO.NOME]]" },
  "servicos/capacidade-exemplo/index.html": { home: "../../index.html", parents: [], current: "[[SERVICO.NOME]]" },
  "contato/index.html": { home: "../index.html", parents: [], current: "Contato técnico" },
};

function channel(value) {
  const ratio = value / 255;
  return ratio <= 0.04045 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
}
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((index) => channel(Number.parseInt(hex.slice(index, index + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(foreground, background) {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}
function token(css, name) {
  const value = css.match(new RegExp(`${name}\\s*:\\s*(#[0-9a-f]{6})`, "i"))?.[1];
  assert.ok(value, `${name} is a six-digit hex token`);
  return value;
}

test("inner routes expose one semantic breadcrumb with exact relative structure", () => {
  for (const [file, trail] of Object.entries(breadcrumbTrails)) {
    const html = readFileSync(file, "utf8");
    const navs = [...html.matchAll(/<nav class="breadcrumb data" aria-label="Navegação estrutural">([\s\S]*?)<\/nav>/g)];
    assert.equal(navs.length, 1, `${file}: exactly one breadcrumb nav`);
    const inner = navs[0][1];
    assert.match(inner, /<span class="visually-hidden">\s*Você está em:\s*<\/span>/, `${file}: screen-reader context`);
    assert.equal((inner.match(/<ol>/g) ?? []).length, 1, `${file}: ordered list`);
    const links = [...inner.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)].map((match) => ({ href: match[1], label: match[2].trim() }));
    assert.deepEqual(links, [{ href: trail.home, label: "Início" }, ...trail.parents.map(({ href, label }) => ({ href, label }))], `${file}: breadcrumb links`);
    for (const { href } of links) assert.equal(existsSync(resolve(dirname(file), href)), true, `${file}: ${href} resolves`);
    const currents = [...inner.matchAll(/<span aria-current="page">([^<]+)<\/span>/g)].map((match) => match[1].trim());
    assert.deepEqual(currents, [trail.current], `${file}: single current item`);
    assert.doesNotMatch(inner, /<a[^>]*aria-current="page"/, `${file}: breadcrumb adds no current-page anchor`);
    assert.doesNotMatch(html, /<p class="data">\s*Início \//, `${file}: no breadcrumb-like paragraph remains`);
  }
});

test("capability and product heroes carry their fixed conversion and orientation contracts", () => {
  const capability = readFileSync("servicos/capacidade-exemplo/index.html", "utf8");
  assert.match(capability, /<a class="button" href="\.\.\/\.\.\/contato\/\?tipo=servico&amp;ref=\[\[SERVICO\.SLUG\]\]">\s*Solicitar avaliação desta capacidade\s*<\/a>/);
  assert.match(capability, /<a class="button secondary" href="#processo-capacidade">\s*Ver como funciona\s*<\/a>/);
  assert.equal((capability.match(/id="processo-capacidade"/g) ?? []).length, 1);
  assert.match(capability, /<section class="section surface" id="processo-capacidade" data-component="process">/);

  const product = readFileSync("catalogo/solucao-exemplo/index.html", "utf8");
  const facts = product.match(/<dl class="hero-facts">[\s\S]*?<\/dl>/);
  assert.ok(facts, "product hero facts strip exists");
  assert.deepEqual([...facts[0].matchAll(/<dt>\s*([^<]+?)\s*<\/dt>/g)].map((match) => match[1]), ["Material", "Dimensões", "Tolerâncias", "Tratamentos", "Documentação"]);
  assert.deepEqual([...facts[0].matchAll(/<dd>\s*([^<]+?)\s*<\/dd>/g)].map((match) => match[1]), Array.from({ length: 5 }, () => "[[A CONFIRMAR]]"));
  assert.match(product, /<a class="button" href="\.\.\/\.\.\/contato\/\?tipo=produto&amp;ref=\[\[PRODUTO\.SLUG\]\]">\s*Solicitar avaliação desta solução\s*<\/a>/);
  assert.match(product, /<a class="button secondary" href="\.\.\/">\s*Voltar ao catálogo\s*<\/a>/);
  const heroActions = product.match(/<div class="actions">[\s\S]*?<\/div>/)[0];
  assert.equal((heroActions.match(/class="button"/g) ?? []).length, 1, "one solid hero action");
});

test("contact declares the no-JavaScript boundary before the inert control", () => {
  const html = readFileSync("contato/index.html", "utf8");
  assert.match(html, /<noscript class="notice">\s*<p>\s*A validação assistida requer JavaScript\. Use um canal direto verificado\.\s*<\/p>\s*<\/noscript>\s*<button class="button" type="button" data-form-submit>/);
  assert.equal((html.match(/<noscript/g) ?? []).length, 1);
  assert.doesNotMatch(html, /<noscript[\s\S]*?<a\b[\s\S]*?<\/noscript>/, "no link or fake channel inside the notice");
});

test("dark stages keep a scoped, readable secondary action", () => {
  const components = readFileSync("styles/components.css", "utf8");
  const tokens = readFileSync("styles/tokens.css", "utf8");
  for (const selector of [".hero.dark .button.secondary", ".hero.dark .button.secondary:hover", ".hero.dark .button.secondary:active"]) {
    assert.ok(components.includes(selector), `${selector} is scoped`);
  }
  assert.match(components, /\.button\.secondary \{\s*background: transparent;\s*color: var\(--color-primary\);/, "global light secondary is preserved");
  const dark = token(tokens, "--color-dark");
  assert.ok(contrast(token(tokens, "--color-paper"), dark) >= 4.5, "dark secondary label contrast");
  assert.ok(contrast(token(tokens, "--color-paper"), dark) >= 3, "dark secondary boundary contrast");
  assert.ok(contrast(token(tokens, "--color-surface-strong"), dark) >= 4.5, "dark secondary active label contrast");
});

test("active docs do not revive generation and final guides/resources exist", () => {
  for (const path of requiredDocs) assert.equal(existsSync(path), true, path);
  for (const path of readActiveFiles()) assert.doesNotMatch(readFileSync(path, "utf8"), forbiddenActiveInstructions, `${path}: inactive generator/config instruction`);
  assert.match(readFileSync("README.md", "utf8"), /repository is the persistent blueprint/i);
  assert.match(readFileSync("README.md", "utf8"), /90%/);
  assert.match(readFileSync("docs/ADAPTATION.md", "utf8"), /six-file shell checklist/i);
  assert.match(readFileSync("docs/BOSTOIDE_ADAPTER.md", "utf8"), /complete local dependency closure/i);
  assert.match(readFileSync("docs/TESTING.md", "utf8"), /NO_STATEFUL_RESOURCES/);
});
