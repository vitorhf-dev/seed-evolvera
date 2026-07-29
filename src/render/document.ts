import type { Asset, Page, SiteConfig } from "../domain/site-config.js";
import { escapeAttribute, escapeText } from "./html.js";
import { resolveMedia, type MediaDecision } from "./media.js";
import { getPreset } from "./presets.js";
import { renderSection } from "./registry.js";
import type { RenderContext } from "./sections/shared.js";
import { renderStyles } from "./styles.js";

export interface RenderedDocument { html: string; decisions: MediaDecision[]; mediaHrefs: string[]; }
export interface RenderDocumentOptions { assetRoot: string; assetHref: (path: string) => string; actionHref: (href: string) => string; }
export const renderDocument = (config: SiteConfig, page: Page, options: RenderDocumentOptions): RenderedDocument => {
  const assets = new Map(config.assets.map((asset) => [asset.id, asset] as const)); const decisions: MediaDecision[] = []; const preset = getPreset(config.preset);
  const context: RenderContext = { config, assets, assetRoot: options.assetRoot, assetHref: options.assetHref, actionHref: options.actionHref, preset, decisions };
  let logo = "";
  if (config.company.logoAssetId) { const decision = resolveMedia({ assetId: config.company.logoAssetId }, assets, options.assetRoot); decisions.push(decision); if (decision.selected) { const asset = assets.get(config.company.logoAssetId) as Asset; logo = `<span class="brand-logo" style="--logo-width:${asset.width}px;--logo-height:${asset.height}px"><img src="${escapeAttribute(options.assetHref(asset.path))}" alt="${escapeAttribute(asset.alt)}" width="${asset.width}" height="${asset.height}"></span>`; } }
  const sections = page.sections.map((section) => renderSection(section, context)).join("");
  const contact = config.company.contactLinks.map((item) => `<a href="${escapeAttribute(options.actionHref(item.href))}">${escapeText(item.label)}</a>`).join("");
  const footer = config.company.footerLinks.map((item) => `<a href="${escapeAttribute(options.actionHref(item.href))}">${escapeText(item.label)}</a>`).join("");
  const navigation = config.mainNavigation.map((item) => `<a href="${escapeAttribute(options.actionHref(item.href))}">${escapeText(item.label)}</a>`).join("");
  const seo = page.seo ?? config.seo;
  const canonical = seo.canonicalUrl ? `<link rel="canonical" href="${escapeAttribute(seo.canonicalUrl)}">` : "";
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeText(seo.title)}</title><meta name="description" content="${escapeAttribute(seo.description)}">${canonical}${renderStyles(config.theme)}</head><body class="preset-${config.preset}"><a class="skip" href="#conteudo">Ir para o conteúdo</a><header class="site-header"><div class="container nav"><a class="brand" href="${escapeAttribute(options.actionHref("/"))}" aria-label="${escapeAttribute(config.company.name)} — início">${logo || escapeText(config.company.name)}</a><nav class="nav-links" aria-label="Navegação principal">${navigation}</nav><a class="button" href="${escapeAttribute(options.actionHref(config.company.primaryCta.href))}">${escapeText(config.company.primaryCta.label)}</a></div></header><main id="conteudo">${sections}</main><footer class="site-footer" id="contato"><div class="container footer-grid"><div><strong>${escapeText(config.company.name)}</strong><p>${escapeText(config.company.tagline)}</p><p>${escapeText(config.company.summary)}</p></div><nav aria-label="Contato">${contact}</nav><nav aria-label="Links institucionais">${footer}</nav></div></footer></body></html>`;
  return { html, decisions, mediaHrefs: decisions.filter((item) => item.selected && item.path).map((item) => options.assetHref(item.path!)) };
};
