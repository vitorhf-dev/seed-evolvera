import type { Action, Asset, MediaReference, Section, SiteConfig } from "../../domain/site-config.js";
import { escapeAttribute, escapeText } from "../html.js";
import { resolveMedia, type MediaDecision } from "../media.js";
import type { PresetDefinition } from "../presets.js";

export interface RenderContext { config: SiteConfig; assets: ReadonlyMap<string, Asset>; assetRoot: string; assetHref: (path: string) => string; actionHref: (href: string) => string; preset: PresetDefinition; decisions: MediaDecision[]; }
export type SectionOf<K extends Section["kind"]> = Extract<Section, { kind: K }>;
export const actions = (items: readonly Action[], context: RenderContext): string => `<div class="actions">${items.map((item, index) => `<a class="button${index ? " secondary" : ""}" href="${escapeAttribute(context.actionHref(item.href))}">${escapeText(item.label)}</a>`).join("")}</div>`;
export const heading = (title: string, eyebrow?: string): string => `${eyebrow ? `<p class="eyebrow">${escapeText(eyebrow)}</p>` : ""}<h2>${escapeText(title)}</h2>`;
export const media = (reference: MediaReference | undefined, context: RenderContext): string => {
  if (!reference) return "";
  const decision = resolveMedia(reference, context.assets, context.assetRoot); context.decisions.push(decision);
  if (!decision.selected || !decision.path) return "";
  const asset = context.assets.get(reference.assetId)!;
  const focal = decision.focalPoint ? `${decision.focalPoint.x * 100}% ${decision.focalPoint.y * 100}%` : "50% 50%";
  const classes = `media frame-${decision.frame} composition-${decision.composition} size-${decision.sizeBucket} density-${decision.density}`;
  return `<figure class="${classes}" data-aspect="${decision.aspect}" style="--fit:${decision.fit};--focal:${focal};--intrinsic-width:${asset.width}px;--intrinsic-height:${asset.height}px"><img src="${escapeAttribute(context.assetHref(decision.path))}" alt="${escapeAttribute(asset.alt)}" width="${asset.width}" height="${asset.height}"></figure>`;
};
export const sectionShell = (section: Section, inner: string, extra = ""): string => `<section id="${escapeAttribute(section.id)}" data-blueprint-section="${section.kind}" class="${extra}"><div class="container">${inner}</div></section>`;
