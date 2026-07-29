import type { SiteConfig } from "../domain/site-config.js";

export interface PresetDefinition {
  id: SiteConfig["preset"];
  label: string;
  mood: "editorial" | "catalog" | "balanced";
  heroAlignment: "left" | "split";
  cardTreatment: "quiet" | "outlined" | "raised";
  darkBands: boolean;
}

export const PRESET_REGISTRY = {
  "service-driven": { id: "service-driven", label: "Autoridade técnica", mood: "editorial", heroAlignment: "left", cardTreatment: "quiet", darkBands: false },
  "catalog-driven": { id: "catalog-driven", label: "Catálogo industrial", mood: "catalog", heroAlignment: "split", cardTreatment: "outlined", darkBands: true },
  hybrid: { id: "hybrid", label: "Soluções integradas", mood: "balanced", heroAlignment: "split", cardTreatment: "raised", darkBands: false },
} as const satisfies Record<SiteConfig["preset"], PresetDefinition>;

export const getPreset = (id: SiteConfig["preset"]): PresetDefinition => PRESET_REGISTRY[id];
