import { escapeText } from "../html.js";
import { heading, sectionShell, type RenderContext, type SectionOf } from "./shared.js";
export const renderFaq = (section: SectionOf<"faq">, _context: RenderContext): string => sectionShell(section, `${heading(section.heading, "Dúvidas frequentes")}<div>${section.items.map((item) => `<details><summary>${escapeText(item.question)}</summary><p>${escapeText(item.answer)}</p></details>`).join("")}</div>`);
