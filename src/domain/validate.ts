import { z } from "zod";
import { SiteConfigSchema, type MediaReference, type SiteConfig } from "./site-config.js";

export type ValidationPath = readonly (string | number)[];
export interface SiteConfigIssue {
  path: ValidationPath;
  code: string;
  message: string;
}
export type SiteConfigParseResult =
  | { success: true; data: SiteConfig }
  | { success: false; issues: SiteConfigIssue[] };

const duplicateIndexes = (values: readonly string[]): number[] => {
  const seen = new Set<string>();
  const duplicates: number[] = [];
  values.forEach((value, index) => seen.has(value) ? duplicates.push(index) : seen.add(value));
  return duplicates;
};

export const SiteConfigContractSchema = SiteConfigSchema.superRefine((config, context) => {
  duplicateIndexes(config.assets.map((asset) => asset.id)).forEach((index) => context.addIssue({ code: "custom", path: ["assets", index, "id"], message: "Duplicate asset id" }));
  duplicateIndexes(config.pages.map((page) => page.id)).forEach((index) => context.addIssue({ code: "custom", path: ["pages", index, "id"], message: "Duplicate page id" }));
  duplicateIndexes(config.pages.map((page) => page.route)).forEach((index) => context.addIssue({ code: "custom", path: ["pages", index, "route"], message: "Duplicate page route" }));

  const assets = new Map(config.assets.map((asset) => [asset.id, asset]));
  if (config.company.logoAssetId) {
    const logo = assets.get(config.company.logoAssetId);
    if (!logo) context.addIssue({ code: "custom", path: ["company", "logoAssetId"], message: "Unknown asset id" });
    else if (logo.role !== "logo" && logo.role !== "brand") context.addIssue({ code: "custom", path: ["company", "logoAssetId"], message: "Company logo must reference a logo or brand asset" });
  }

  const checkMedia = (media: MediaReference, path: (string | number)[]) => {
    const asset = assets.get(media.assetId);
    if (!asset) {
      context.addIssue({ code: "custom", path: [...path, "assetId"], message: "Unknown asset id" });
      return;
    }
    const treatment = media.treatment;
    if (!treatment) return;
    if (["logo", "brand", "product"].includes(asset.role) && treatment.cropPolicy === "allow")
      context.addIssue({ code: "custom", path: [...path, "treatment", "cropPolicy"], message: `${asset.role} media cannot allow cropping` });
    if (["logo", "brand", "product"].includes(asset.role) && treatment.fit === "cover")
      context.addIssue({ code: "custom", path: [...path, "treatment", "fit"], message: `${asset.role} media cannot use cover fit` });
    if (["logo", "brand", "product"].includes(asset.role) && treatment.composition === "full-bleed")
      context.addIssue({ code: "custom", path: [...path, "treatment", "composition"], message: `${asset.role} media cannot be full-bleed` });
  };

  config.pages.forEach((page, pageIndex) => {
    duplicateIndexes(page.sections.map((section) => section.id)).forEach((sectionIndex) => context.addIssue({ code: "custom", path: ["pages", pageIndex, "sections", sectionIndex, "id"], message: "Duplicate section id" }));
    const heroIndexes = page.sections.map((section, index) => section.kind === "hero" ? index : -1).filter((index) => index >= 0);
    if (page.route === "/" && heroIndexes.length > 1) heroIndexes.slice(1).forEach((sectionIndex) => context.addIssue({ code: "custom", path: ["pages", pageIndex, "sections", sectionIndex, "kind"], message: "Root Home can contain at most one hero" }));

    page.sections.forEach((section, sectionIndex) => {
      const base = ["pages", pageIndex, "sections", sectionIndex] as (string | number)[];
      if ((section.kind === "hero" || section.kind === "cta" || section.kind === "splitFeature") && section.media) checkMedia(section.media, [...base, "media"]);
      if (section.kind === "cardGrid") {
        section.cards.forEach((card, cardIndex) => card.media && checkMedia(card.media, [...base, "cards", cardIndex, "media"]));
        section.media?.forEach((media, mediaIndex) => checkMedia(media, [...base, "media", mediaIndex]));
      }
      if (section.kind === "gallery") section.items.forEach((media, mediaIndex) => checkMedia(media, [...base, "items", mediaIndex]));
    });
  });
});

export const getRenderProfileIssues = (config: SiteConfig, profile: "root-home" = "root-home"): SiteConfigIssue[] => {
  if (profile !== "root-home") return [{ path: ["pages"], code: "unsupported_render_profile", message: "Unsupported render profile" }];
  const roots = config.pages.map((page, index) => page.route === "/" ? index : -1).filter((index) => index >= 0);
  if (config.pages.length === 1 && roots.length === 1) return [];
  return [{ path: ["pages"], code: "unsupported_render_profile", message: "Root Home profile requires exactly one page with route /" }];
};

const toIssues = (error: z.ZodError): SiteConfigIssue[] => error.issues.map((issue) => ({
  path: issue.path.map((part) => typeof part === "symbol" ? String(part) : part),
  code: issue.code,
  message: issue.message,
}));

export const parseSiteConfig = (input: unknown): SiteConfigParseResult => {
  const parsed = SiteConfigContractSchema.safeParse(input);
  return parsed.success ? { success: true, data: parsed.data } : { success: false, issues: toIssues(parsed.error) };
};

export const parseRootHomeConfig = (input: unknown): SiteConfigParseResult => {
  const parsed = parseSiteConfig(input);
  if (!parsed.success) return parsed;
  const issues = getRenderProfileIssues(parsed.data);
  return issues.length === 0 ? parsed : { success: false, issues };
};

export const normalizeSiteConfig = (input: unknown): SiteConfigParseResult => parseSiteConfig(input);
