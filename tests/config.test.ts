import assert from "node:assert/strict";
import test from "node:test";
import { PAGE_TYPES, parseSiteConfig, type SiteConfigInput } from "../src/index.js";

const minimal = (): SiteConfigInput => ({
  schemaVersion: "1",
  preset: "service-driven",
  company: {
    name: "Evolvera Industrial",
    tagline: "Soluções industriais",
    summary: "Atendimento técnico para operações industriais.",
    primaryCta: { label: "Fale conosco", href: "#contato" },
  },
  seo: { title: "Evolvera Industrial", description: "Soluções e atendimento técnico para a indústria." },
  theme: { primary: "#123456", accent: "#ABCDEF" },
  mainNavigation: [{ label: "Início", href: "/" }, { label: "Contato", href: "#contato" }],
  pages: [{
    id: "home",
    route: "/",
    pageType: "home",
    title: "Início",
    sections: [{ kind: "hero", id: "hero", title: "Soluções industriais", body: "Projetos sob medida.", actions: [{ label: "Contato", href: "tel:+5511999999999" }] }],
  }],
});

const invalidIssues = (input: unknown) => {
  const result = parseSiteConfig(input);
  assert.equal(result.success, false);
  return result.success ? [] : result.issues;
};
const hasPath = (issues: ReturnType<typeof invalidIssues>, path: readonly (string | number)[], code?: string) =>
  issues.some((issue) => JSON.stringify(issue.path) === JSON.stringify(path) && (!code || issue.code === code));

test("closed page type vocabulary and required root navigation remain explicit", () => {
  assert.deepEqual(PAGE_TYPES, ["home", "institutional", "service", "catalog", "product", "contact"]);
  const withoutNavigation = minimal(); delete (withoutNavigation as Record<string, unknown>).mainNavigation; assert.equal(hasPath(invalidIssues(withoutNavigation), ["mainNavigation"]), true);
  const withoutRoot = minimal(); withoutRoot.pages[0]!.route = "/empresa"; assert.equal(hasPath(invalidIssues(withoutRoot), ["pages"]), true);
});

test("normalizes documented defaults deterministically", () => {
  const first = parseSiteConfig(minimal());
  const second = parseSiteConfig(minimal());
  assert.equal(first.success, true);
  assert.deepEqual(first, second);
  if (!first.success) return;
  assert.deepEqual(first.data.assets, []);
  assert.deepEqual(first.data.company.contactLinks, []);
  assert.deepEqual(first.data.company.footerLinks, []);
  assert.equal(first.data.theme.shape, "soft");
  assert.equal(first.data.theme.density, "comfortable");
});

test("accepts an asset-aware config while preserving authored order", () => {
  const input = minimal();
  input.assets = [{ id: "hero-image", path: "assets/hero.webp", role: "hero", alt: "Equipe industrial", width: 1600, height: 900, provenance: { kind: "owned", source: "Acervo da empresa", license: "Uso autorizado" } }];
  input.pages[0]!.sections.push({ kind: "gallery", id: "galeria", heading: "Estrutura", items: [{ assetId: "hero-image", treatment: { fit: "cover", composition: "full-bleed" } }] });
  const result = parseSiteConfig(input);
  assert.equal(result.success, true);
  if (result.success) assert.deepEqual(result.data.pages[0]!.sections.map(({ id }) => id), ["hero", "galeria"]);
});

test("rejects recursive unknown and raw presentation fields", () => {
  const top = { ...minimal(), rawHtml: "<b>unsafe</b>" };
  assert.equal(hasPath(invalidIssues(top), []), true);
  const nested = minimal() as SiteConfigInput & { company: SiteConfigInput["company"] & { className: string } };
  nested.company.className = "hero";
  assert.equal(hasPath(invalidIssues(nested), ["company"]), true);
  const section = minimal() as unknown as { pages: Array<{ sections: Array<Record<string, unknown>> }> };
  section.pages[0]!.sections[0]!.style = "color:red";
  assert.equal(hasPath(invalidIssues(section), ["pages", 0, "sections", 0]), true);
});

test("returns stable field paths for duplicate identities and root heroes", () => {
  const input = minimal();
  input.pages[0]!.sections.push({ kind: "hero", id: "hero", title: "Outro", body: "Outro texto", actions: [{ label: "Ir", href: "/contato" }] });
  const issues = invalidIssues(input);
  assert.equal(hasPath(issues, ["pages", 0, "sections", 1, "id"], "custom"), true);
  assert.equal(hasPath(issues, ["pages", 0, "sections", 1, "kind"], "custom"), true);

  const duplicatePage = minimal();
  duplicatePage.pages.push({ ...duplicatePage.pages[0]!, sections: [{ kind: "faq", id: "faq", heading: "Dúvidas", items: [{ question: "Como?", answer: "Por contato." }] }] });
  const pageIssues = invalidIssues(duplicatePage);
  assert.equal(hasPath(pageIssues, ["pages", 1, "id"], "custom"), true);
  assert.equal(hasPath(pageIssues, ["pages", 1, "route"], "custom"), true);
});

test("requires claim provenance and rejects unsupported section kinds", () => {
  const claim = minimal() as unknown as { pages: Array<{ sections: unknown[] }> };
  claim.pages[0]!.sections = [{ kind: "metricsBand", id: "metricas", claims: [{ value: "20", label: "anos" }] }];
  assert.equal(hasPath(invalidIssues(claim), ["pages", 0, "sections", 0, "claims", 0, "provenance"]), true);
  const unknown = minimal() as unknown as { pages: Array<{ sections: unknown[] }> };
  unknown.pages[0]!.sections = [{ kind: "testimonial", id: "depoimento" }];
  assert.equal(hasPath(invalidIssues(unknown), ["pages", 0, "sections", 0, "kind"]), true);
});

test("accepts normalized root-relative actions and no-media split features", () => {
  for (const href of ["/", "#contato"]) {
    const input = minimal();
    input.company.primaryCta.href = href;
    assert.equal(parseSiteConfig(input).success, true, href);
  }

  const input = minimal();
  input.pages[0]!.sections.push({
    kind: "splitFeature",
    id: "autoridade",
    heading: "Atuação técnica",
    body: "Uma composição editorial não depende de fotografia.",
    points: ["Diagnóstico", "Execução"],
  });
  assert.equal(parseSiteConfig(input).success, true);
});

test("rejects unsafe URLs, paths, and invalid media treatments at their fields", () => {
  for (const href of ["javascript:alert(1)", "//example.com", "/?x=1", "/#x", "/a/../b", "/contato/", "#", "/x%20y"]) {
    const unsafe = minimal();
    unsafe.company.primaryCta.href = href;
    assert.equal(hasPath(invalidIssues(unsafe), ["company", "primaryCta", "href"], "custom"), true, href);
  }

  const media = minimal();
  media.assets = [{ id: "logo-main", path: "assets/../logo.svg", role: "logo", alt: "Logo", width: 400, height: 200, provenance: { kind: "official", source: "Manual de marca", license: "Uso oficial" } }];
  assert.equal(hasPath(invalidIssues(media), ["assets", 0, "path"], "custom"), true);
  media.assets[0]!.path = "assets/logo.svg";
  const hero = media.pages[0]!.sections[0]!;
  assert.equal(hero.kind, "hero");
  if (hero.kind === "hero") hero.media = { assetId: "logo-main", treatment: { composition: "full-bleed" } };
  assert.equal(hasPath(invalidIssues(media), ["pages", 0, "sections", 0, "media", "treatment", "composition"], "custom"), true);

  const product = minimal();
  product.assets = [{ id: "product-main", path: "assets/product.png", role: "product", alt: "Produto industrial", width: 800, height: 800, provenance: { kind: "caller-staged", source: "Acervo informado", license: "Uso autorizado" } }];
  const productHero = product.pages[0]!.sections[0]!;
  assert.equal(productHero.kind, "hero");
  if (productHero.kind === "hero") productHero.media = { assetId: "product-main", treatment: { fit: "cover" } };
  assert.equal(hasPath(invalidIssues(product), ["pages", 0, "sections", 0, "media", "treatment", "fit"], "custom"), true);
});

test("accepts ordered multipage blueprints and validates contextual links", () => {
  const input = minimal();
  input.mainNavigation = [{ label: "Empresa", href: "/empresa" }, { label: "Contato", href: "#contato" }];
  input.pages.push({ id: "empresa", route: "/empresa", pageType: "institutional", title: "Empresa", seo: { title: "Empresa", description: "Conheça a empresa." }, sections: [{ kind: "cta", id: "empresa-cta", title: "Empresa", body: "Conheça nossa história.", actions: [{ label: "Início", href: "/" }] }] });
  assert.equal(parseSiteConfig(input).success, true);
  const invalid = minimal(); invalid.mainNavigation = [{ label: "Inexistente", href: "/inexistente" }];
  assert.equal(hasPath(invalidIssues(invalid), ["mainNavigation", 0, "href"], "custom"), true);
});
