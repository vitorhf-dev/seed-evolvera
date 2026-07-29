# Bostoide adapter contract

This repository is a portable blueprint/preview boundary. It never imports or modifies bostoide, its prompts, media staging, post-render pipeline, or downstream guards. The only seam is validated `SiteConfig` data.

## Exact selected-page seam

Bostoide keeps its existing ownership and layout:

```text
siteDir = out/gerados/<slug>
siteDir/assets/...
```

`stageMedia` stages caller-owned files under `siteDir/assets/` and supplies paths such as `assets/example.png` verbatim in `SiteConfig.assets[].path`. The blueprint renderer verifies those files but never copies or moves them.

The checked-in adapter makes exactly one explicit selected-page call:

```ts
import { renderPagePreview, type SiteConfig } from "@evolvera/industrial-site-seed";

export function renderExistingBostoideSite(siteConfig: SiteConfig, siteDir: string) {
  return renderPagePreview(siteConfig, { route: "/", outDir: siteDir });
}
```

Page mode writes exactly `index.html`, `seed-receipt.json`, and `seed-validation.json` into that existing `siteDir`; authored `assets/...` hrefs remain unchanged. It preserves staged assets, sentinels, and unrelated files.

## Explicit CLI seam

```sh
node dist/cli.js render-page --config /path/to/site-config.json --route / --out out/gerados/exemplo
```

The CLI has no implicit command, prompts, slug defaults, server, or deployment behavior. Invalid arguments/configuration/output conflicts produce compact JSON stderr without leaking absolute paths or replacing existing finals.

## Downstream ownership

Bostoide remains responsible for config production, factual scout/identity inputs, asset mapping and guards, language/link/visual checks, sandbox, contrast/overflow, screenshots, validator and repair, packaging, publication, and outreach. The seed only supplies static blueprint previews. It does not implement forms, backend, auth, CMS, APIs, framework adapters, or runtime behavior.
