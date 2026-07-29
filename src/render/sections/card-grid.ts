import { escapeText } from "../html.js";
import { actions, heading, media, sectionShell, type RenderContext, type SectionOf } from "./shared.js";
export const renderCardGrid = (section: SectionOf<"cardGrid">, context: RenderContext): string => {
  const auxiliary = section.media?.map((item) => media(item, context)).filter(Boolean).join("") ?? "";
  return sectionShell(section, `${heading(section.heading, section.variant === "catalog" ? "Portfólio" : "Soluções")}<div class="grid cards">${section.cards.map((card) => `<article class="card">${media(card.media, context)}<h3>${escapeText(card.title)}</h3><p>${escapeText(card.body)}</p>${card.action ? actions([card.action]) : ""}</article>`).join("")}</div>${auxiliary ? `<div class="media-rail" data-card-grid-media>${auxiliary}</div>` : ""}${section.actions ? actions(section.actions) : ""}`);
};
