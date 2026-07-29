import type { Section } from "../domain/site-config.js";
import { renderCardGrid } from "./sections/card-grid.js";
import { renderCta } from "./sections/cta.js";
import { renderFaq } from "./sections/faq.js";
import { renderGallery } from "./sections/gallery.js";
import { renderHero } from "./sections/hero.js";
import { renderMetricsBand } from "./sections/metrics-band.js";
import { renderProcessTimeline } from "./sections/process-timeline.js";
import { renderProofRail } from "./sections/proof-rail.js";
import { renderSpecGrid } from "./sections/spec-grid.js";
import { renderSplitFeature } from "./sections/split-feature.js";
import type { RenderContext, SectionOf } from "./sections/shared.js";

type Registry = { [K in Section["kind"]]: (section: SectionOf<K>, context: RenderContext) => string };
export const SECTION_REGISTRY = { hero: renderHero, proofRail: renderProofRail, cardGrid: renderCardGrid, splitFeature: renderSplitFeature, metricsBand: renderMetricsBand, processTimeline: renderProcessTimeline, gallery: renderGallery, specGrid: renderSpecGrid, faq: renderFaq, cta: renderCta } satisfies Registry;
export const SECTION_KINDS_REGISTERED = Object.freeze(Object.keys(SECTION_REGISTRY) as Section["kind"][]);
export const assertUniqueRegistry = (): void => { if (new Set(SECTION_KINDS_REGISTERED).size !== SECTION_KINDS_REGISTERED.length) throw new Error("Duplicate section renderer registration"); };
export const renderSection = (section: Section, context: RenderContext): string => {
  switch (section.kind) {
    case "hero": return SECTION_REGISTRY.hero(section, context); case "proofRail": return SECTION_REGISTRY.proofRail(section, context); case "cardGrid": return SECTION_REGISTRY.cardGrid(section, context); case "splitFeature": return SECTION_REGISTRY.splitFeature(section, context); case "metricsBand": return SECTION_REGISTRY.metricsBand(section, context); case "processTimeline": return SECTION_REGISTRY.processTimeline(section, context); case "gallery": return SECTION_REGISTRY.gallery(section, context); case "specGrid": return SECTION_REGISTRY.specGrid(section, context); case "faq": return SECTION_REGISTRY.faq(section, context); case "cta": return SECTION_REGISTRY.cta(section, context);
  }
};
