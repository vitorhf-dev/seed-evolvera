import { z } from "zod";

export const PRESETS = ["service-driven", "catalog-driven", "hybrid"] as const;
export const PAGE_TYPES = ["home", "institutional", "service", "catalog", "product", "contact"] as const;
export const SECTION_KINDS = ["hero", "proofRail", "cardGrid", "splitFeature", "metricsBand", "processTimeline", "gallery", "specGrid", "faq", "cta"] as const;
export const ASSET_ROLES = ["logo", "brand", "hero", "editorial", "product", "service", "sector", "gallery"] as const;
export const PROVENANCE_KINDS = ["owned", "official", "licensed", "caller-staged"] as const;
export const CLAIM_KINDS = ["official-source", "company-record", "caller-supplied"] as const;
export const MEDIA_FITS = ["cover", "contain"] as const;
export const MEDIA_ASPECTS = ["auto", "square", "portrait", "landscape", "wide"] as const;
export const MEDIA_FRAMES = ["none", "soft", "bordered"] as const;
export const MEDIA_COMPOSITIONS = ["full-bleed", "inset", "standalone"] as const;
export const CROP_POLICIES = ["allow", "no-crop"] as const;
export const MEDIA_DENSITIES = ["compact", "comfortable", "spacious"] as const;
export const SIZE_BUCKETS = ["small", "medium", "large"] as const;
export const THEME_SHAPES = ["square", "soft", "rounded"] as const;
export const THEME_DENSITIES = ["compact", "comfortable", "spacious"] as const;
export const CARD_VARIANTS = ["service", "catalog", "sector"] as const;

export const PresetSchema = z.enum(PRESETS);
export const PageTypeSchema = z.enum(PAGE_TYPES);
export const SectionKindSchema = z.enum(SECTION_KINDS);
export const AssetRoleSchema = z.enum(ASSET_ROLES);
export const AssetProvenanceKindSchema = z.enum(PROVENANCE_KINDS);
export const ClaimKindSchema = z.enum(CLAIM_KINDS);
export const MediaFitSchema = z.enum(MEDIA_FITS);
export const MediaAspectSchema = z.enum(MEDIA_ASPECTS);
export const MediaFrameSchema = z.enum(MEDIA_FRAMES);
export const MediaCompositionSchema = z.enum(MEDIA_COMPOSITIONS);
export const CropPolicySchema = z.enum(CROP_POLICIES);
export const MediaDensitySchema = z.enum(MEDIA_DENSITIES);
export const SizeBucketSchema = z.enum(SIZE_BUCKETS);
export const ThemeShapeSchema = z.enum(THEME_SHAPES);
export const ThemeDensitySchema = z.enum(THEME_DENSITIES);
export const CardVariantSchema = z.enum(CARD_VARIANTS);

export const SafeIdSchema = z.string().min(1).max(80).regex(/^[a-z][a-z0-9-]*$/, "Must be a lowercase stable identifier");
export const HexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a #RRGGBB color");
export const TextSchema = z.string().trim().min(1).max(5000);
