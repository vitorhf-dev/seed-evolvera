import { escapeText } from "../html.js";
import { heading, sectionShell, type RenderContext, type SectionOf } from "./shared.js";
export const renderProcessTimeline = (section: SectionOf<"processTimeline">, _context: RenderContext): string => sectionShell(section, `${heading(section.heading, "Como trabalhamos")}<ol class="timeline">${section.steps.map((step) => `<li><h3>${escapeText(step.title)}</h3><p>${escapeText(step.body)}</p></li>`).join("")}</ol>`);
