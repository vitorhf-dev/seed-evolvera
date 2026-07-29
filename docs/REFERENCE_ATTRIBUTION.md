# Reference attribution

The following read-only references informed boundary and pattern decisions. They are attribution anchors, not runtime dependencies.

## Anchors consulted

- `/home/vitor/projetos/evolvera-sites-for-seed/elevador/websites-seteservic/app/page.tsx` — declarative section composition anchor.
- `/home/vitor/projetos/evolvera-sites-for-seed/elevador/websites-seteservic/public/images/manifest.json` — asset provenance and local-media inventory anchor.
- `/home/vitor/projetos/evolvera-sites-for-seed/porto-seguro-molas/websites-porto-seguro-molas/app/page.tsx` — hybrid composition anchor.
- `/home/vitor/bostoide2000/capturas-manuais/gdaq/depois/notas.txt` — evidence that GDAQ material is capture-only, not site content.
- `/home/vitor/bostoide2000/src/pi/stageMedia.ts` — existing caller-owned `siteDir/assets/...` staging boundary.
- `/home/vitor/bostoide2000/src/pi/gerarSitePi.ts` — later full-HTML generation/polish seam and preserved downstream envelope.
- `/home/vitor/bostoide2000/src/domain/unifiedSchema.ts` — deliberate adapter decoupling anchor.

## Adopted at a high level

The seed uses the useful *shape* of declarative sections, ordered content, explicit media inventory, provenance, and hybrid service/catalog composition. Those ideas are represented by this repository's own closed `SiteConfig` schema, renderer registry, and neutral examples.

## Explicitly excluded

No reference identity, client name, address, logo, color claim, copy, metric, testimonial, factual assertion, source asset, image bytes, screenshot, capture, CSS, HTML, prompt, `Unified` type, bostoide import, or implementation was copied or vendored. The examples use fictional neutral identities and caller-supplied provenance only. The catalog example names a caller-staged path but commits no media.

The GDAQ note is not used as proof of a client or product claim; it only supports keeping capture evidence outside this seed package. Reference repositories remain read-only and outside this package's build and runtime graph.
