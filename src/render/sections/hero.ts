import { escapeText } from "../html.js";
import { actions, media, sectionShell, type RenderContext, type SectionOf } from "./shared.js";
export const renderHero = (section: SectionOf<"hero">, context: RenderContext): string => { const visual = media(section.media, context); return sectionShell(section, `<div class="hero-grid${visual ? "" : " no-media"}"><div class="hero-copy"><p class="eyebrow">${escapeText(context.preset.label)}</p><h1>${escapeText(section.title)}</h1><p class="lead">${escapeText(section.body)}</p>${actions(section.actions, context)}</div>${visual}</div>`, "hero"); };
