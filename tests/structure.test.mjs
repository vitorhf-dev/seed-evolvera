import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const expectedPages = [
  {
    file: "index.html",
    route: "/",
    current: { label: "Início", href: "index.html" },
    sections: ["hero", "proof-rail", "route-choice", "catalog-families", "technical-fit", "sectors", "process", "evidence", "faq", "cta"],
  },
  {
    file: "empresa/index.html",
    route: "/empresa/",
    current: { label: "Empresa", href: "../empresa/index.html" },
    sections: ["hero", "profile", "principles", "process", "sectors", "evidence", "faq-cta", "cta"],
  },
  {
    file: "catalogo/index.html",
    route: "/catalogo/",
    current: { label: "Catálogo", href: "../catalogo/index.html" },
    sections: ["hero", "filter", "catalog-grid", "selection-help", "process-faq", "cta"],
  },
  {
    file: "catalogo/solucao-exemplo/index.html",
    route: "/catalogo/solucao-exemplo/",
    current: { label: "Catálogo", href: "../../catalogo/index.html" },
    sections: ["hero", "fit-limits", "specifications", "gallery", "process-documents", "related", "faq-cta", "cta"],
  },
  {
    file: "servicos/capacidade-exemplo/index.html",
    route: "/servicos/capacidade-exemplo/",
    current: { label: "Capacidade", href: "../../servicos/capacidade-exemplo/index.html" },
    sections: ["hero", "scope-exclusions", "process", "technical-inputs", "evidence", "sectors", "faq-cta", "cta"],
  },
  {
    file: "contato/index.html",
    route: "/contato/",
    current: { label: "Contato", href: "../contato/index.html" },
    sections: ["hero", "form-direct-channels", "next-steps", "checklist-faq"],
  },
];

const shellMarkers = [
  "<!-- SHELL:HEADER START -->",
  "<!-- SHELL:HEADER END -->",
  "<!-- SHELL:FOOTER START -->",
  "<!-- SHELL:FOOTER END -->",
];

function currentLinks(html) {
  return [...html.matchAll(/<a\s+([^>]*aria-current="page"[^>]*)>([^<]+)<\/a>/g)].map((match) => ({
    href: match[1].match(/href="([^"]+)"/)?.[1],
    label: match[2].trim(),
  }));
}

test("fixed route, section, shell and current-page inventories agree", () => {
  const blueprint = JSON.parse(readFileSync("blueprint.json", "utf8"));
  assert.equal(blueprint.drivesGeneration, false);
  assert.deepEqual(blueprint.runtimeModules, []);

  for (const expected of expectedPages) {
    assert.equal(existsSync(expected.file), true, expected.file);
    const html = readFileSync(expected.file, "utf8");
    const actualSections = [...html.matchAll(/<section\b[^>]*data-component="([^"]+)"/g)].map((match) => match[1]);
    const manifestPage = blueprint.pages.find((page) => page.path === expected.route);

    assert.deepEqual(actualSections, expected.sections, `${expected.file}: HTML inventory`);
    assert.deepEqual(manifestPage?.sections, expected.sections, `${expected.file}: manifest inventory`);
    assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1, expected.file);
    assert.match(html, /<html lang="pt-BR">/);
    assert.match(html, /<meta name="robots" content="noindex,nofollow">/);
    assert.match(html, /<main id="conteudo">/);
    assert.match(html, /<header\b/);
    assert.match(html, /<footer\b/);
    assert.match(html, /<details class="mobile-nav">[\s\S]*?<summary>\s*Menu\s*<\/summary>/);
    assert.equal((html.match(/aria-label="Navegação principal"/g) ?? []).length, 1);
    assert.equal((html.match(/aria-label="Navegação principal móvel"/g) ?? []).length, 1);
    assert.deepEqual(currentLinks(html), [expected.current, expected.current, expected.current]);

    for (const marker of shellMarkers) {
      assert.equal(html.includes(marker), true, `${expected.file}: ${marker}`);
    }
    assert.match(html, /Conteúdo de demonstração — substituir antes da publicação/);
  }
});

test("foundation contains no active scripts or remote resource schemes", () => {
  for (const { file } of expectedPages) {
    const html = readFileSync(file, "utf8");
    assert.doesNotMatch(html, /<script\b/i, `${file}: active script`);
    assert.doesNotMatch(html, /(?:href|src|poster|action)\s*=\s*["'](?:https?:)?\/\//i, `${file}: remote resource`);

    for (const match of html.matchAll(/(?:href|src|poster)="([^"]+)"/g)) {
      const url = match[1];
      if (url.startsWith("#") || url.startsWith("?")) continue;
      const localPath = url.split(/[?#]/)[0];
      assert.equal(existsSync(resolve(dirname(file), localPath)), true, `${file}: missing ${url}`);
    }
  }
});

test("tokens, media contracts and package remain descriptive and static", () => {
  const tokens = readFileSync("styles/tokens.css", "utf8");
  const components = readFileSync("styles/components.css", "utf8");
  const blueprint = JSON.parse(readFileSync("blueprint.json", "utf8"));
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));

  for (const role of ["--color-ink", "--color-paper", "--color-primary", "--color-focus"]) {
    assert.equal(tokens.includes(role), true, role);
  }
  for (const contract of [".media-rich", ".media-light", ".no-media", ".hero-media--image", ".hero-media--video", ".hero-media--product", ".hero-media--diagram", ".hero-media--editorial"]) {
    assert.equal(components.includes(contract), true, contract);
  }
  assert.deepEqual(blueprint.mediaModes, ["media-rich", "media-light", "no-media"]);
  assert.deepEqual(blueprint.mediaContracts.heroVariants, ["image", "local-video", "product-or-diagram", "editorial-no-media"]);
  assert.equal(pkg.private, true);
  assert.equal(pkg.dependencies, undefined);
  assert.deepEqual(Object.keys(pkg.devDependencies), ["playwright"]);
  assert.equal(pkg.exports, undefined);
  assert.equal(pkg.bin, undefined);

  for (const path of ["src", "examples", "tsconfig.json", "tsconfig.build.json", "docs/CONFIGURATION.md"]) {
    assert.equal(existsSync(path), false, path);
  }
});
