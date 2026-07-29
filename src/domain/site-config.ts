import { z } from "zod";
import {
  AssetProvenanceKindSchema,
  AssetRoleSchema,
  PageTypeSchema,
  CardVariantSchema,
  ClaimKindSchema,
  CropPolicySchema,
  HexColorSchema,
  MediaAspectSchema,
  MediaCompositionSchema,
  MediaDensitySchema,
  MediaFitSchema,
  MediaFrameSchema,
  PresetSchema,
  SafeIdSchema,
  SizeBucketSchema,
  TextSchema,
  ThemeDensitySchema,
  ThemeShapeSchema,
} from "./vocabulary.js";

const safeHref = (value: string): boolean => {
  if (/[\u0000-\u001f\u007f]/.test(value) || value.includes("%") || value.startsWith("//")) return false;
  if (/^#[A-Za-z][A-Za-z0-9-]*$/.test(value)) return true;
  if (value.startsWith("/")) {
    if (value.startsWith("//") || /[?#\\]/.test(value)) return false;
    return value === "/" || value.slice(1).split("/").every((part) => part.length > 0 && part !== "." && part !== "..");
  }
  try {
    const url = new URL(value);
    return ["https:", "mailto:", "tel:"].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
};

const safeCanonical = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !/[\u0000-\u001f\u007f]/.test(value);
  } catch {
    return false;
  }
};

const safeAssetPath = (value: string): boolean =>
  value.startsWith("assets/") &&
  !/[\u0000-\u001f\u007f%?#\\]/.test(value) &&
  value.split("/").every((part) => part.length > 0 && part !== "." && part !== "..");

const safeRoute = (value: string): boolean =>
  value.startsWith("/") && !value.startsWith("//") && !/[\u0000-\u001f\u007f%?#\\]/.test(value) &&
  (value === "/" || value.slice(1).split("/").every((part) => part.length > 0 && part !== "." && part !== ".."));

export const ActionSchema = z.object({
  label: z.string().trim().min(1).max(120),
  href: z.string().min(1).max(2048).refine(safeHref, "Unsafe action href"),
}).strict();

export const ClaimProvenanceSchema = z.object({
  kind: ClaimKindSchema,
  reference: z.string().trim().min(1).max(500),
  sourceUrl: z.string().max(2048).refine(safeCanonical, "Must be a safe HTTPS URL").optional(),
}).strict();

export const EvidenceClaimSchema = z.object({
  value: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(240),
  provenance: ClaimProvenanceSchema,
}).strict();

export const AssetProvenanceSchema = z.object({
  kind: AssetProvenanceKindSchema,
  source: z.string().trim().min(1).max(2048),
  license: z.string().trim().min(1).max(500),
  restriction: z.string().trim().min(1).max(500).optional(),
}).strict();

export const AssetSchema = z.object({
  id: SafeIdSchema,
  path: z.string().min(1).max(500).refine(safeAssetPath, "Must be a normalized assets/... path"),
  role: AssetRoleSchema,
  alt: z.string().trim().max(500),
  width: z.number().int().positive().max(20000),
  height: z.number().int().positive().max(20000),
  provenance: AssetProvenanceSchema,
}).strict();

export const MediaTreatmentSchema = z.object({
  fit: MediaFitSchema.optional(),
  focalPoint: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).strict().optional(),
  aspect: MediaAspectSchema.optional(),
  frame: MediaFrameSchema.optional(),
  composition: MediaCompositionSchema.optional(),
  cropPolicy: CropPolicySchema.optional(),
  density: MediaDensitySchema.optional(),
  sizeBucket: SizeBucketSchema.optional(),
}).strict();

export const MediaReferenceSchema = z.object({
  assetId: SafeIdSchema,
  treatment: MediaTreatmentSchema.optional(),
}).strict();

const mediaField = { media: MediaReferenceSchema.optional() };
const actionsField = { actions: z.array(ActionSchema).min(1).max(3) };

export const HeroSectionSchema = z.object({ kind: z.literal("hero"), id: SafeIdSchema, title: TextSchema, body: TextSchema, ...actionsField, ...mediaField }).strict();
export const ProofRailSectionSchema = z.object({ kind: z.literal("proofRail"), id: SafeIdSchema, claims: z.array(EvidenceClaimSchema).min(1).max(12) }).strict();
export const CardSchema = z.object({ id: SafeIdSchema, title: TextSchema, body: TextSchema, action: ActionSchema.optional(), media: MediaReferenceSchema.optional() }).strict();
export const CardGridSectionSchema = z.object({ kind: z.literal("cardGrid"), id: SafeIdSchema, variant: CardVariantSchema, heading: TextSchema, cards: z.array(CardSchema).min(1).max(24), actions: z.array(ActionSchema).max(3).optional(), media: z.array(MediaReferenceSchema).max(12).optional() }).strict();
export const SplitFeatureSectionSchema = z.object({ kind: z.literal("splitFeature"), id: SafeIdSchema, heading: TextSchema, body: TextSchema, points: z.array(TextSchema).min(1).max(12), action: ActionSchema.optional(), media: MediaReferenceSchema.optional() }).strict();
export const MetricsBandSectionSchema = z.object({ kind: z.literal("metricsBand"), id: SafeIdSchema, claims: z.array(EvidenceClaimSchema).min(1).max(12) }).strict();
export const ProcessStepSchema = z.object({ id: SafeIdSchema, title: TextSchema, body: TextSchema }).strict();
export const ProcessTimelineSectionSchema = z.object({ kind: z.literal("processTimeline"), id: SafeIdSchema, heading: TextSchema, steps: z.array(ProcessStepSchema).min(2).max(12) }).strict();
export const GallerySectionSchema = z.object({ kind: z.literal("gallery"), id: SafeIdSchema, heading: TextSchema, items: z.array(MediaReferenceSchema).min(1).max(24) }).strict();
export const SpecSchema = z.object({ label: z.string().trim().min(1).max(120), value: z.string().trim().min(1).max(500) }).strict();
export const SpecGroupSchema = z.object({ heading: TextSchema, specs: z.array(SpecSchema).min(1).max(24) }).strict();
export const SpecGridSectionSchema = z.object({ kind: z.literal("specGrid"), id: SafeIdSchema, heading: TextSchema, groups: z.array(SpecGroupSchema).min(1).max(12) }).strict();
export const FaqItemSchema = z.object({ question: TextSchema, answer: TextSchema }).strict();
export const FaqSectionSchema = z.object({ kind: z.literal("faq"), id: SafeIdSchema, heading: TextSchema, items: z.array(FaqItemSchema).min(1).max(24) }).strict();
export const CtaSectionSchema = z.object({ kind: z.literal("cta"), id: SafeIdSchema, title: TextSchema, body: TextSchema, ...actionsField, ...mediaField }).strict();

export const SectionSchema = z.discriminatedUnion("kind", [HeroSectionSchema, ProofRailSectionSchema, CardGridSectionSchema, SplitFeatureSectionSchema, MetricsBandSectionSchema, ProcessTimelineSectionSchema, GallerySectionSchema, SpecGridSectionSchema, FaqSectionSchema, CtaSectionSchema]);

export const SeoSchema = z.object({
  title: z.string().trim().min(1).max(70),
  description: z.string().trim().min(1).max(180),
  canonicalUrl: z.string().max(2048).refine(safeCanonical, "Must be a safe HTTPS URL").optional(),
}).strict();

export const PageSchema = z.object({
  id: SafeIdSchema,
  route: z.string().min(1).max(300).refine(safeRoute, "Must be a normalized root-relative route"),
  pageType: PageTypeSchema,
  title: TextSchema,
  seo: SeoSchema.optional(),
  sections: z.array(SectionSchema).min(1).max(40),
}).strict();

export const CompanySchema = z.object({
  name: z.string().trim().min(1).max(160),
  tagline: z.string().trim().min(1).max(240),
  summary: TextSchema,
  logoAssetId: SafeIdSchema.optional(),
  primaryCta: ActionSchema,
  contactLinks: z.array(ActionSchema).max(8).default([]),
  footerLinks: z.array(ActionSchema).max(12).default([]),
}).strict();

export const ThemeSchema = z.object({
  primary: HexColorSchema,
  accent: HexColorSchema,
  shape: ThemeShapeSchema.default("soft"),
  density: ThemeDensitySchema.default("comfortable"),
}).strict();

export const SiteConfigSchema = z.object({
  schemaVersion: z.literal("1"),
  preset: PresetSchema,
  company: CompanySchema,
  seo: SeoSchema,
  theme: ThemeSchema,
  assets: z.array(AssetSchema).max(200).default([]),
  mainNavigation: z.array(ActionSchema).min(1).max(8),
  pages: z.array(PageSchema).min(1).max(20),
}).strict();

export type Action = z.infer<typeof ActionSchema>;
export type EvidenceClaim = z.infer<typeof EvidenceClaimSchema>;
export type Asset = z.infer<typeof AssetSchema>;
export type MediaTreatment = z.infer<typeof MediaTreatmentSchema>;
export type MediaReference = z.infer<typeof MediaReferenceSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type Page = z.infer<typeof PageSchema>;
export type SiteConfig = z.infer<typeof SiteConfigSchema>;
export type SiteConfigInput = z.input<typeof SiteConfigSchema>;
