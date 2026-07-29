# Configuration

`renderSite(siteConfig, { outDir: siteDir })` accepts the public `SiteConfigInput` contract and currently renders one validated root Home. The CLI accepts the same JSON through explicit `--config <file> --out <directory>` flags.

## Root shape

A configuration has:

- `schemaVersion`: exactly `"1"`.
- `preset`: `service-driven`, `catalog-driven`, or `hybrid`.
- `company`: `name`, `tagline`, `summary`, required `primaryCta`, optional `logoAssetId`, `contactLinks`, and `footerLinks`.
- `seo`: required `title` and `description`; optional HTTPS `canonicalUrl`.
- `theme`: six-digit `primary` and `accent` colors plus `shape` (`square`, `soft`, `rounded`) and `density` (`compact`, `comfortable`, `spacious`). Shape and density have deterministic defaults.
- `assets`: caller-owned inventory entries with a stable `id`, normalized `assets/...` `path`, `role`, `alt`, positive `width`/`height`, and `provenance`.
- `pages`: one page for the current root profile. It must have `route: "/"`, an id/title, and an ordered non-empty section list.

Asset roles are `logo`, `brand`, `hero`, `editorial`, `product`, `service`, `sector`, and `gallery`. Provenance kinds are `owned`, `official`, `licensed`, and `caller-staged`; each entry also states a source and license. A media reference uses an asset id and optional controlled treatment: `fit`, `focalPoint`, `aspect`, `frame`, `composition`, `cropPolicy`, `density`, and `sizeBucket`. Product, logo, and brand media cannot request crop, cover fit, or full-bleed composition.

## Sections

The closed section vocabulary is `hero`, `proofRail`, `cardGrid`, `splitFeature`, `metricsBand`, `processTimeline`, `gallery`, `specGrid`, `faq`, and `cta`. Each section has a stable id and only the fields defined by its kind. Actions use local fragments, normalized root-relative paths, or safe `https:`, `mailto:`, and `tel:` links. For the current root-only output, prefer a fragment whose target exists in the document (such as `#contato`) or a direct contact URL; use `/contato` only when the caller actually hosts that route outside this renderer. Claims require structured provenance (`official-source`, `company-record`, or `caller-supplied`); omit a claim rather than inventing a number or proof.

The renderer emits semantic HTML with inline CSS and no raw HTML/CSS fields, scripts, inline SVG, remote media, or page-builder escape hatch. A missing staged asset is omitted with a receipt warning; it is not downloaded or replaced with an invented image.

## Validation and files

Validation rejects unknown fields, duplicate ids/routes, unsafe links or paths, unknown asset references, invalid media treatments, unsupported section kinds, and unsupported page profiles. Invalid input raises `RenderSiteError` in the library and produces compact field-addressable JSON on CLI stderr. Validation happens before the final owned files are replaced.

A successful root render writes exactly these owned root files, while preserving unrelated caller files and `assets/`:

- `index.html`
- `seed-receipt.json` — config/media decisions and hashes.
- `seed-validation.json` — independently recomputed HTML checks and hash.

The current profile is intentionally root-only: exactly one page at `/`. A future route needs a new documented render profile, a root-profile/document/writer seam, and explicit writer ownership before becoming public; this task does not add multipage output. A new section likewise needs a bounded schema in `src/domain/site-config.ts`, vocabulary/validation coverage as applicable, a renderer module, and one registration in `src/render/registry.ts` before it is accepted. Do not add arbitrary presentation fields to bypass that boundary.
