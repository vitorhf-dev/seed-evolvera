# Configuration

`renderPagePreview(input, { route, outDir })` selects one exact configured page. `renderSitePreview(input, { outDir })` renders every page in authored order. Both accept the strict `SiteConfigInput` contract and return deterministic preview receipts. They emit static reference HTML only.

## Root shape

A configuration has:

- `schemaVersion`: exactly `"1"`.
- `preset`: `service-driven`, `catalog-driven`, or `hybrid`.
- `company`: `name`, `tagline`, `summary`, required `primaryCta`, optional `logoAssetId`, `contactLinks`, and `footerLinks`.
- `seo`: complete strict `title`/`description` metadata and optional HTTPS `canonicalUrl`.
- `theme`: six-digit `primary` and `accent` colors plus `shape` and `density` with deterministic defaults.
- `assets`: caller-owned inventory with stable id, normalized `assets/...` path, role, alt, dimensions, and provenance. Files are never copied or moved.
- `mainNavigation`: 1–8 explicit `Action` entries.
- `pages`: 1–20 authored pages, exactly one with route `/`, each with a closed `pageType` (`home`, `institutional`, `service`, `catalog`, `product`, or `contact`), id/title, ordered sections, and optional complete strict `seo` override.

Asset roles, provenance kinds, media treatments, and the ten closed section kinds remain unchanged. Product, logo, and brand media cannot request crop, cover fit, or full-bleed composition.

## Actions and links

Actions may use a configured root-relative route, a contextual fragment, or safe `https:`, `mailto:`, and `tel:` URLs. Page-local fragments must identify that page's section or the fixed `#conteudo`/`#contato` anchors. Shared company and navigation actions must be valid on every page. Controls, `%` ambiguity, traversal, query/fragment routes, backslashes, bare `#`, and unknown targets are rejected with stable field paths. Unknown fields and unsupported presentation fields are rejected.

## Output mapping

Page mode writes exactly `index.html`, `seed-receipt.json`, and `seed-validation.json` at the supplied directory, preserving `assets/`, sentinels, unrelated files, and authored hrefs. The receipt identifies mode, selected page id/route/type, hashes, media decisions, and warnings.

Site mode maps `/` to `index.html` and `/empresa` to `empresa/index.html` (nested routes continue likewise). It writes each authored route index plus only root `seed-receipt.json` and `seed-validation.json`. Internal links and `assets/...` media become POSIX relative `file://`-preview hrefs from each page. All page bytes and independent HTML validations are prepared before one transactional replacement; existing owned finals may be replaced, but nothing is recursively cleared and caller assets are not moved.

## Sections and handoff boundary

The renderer emits escaped semantic HTML with inline CSS, the `data-blueprint-section` marker, no raw HTML/CSS fields, script, inline SVG, remote media, backend, CMS, form, auth, API, deploy, sitemap, robots, or runtime framework feature. Missing staged media is omitted with a deterministic warning. Packaging, hosting, screenshots, downstream validation, and publication remain caller-owned.
