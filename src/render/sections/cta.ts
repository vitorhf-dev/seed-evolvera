import { escapeText } from "../html.js";
import { actions, media, sectionShell, type RenderContext, type SectionOf } from "./shared.js";
export const renderCta = (section: SectionOf<"cta">, context: RenderContext): string => { const visual = media(section.media, context); return sectionShell(section, `<div class="${visual ? "split" : ""}"><div><p class="eyebrow">Próximo passo</p><h2>${escapeText(section.title)}</h2><p class="lead">${escapeText(section.body)}</p>${actions(section.actions)}</div>${visual}</div>`, "cta"); };
