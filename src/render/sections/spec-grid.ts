import { escapeText } from "../html.js";
import { heading, sectionShell, type RenderContext, type SectionOf } from "./shared.js";
export const renderSpecGrid = (section: SectionOf<"specGrid">, _context: RenderContext): string => sectionShell(section, `${heading(section.heading, "Informação técnica")}<div class="grid cards">${section.groups.map((group) => `<article class="card"><h3>${escapeText(group.heading)}</h3><dl class="specs">${group.specs.map((spec) => `<div><dt>${escapeText(spec.label)}</dt><dd>${escapeText(spec.value)}</dd></div>`).join("")}</dl></article>`).join("")}</div>`);
