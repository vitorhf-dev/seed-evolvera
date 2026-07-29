import { escapeText } from "../html.js";
import { sectionShell, type RenderContext, type SectionOf } from "./shared.js";
export const renderMetricsBand = (section: SectionOf<"metricsBand">, _context: RenderContext): string => sectionShell(section, `<div class="grid">${section.claims.map((claim) => `<div class="claim"><strong>${escapeText(claim.value)}</strong><span>${escapeText(claim.label)}</span></div>`).join("")}</div>`, "metrics");
