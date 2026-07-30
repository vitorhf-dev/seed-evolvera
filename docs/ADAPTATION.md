# Adaptation guide

This is the authoritative handoff for adapting the persistent static blueprint. Keep the checked-in HTML/CSS/JS as the canonical source. Do not introduce a CMS, template include, custom-element shell, build step or runtime generator to perform this work.

## Stable 90% / editable 10%

The stable 90% is the semantic shell and page recipes: landmarks, one `h1`, heading order, navigation/current-page behavior, token roles and contrast, spacing/grid/breakpoints, 44px controls, progressive enhancement, no-JS content, reduced-motion behavior, local-resource boundary, media fallbacks, filter/gallery/FAQ states and the honest inquiry boundary.

The editable 10% is the approved identity and content: `[[...]]` identity tokens, semantic token values, page copy and navigation labels, catalog/service/specification data, verified proof and documents, local media plus factual alt/captions/posters, direct channels, legal URLs/consent and a configured form transport. Replace only with a source, owner and review date. Keep `[SUBSTITUIR]`, `[A CONFIRMAR]` and `[[...]]` visible in blueprint mode; never smooth an unverified claim into plausible copy.

### Source and publication audit

Before publication, record source and owner for every factual item:

- identity, offer, catalog families, material/dimension/tolerance/treatment data and service scope;
- sectors, territories, capacity, dates, metrics, standards, certifications, cases, testimonials and documents;
- local image/video/diagram provenance, intrinsic dimensions, factual alt, caption and poster;
- email, telephone, hours, privacy/terms text, consent, retention and the actual form transport.

Do not publish leadership, compatibility, availability, stock, pricing, performance, capacity, turnaround, certification or customer claims without evidence. An absent proof item is removed or remains an explicit verification slot. The contact page must still say that this baseline validates in the browser and does not send or confirm success. `seed:inquiry-submit` is the integration seam; its event is not transport.

## Page, component and runtime map

| Route/file | Fixed recipe (`data-component`) | Adaptable material |
|---|---|---|
| `/` / `index.html` | `hero`, `proof-rail`, `route-choice`, `catalog-families`, `technical-fit`, `sectors`, `process`, `evidence`, `faq`, `cta` | identity/category, family and capability slots, approved process/proof/context copy and local media choices |
| `/empresa/` / `empresa/index.html` | `hero`, `profile`, `principles`, `process`, `sectors`, `evidence`, `faq-cta`, `cta` | factual role, operating scope, principles, service contexts, evidence and legal/contact content |
| `/catalogo/` / `catalogo/index.html` | `hero`, `filter`, `catalog-grid`, `selection-help`, `process-faq`, `cta` | taxonomy, family data, labels, factual metadata and detail destinations |
| `/catalogo/solucao-exemplo/` / `catalogo/solucao-exemplo/index.html` | `hero`, `fit-limits`, `specifications`, `gallery`, `process-documents`, `related`, `faq-cta`, `cta` | product name/slug, fit and limits, specifications, verified media/documents and related links |
| `/servicos/capacidade-exemplo/` / `servicos/capacidade-exemplo/index.html` | `hero`, `scope-exclusions`, `process`, `technical-inputs`, `evidence`, `sectors`, `faq-cta`, `cta` | capability scope, exclusions, inputs, method/evidence and verified contexts |
| `/contato/` / `contato/index.html` | `hero`, `form-direct-channels`, `next-steps`, `checklist-faq` | direct channels, approved legal/consent text and later transport integration |

Stable component families are `site-shell`, `hero`, `proof-rail`, `cards`, `split-feature`, `sectors`, `process`, `specifications`, `gallery`, `faq`, `cta` and `inquiry-form`. The browser entry is `scripts/main.js`; its local modules are `mobile-nav.js`, `scroll-lock.js`, `catalog-filter.js`, `gallery.js`, `faq.js`, `reveal.js`, `video.js` and `inquiry-form.js`. Preserve fail-open behavior and the native fallback of each module.

## Media contracts

Choose one controlled mode per media-bearing component. Use only checked-in local paths and facts about the asset.

### `media-rich`

A verified local asset fills the prescribed region. Keep intrinsic dimensions, a meaningful alt/caption and a `data-gallery-item` or component-specific hook when interactive. For a local video, provide a factual poster and visible controls; never make critical copy depend on autoplay.

```html
<figure class="media-rich">
  <img src="assets/diagrams/material-stack.svg" width="800" height="520"
       alt="[[Descrição factual do material ou produto mostrado]]">
  <figcaption>[[Legenda factual; fonte e data quando necessário]]</figcaption>
</figure>
```

### `media-light`

Use one verified local inset, with a caption and generous surrounding content. Do not duplicate one asset to suggest a gallery.

```html
<figure class="media-light">
  <img src="../../assets/diagrams/dimension-guide.svg" width="800" height="520"
       alt="[[Relação técnica factual mostrada no diagrama]]">
  <figcaption>[[Legenda, unidade e fonte]]</figcaption>
</figure>
```

### `no-media`

Remove the figure from layout and accessibility flow; expand copy/data or retain a purposeful technical field. Do not leave an empty placeholder, broken image or “imagem em breve”. The current shell uses the editorial fallback:

```html
<section class="hero hero--editorial no-media" data-component="hero">
  <div class="hero-media hero-media--editorial technical-field" aria-hidden="true">
    <p class="index">01 / 06</p>
    <p>[[CONTEÚDO TÉCNICO A SUBSTITUIR]]</p>
  </div>
</section>
```

### Hero variants

The allowed variants are exactly `hero-media--image`, `hero-media--video`, `hero-media--product` or `hero-media--diagram`, and `hero-media--editorial` for the no-media baseline. Use a factual local asset and preserve the hero copy-first order.

```html
<!-- image: a supplied local image replaces this explicit editable path -->
<div class="hero-media hero-media--image media-rich">
  <img src="../../assets/[[MIDIA.IMAGEM]]" width="[[LARGURA]]" height="[[ALTURA]]" alt="[[Alt factual]]">
</div>

<!-- local video: supplied local file and poster, muted, controls, no remote source -->
<div class="hero-media hero-media--video media-rich">
  <video controls muted playsinline preload="metadata"
         poster="../../assets/[[MIDIA.POSTER]]" width="[[LARGURA]]" height="[[ALTURA]]">
    <source src="../../assets/[[MIDIA.VIDEO]]" type="video/mp4">
  </video>
</div>

<!-- product or diagram: local supplied render or one checked-in diagram -->
<div class="hero-media hero-media--product media-light">
  <img src="../../assets/[[MIDIA.PRODUTO]]" width="[[LARGURA]]" height="[[ALTURA]]" alt="[[Produto mostrado, sem alegar desempenho]]">
</div>
<div class="hero-media hero-media--diagram media-light">
  <img src="../../assets/diagrams/material-stack.svg" width="800" height="520" alt="[[Relações dimensionais fornecidas]]">
</div>

<!-- editorial no-media: the default when no verified media exists -->
<div class="hero-media hero-media--editorial technical-field" aria-hidden="true">
  <p class="index">01 / 06</p>
  <p>[[FAMÍLIAS / CAPACIDADES A SUBSTITUIR]]</p>
</div>
```

The sample paths above are contracts, not files to invent: create a path only when the asset is supplied and tested. A failed or unapproved asset falls back to `no-media`. Respect `prefers-reduced-motion`; video must not be necessary for understanding and must retain controls. Use `data-gallery-section`, `data-gallery-item` and `data-gallery-image` only for an actual local gallery, with captions, dialog labels and keyboard/close behavior preserved.

## Controlled page and section changes

1. Start from the matching six-file recipe and preserve the shell, `data-component` names, `main#conteudo`, one `h1`, landmarks, noindex policy and depth-correct local links.
2. Replace a token or section only after its source/proof audit. Keep the section order in the recipe unless an approved adaptation decision explains the new order; do not broad-search/replace route paths.
3. For an optional section, remove the complete section and its navigation/CTA references when there is no source. Do not leave empty frames or dead links. Required shell, hero, fit/context, process/limits and inquiry expectation sections remain unless the adapted journey is explicitly reviewed.
4. When adding a page, copy the closest complete HTML page as a local starting point, adapt every relative path from its directory depth, add the route to navigation only if it is real, and give it a unique fixed recipe. When removing a page, remove links and contextual query paths, then verify every remaining local resource and route.
5. Update `blueprint.json` descriptively, the fixed structural inventory and any browser journey together. The manifest is never the sole oracle: the HTML, filesystem and tests must independently agree.
6. Re-run the read-only structure/server checks, then the serial browser checks. Review the source fingerprint and `git diff --check` before publication.

### Six-file shell checklist

Update and review every exact file—never implement a client-side include or generated shell:

- [ ] `index.html`
- [ ] `empresa/index.html`
- [ ] `catalogo/index.html`
- [ ] `catalogo/solucao-exemplo/index.html`
- [ ] `servicos/capacidade-exemplo/index.html`
- [ ] `contato/index.html`

For each file preserve `<!-- SHELL:HEADER START -->` / `END`, `<!-- SHELL:FOOTER START -->` / `END`, the skip link, `main#conteudo`, semantic header/footer, desktop and native `<details class="mobile-nav">` navigation, exactly one current-page link per navigation copy, the matching relative CSS/module paths, `lang="pt-BR"`, one `h1` and the seed `noindex,nofollow` until publication review. Update route labels/hrefs consistently in desktop nav, mobile nav and footer; then check all six files as a set.

### Relative-depth matrix

| File | CSS/token paths | Runtime entry | Home path | Catalog path | Contact path |
|---|---|---|---|---|---|
| `index.html` | `styles/...` | `scripts/main.js` | `index.html` | `catalogo/index.html` | `contato/index.html` |
| `empresa/index.html` | `../styles/...` | `../scripts/main.js` | `../index.html` | `../catalogo/index.html` | `../contato/index.html` |
| `catalogo/index.html` | `../styles/...` | `../scripts/main.js` | `../index.html` | `../catalogo/index.html` | `../contato/index.html` |
| `catalogo/solucao-exemplo/index.html` | `../../styles/...` | `../../scripts/main.js` | `../../index.html` | `../../catalogo/index.html` | `../../contato/index.html` |
| `servicos/capacidade-exemplo/index.html` | `../../styles/...` | `../../scripts/main.js` | `../../index.html` | `../../catalogo/index.html` | `../../contato/index.html` |
| `contato/index.html` | `../styles/...` | `../scripts/main.js` | `../index.html` | `../catalogo/index.html` | `../contato/index.html` |

Audit every `href`, `src`, `poster` and form action after moving a file. Keep resources local; a relative path must resolve to a checked-in file.

## Publication decision

The seed remains `noindex,nofollow`. Before changing it, approve identity, metadata, canonical URL, legal/privacy text, contact, proof and local asset review. Decide separately whether a post-adaptation JSON-LD block is warranted: the seed emits no schema; add only factual `Organization`/`WebSite`/`Product` data with an owner and source, and do not add `FAQPage`, ratings, offers, availability or certifications merely because a recipe contains an FAQ or placeholder. Re-run metadata, route, source, accessibility and legal audits after that decision.
