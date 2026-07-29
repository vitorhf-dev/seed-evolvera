# Evolvera Industrial Site Seed

A validated, client-neutral SiteConfig library for one root Home. It can be consumed directly as a library or through the compiled `evolvera-industrial-seed` CLI. It does not deploy, download media, start a server, or generate legacy `HOME_*.md` files.

## Install and build

```sh
npm ci
npm run check
npm run build
```

The package requires Node 20 or newer. Zod is the only production dependency.

## Library

Pass a complete `SiteConfig` (or compatible input) and the caller-owned site directory directly:

```ts
import { renderSite } from "@evolvera/industrial-site-seed";

const result = renderSite(siteConfig, { outDir: siteDir });
console.log(result.files); // index.html, seed-receipt.json, seed-validation.json
```

The renderer creates or uses the exact `siteDir`, writes only those three owned root files, and preserves caller-owned files and `assets/` entries. See [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md).

## CLI

The CLI has no interactive prompts, environment defaults, or slug inference. Both flags are required:

```sh
node dist/cli.js --config examples/service-no-media.json --out /tmp/site
# or, after installation:
evolvera-industrial-seed --config examples/service-no-media.json --out /tmp/site
```

Successful stdout is deterministic JSON naming the three output files. Failures are compact JSON issues on stderr and leave existing finals untouched. `--out` is passed to the public `renderSite` call exactly as supplied.

The service example is a complete no-media Home. Its contact actions target the generated footer (`#contato`), so the root-only output has no invented route. Use a root-relative route such as `/contato` only when the caller actually hosts it. The catalog example references `assets/catalogo-item.png`; stage that file in the caller-owned directory before rendering. No media is committed in this repository:

```sh
mkdir -p /tmp/catalog-site/assets
# copy or create the caller-owned asset at /tmp/catalog-site/assets/catalogo-item.png
node dist/cli.js --config examples/catalog-local-media.json --out /tmp/catalog-site
```

The seed is a renderer boundary, not a deployment runtime. Packaging, publication, outreach, screenshots, and downstream validation remain the responsibility of the caller.
