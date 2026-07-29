# Bostoide adapter contract

This repository is a seed-side renderer boundary. It neither imports nor modifies bostoide, `Unified`, its prompts, its media downloader, or its post-render pipeline. The only later seam is the validated `SiteConfig` JSON.

## Exact directory and media mapping

Bostoide keeps its existing ownership and layout:

```text
siteDir = out/gerados/<slug>
siteDir/assets/...
```

`stageMedia` continues to stage caller-owned files under `siteDir/assets/` and produces relative paths such as `assets/example.png`. Those paths map **verbatim** into `SiteConfig.assets[].path`; do not prepend another directory, rewrite the slug, copy the asset into a second inventory, or hotlink its source URL. Bostoide supplies the factual `width`, `height`, `alt`, provenance, and role for each staged asset and maps factual content/identity into the typed config. It never passes raw HTML, CSS, prompt output, or page-builder fields.

### Minimal staging adaptation

Today `stageMedia.ts` builds the useful `remote URL → assets/...` map internally as `mapa`, but its public `Staging` result exposes only aggregate counts plus `logoLocal` and `marcasLocais`; `imagens-locais.txt` contains paths without the original structured association. The smallest later bostoide adaptation is to expose that existing map on `Staging` (for example, a read-only `assetMap`) or persist an equivalent structured JSON receipt during staging. The adapter can then join `scout.imagens[].src` and `identidadeVisual.logo` to the exact staged paths without parsing prose or guessing filenames. This is a bostoide-side interface extension; the seed neither requires nor implements it here.

For each mapped file, the adapter should create one `SiteConfig.assets[]` entry with a stable generated id, the verbatim relative path, factual intrinsic dimensions, factual alt text, a semantic role, and provenance. Section media references use only those ids. Unmapped/dead downloads are omitted, allowing the renderer's editorial fallback instead of a broken `<img>`.

The following are deliberate boundaries:

- **With-site input:** factual scout data, identity, known content, staged `assets/...` paths, and caller-supplied provenance become the corresponding `SiteConfig` fields. Existing logo/marca/media guards decide whether those assets can be mapped and which controlled treatments are allowed.
- **No-site input:** the existing scout/no-site factual inputs may fill only facts actually available to the caller and the neutral content/identity fields needed by `SiteConfig`. This document does not invent a `NoSiteCandidate` shape or unavailable fields. The same typed config boundary applies, with no raw presentation or copied client content.

## One library call

The seed-side example is intentionally decoupled and compilable:

```ts
import { renderSite, type SiteConfig } from "@evolvera/industrial-site-seed";

export function renderExistingBostoideSite(siteConfig: SiteConfig, siteDir: string) {
  return renderSite(siteConfig, { outDir: siteDir });
}
```

The checked-in [`examples/bostoide-adapter.ts`](../examples/bostoide-adapter.ts) uses the source API for local development. The important invariant is one public call and the exact existing `siteDir`; there is no second orchestration implementation.

## One CLI call

For a process boundary, write the already-produced config to a caller-owned JSON file and use the exact directory:

```sh
node dist/cli.js --config /path/to/site-config.json --out out/gerados/exemplo
```

The CLI requires both flags, uses no interactive or slug defaults, preserves staged assets and unrelated files, and reports the three deterministic root outputs. Invalid arguments, JSON, config, or render profile produce compact JSON stderr and do not replace existing finals.

## Later replacement seam and preserved pipeline

The later bostoide replacement is only the current full-HTML design/content/planner/builder/polisher production block in `src/pi/gerarSitePi.ts`, together with its corresponding no-site prompt chain. The new AI task emits only validated `SiteConfig` JSON. This repository does not modify or import bostoide and does not emit legacy `HOME_*.md` files.

Bostoide preserves all surrounding behavior and ownership:

- `siteDir = out/gerados/<slug>` and `stageMedia`/`assets/` staging;
- scout and no-site factual inputs, logo/marca/media guards, and cap-upscale behavior;
- link, language, and visual guards;
- sandbox, contrast, and overflow checks;
- portrait/landscape screenshots;
- validator and repair;
- packaging, publication, and outreach.

The seed renderer writes `index.html`, `seed-receipt.json`, and `seed-validation.json` as additive root outputs. Bostoide may initially ignore `seed-receipt.json` and `seed-validation.json`; it does not need to replace its existing validation, screenshot, packaging, or publication envelope to adopt the seed call.
