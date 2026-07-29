import type { Asset, SiteConfig } from "../domain/site-config.js";
import { escapeAttribute, escapeText } from "./html.js";
import { resolveMedia, type MediaDecision } from "./media.js";
import { getPreset } from "./presets.js";
import { renderSection } from "./registry.js";
import type { RenderContext } from "./sections/shared.js";
import { renderStyles } from "./styles.js";

export interface RenderedDocument { html: string; decisions: MediaDecision[]; }
export const renderDocument = (config: SiteConfig, outDir: string): RenderedDocument => {
  const page = config.pages[0]!; const assets = new Map(config.assets.map((asset) => [asset.id, asset] as const)); const decisions: MediaDecision[] = []; const preset = getPreset(config.preset);
  const context: RenderContext = { config, assets, outDir, preset, decisions };
  let logo = "";
  if (config.company.logoAssetId) { const decision = resolveMedia({ assetId: config.company.logoAssetId }, assets, outDir); decisions.push(decision); if (decision.selected) { const asset = assets.get(config.company.logoAssetId) as Asset; logo = `<span class="brand-logo" style="--logo-width:${asset.width}px;--logo-height:${asset.height}px"><img src="${escapeAttribute(asset.path)}" alt="${escapeAttribute(asset.alt)}" width="${asset.width}" height="${asset.height}"></span>`; } }
  const sections = page.sections.map((section) => renderSection(section, context)).join("");
  const solutionsSection = page.sections.find((section) => section.kind === "cardGrid") ?? page.sections.find((section) => section.kind === "splitFeature" || section.kind === "processTimeline");
  const solutionsLink = solutionsSection ? `<a href="#${escapeAttribute(solutionsSection.id)}">Soluções</a>` : "";
  const contact = config.company.contactLinks.map((item) => `<a href="${escapeAttribute(item.href)}">${escapeText(item.label)}</a>`).join("");
  const footer = config.company.footerLinks.map((item) => `<a href="${escapeAttribute(item.href)}">${escapeText(item.label)}</a>`).join("");
  const canonical = config.seo.canonicalUrl ? `<link rel="canonical" href="${escapeAttribute(config.seo.canonicalUrl)}">` : "";
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeText(config.seo.title)}</title><meta name="description" content="${escapeAttribute(config.seo.description)}">${canonical}${renderStyles(config.theme)}</head><body class="preset-${config.preset}"><a class="skip" href="#conteudo">Ir para o conteúdo</a><header class="site-header"><div class="container nav"><a class="brand" href="/" aria-label="${escapeAttribute(config.company.name)} — início">${logo || escapeText(config.company.name)}</a><nav class="nav-links" aria-label="Navegação principal">${solutionsLink}<a href="#contato">Contato</a></nav><a class="button" href="${escapeAttribute(config.company.primaryCta.href)}">${escapeText(config.company.primaryCta.label)}</a></div></header><main id="conteudo">${sections}</main><footer class="site-footer" id="contato"><div class="container footer-grid"><div><strong>${escapeText(config.company.name)}</strong><p>${escapeText(config.company.tagline)}</p><p>${escapeText(config.company.summary)}</p></div><nav aria-label="Contato">${contact}</nav><nav aria-label="Links institucionais">${footer}</nav></div></footer></body></html>`;
  return { html, decisions };
};
