# Evolvera Industrial Blueprint Preview

A validated, framework-agnostic library for portable industrial **website blueprints and static previews**. A blueprint can describe an ordered multipage skeleton; the package renders one selected page or the complete site preview. It does not generate a functional website, backend, CMS, forms, authentication, APIs, server, deployment, or runtime plugin.

## Install and build

```sh
npm ci
npm run check
npm run build
```

The package requires Node 20 or newer. Zod is the only production dependency.

## Library

Use explicit preview operations with a caller-owned directory:

```ts
import { renderPagePreview, renderSitePreview } from "@evolvera/industrial-site-seed";

const selected = renderPagePreview(siteConfig, { route: "/", outDir: siteDir });
const complete = renderSitePreview(siteConfig, { outDir: siteDir });
console.log(selected.files); // index.html, seed-receipt.json, seed-validation.json
```

Page preview owns exactly those three root files and preserves `assets/` and unrelated caller files. Site preview writes authored route `index.html` files plus only the two root receipts, without copying assets or clearing stale/unrelated paths. See [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md).

## CLI

The command is explicit and has no prompts, environment defaults, or slug inference:

```sh
node dist/cli.js render-page --config examples/service-no-media.json --route / --out /tmp/site
node dist/cli.js render-site --config examples/multipage-blueprint.json --out /tmp/site
```

Successful stdout is deterministic JSON. Failures are compact field-addressable JSON on stderr and preserve existing finals. The catalog example references caller-staged `assets/catalogo-item.png`; no media is committed here. `examples/multipage-blueprint.json` is a fictional unsupported-claim-free skeleton covering five routes.

Bostoide uses the selected `/` page seam and keeps ownership of its existing directory, assets, guards, screenshots, validation, packaging, and publication. This package only provides blueprint/preview output; it is not a production-site generator.
