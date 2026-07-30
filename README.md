# Evolvera Industrial Static Blueprint

This repository is the persistent blueprint: six inspectable HTML pages, modular CSS and dependency-free browser modules form the site itself. It is a neutral industrial B2B starting point, not a renderer or a source configuration for another site. There is no build step, transport, framework, production dependency or generator.

## Routes

- `/` — Home: offer, routes, fit, process, proof slots and RFQ CTA
- `/empresa/` — Empresa: institutional scope, process, contexts and evidence slots
- `/catalogo/` — Catálogo: family filter, cards, selection help and FAQ
- `/catalogo/solucao-exemplo/` — Solução exemplo: fit, specifications, gallery and related routes
- `/servicos/capacidade-exemplo/` — Capacidade exemplo: scope, inputs, process and evidence slots
- `/contato/` — Contato técnico / RFQ: validated inquiry and direct-channel placeholders

The six route files are `index.html`, `empresa/index.html`, `catalogo/index.html`, `catalogo/solucao-exemplo/index.html`, `servicos/capacidade-exemplo/index.html` and `contato/index.html`. Open any `index.html` directly, or start the dependency-free read-only loopback server:

```sh
npm run serve
```

The server accepts only local `GET`/`HEAD` reads. No install or build is needed for normal viewing. Node 20 or newer is required for the structural checks; the browser and aggregate checks also require the installed Playwright package:

```sh
npm run test:structure   # fixed HTML/resource/package and read-only server oracle
npm run test:browser     # serial, memory-capped Playwright foundation + interactions
npm run test              # structure/server first, then browser
npm run check             # same complete aggregate
```

`npm run test:interactions` remains available for the focused interaction suite. Keep browser commands serial and memory-capped; do not run an uncapped direct interaction command or parallel browser files (see [TESTING](docs/TESTING.md)).

## Source map and 90/10 boundary

- `styles/tokens.css` — semantic identity/color, type, spacing and motion tokens.
- `styles/base.css` and `styles/components.css` — stable layout, component, media and accessibility contracts.
- `scripts/` — progressive enhancements for navigation, filters, gallery, FAQ, reveal, video and inquiry validation.
- `assets/diagrams/` — local neutral technical diagrams; `blueprint.json` — descriptive inventory only, never the sole oracle or a generator input.
- `tools/serve.mjs` — read-only static serving; `tests/` — fixed structural, server and browser contracts.

Approximately 90% is stable: semantic shell, recipes, token roles, responsive/accessibility behavior, progressive enhancement, fallback states and the honest RFQ boundary. Approximately 10% is editable: identity, semantic token values, approved copy/navigation, catalog/service facts, proof, local media, direct channels, legal URLs and configured form transport. Adapt only from verified sources; see [ADAPTATION](docs/ADAPTATION.md) and [BOSTOIDE_ADAPTER](docs/BOSTOIDE_ADAPTER.md).

## Publication limits

Every page is intentionally `noindex,nofollow` in this seed. Decide indexation, canonical URLs and any post-adaptation JSON-LD deliberately after real identity, proof, legal text and publication review; do not infer approval from this repository. Visible `[[...]]`, `[SUBSTITUIR]` and `[A CONFIRMAR]` markers identify missing client facts and must be replaced or removed using approved sources before publication. The inquiry form validates locally and dispatches `seed:inquiry-submit`; it does not send, confirm success, price, establish compatibility or promise a response.

Read [TESTING](docs/TESTING.md) for safe validation boundaries and [REFERENCE_ATTRIBUTION](docs/REFERENCE_ATTRIBUTION.md) for read-only provenance boundaries.
