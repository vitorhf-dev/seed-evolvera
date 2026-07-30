# Bostoide adapter seam

Bostoide consumes this repository as a persistent static blueprint. The supported operation is a local copy of the Home page plus the complete local dependency closure needed to open it. It does not invoke a renderer, read a site configuration, run a generator, or copy reference material to obtain canonical HTML.

## Copy boundary

For the Home starting point, copy `index.html` and resolve every owned local dependency from its actual references:

- `styles/tokens.css`, `styles/base.css`, `styles/components.css`;
- `scripts/main.js` and all imported local modules: `mobile-nav.js`, `scroll-lock.js`, `catalog-filter.js`, `gallery.js`, `faq.js`, `reveal.js`, `video.js`, `inquiry-form.js`;
- `assets/diagrams/material-stack.svg`, `assets/diagrams/dimension-guide.svg` and `assets/diagrams/process-map.svg` when the copied page or an adapted page references them;
- any local media deliberately added during adaptation, together with its poster, dimensions, alt/caption and the section hook that consumes it.

The dependency closure is byte-level local source plus the files referenced by `href`, `src`, `poster`, imports and links. Do not copy `node_modules` into a site output. The static page remains usable without JavaScript; retain the HTML, CSS and native fallbacks even when a browser enhancement is not copied for a page that does not use it.

## Adaptation order

1. Copy Home and its complete closure to the destination while preserving the relative directory relationship.
2. Adapt `[[EMPRESA.NOME]]`, `[[EMPRESA.CATEGORIA]]`, approved identity tokens, copy, navigation labels and factual local assets. Keep the semantic token roles; do not replace colors by arbitrary selectors.
3. Add or copy the relevant page recipes only when the adapted journey needs them: Company, Catalog, Solution, Capability and Contact. For each new depth, recalculate every relative CSS, script, media and navigation path.
4. Replace product/service data, proof, specifications, sectors, direct channels, legal text and media only from approved sources. Remove unsupported sections rather than filling them with invented facts.
5. Preserve the six-file shell checklist, section `data-component` hooks, local-only resource policy, `noindex,nofollow` seed status and the form boundary until publication review.
6. Run the fixed structural/server checks and the serial browser checks against the adapted tree. A copy is not complete if a resource resolves only because a manifest, configuration or development fallback hides a broken path.

## Explicit non-goals

- Do not invoke a renderer, generator, CLI, build/export step or configuration-to-site pipeline.
- Do not add a schema/config/data model as a prerequisite for copying or viewing the blueprint.
- Do not copy HTML, CSS, JavaScript, prompts, assets, screenshots, names, claims or implementation from the repositories listed in `docs/REFERENCE_ATTRIBUTION.md`; those references are read-only attribution anchors, not dependencies.
- Do not copy the blueprint manifest as if it were canonical source. `blueprint.json` describes the checked-in site; HTML, local resources and fixed tests remain the independent evidence.
- Do not add remote fonts, images, scripts, analytics, transport, CMS, CRM, database, authentication, checkout or deployment behavior to make the adapter work.

## Form seam

The copied inquiry form is intentionally local-only. On a valid form, `scripts/inquiry-form.js` dispatches one bubbling, non-cancelable `CustomEvent` named `seed:inquiry-submit` on the form. Its exact detail shape is:

```js
{
  values: {
    inquiryType, name, company, email, phone, reference,
    application, material, dimensions, standards, quantity, message
  },
  context: null | {
    type: "produto" | "servico",
    reference: "[[PRODUTO.SLUG]]" | "[[SERVICO.SLUG]]",
    label: "[[PRODUTO.NOME]]" | "[[SERVICO.NOME]]"
  }
}
```

The event is an integration seam, not evidence of delivery. Until a separately configured and tested channel owns the transport, preserve fields, show the neutral pending message and do not claim success. A Bostoide adaptation may attach an approved handler at that bubbling point, but it must supply its own privacy, consent, error, retry, retention and delivery contract; none is assumed here.
