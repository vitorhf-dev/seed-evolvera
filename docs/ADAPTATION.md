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
| `/servicos/servico-exemplo/` / `servicos/servico-exemplo/index.html` | `hero`, `scope-exclusions`, `process`, `technical-inputs`, `evidence`, `sectors`, `faq-cta`, `cta` | capability scope, exclusions, inputs, method/evidence and verified contexts |
| `/contato/` / `contato/index.html` | `hero`, `form-direct-channels`, `next-steps`, `checklist-faq` | direct channels, approved legal/consent text and later transport integration |

Stable component families are `site-shell`, `hero`, `proof-rail`, `cards`, `split-feature`, `sectors`, `process`, `specifications`, `gallery`, `faq`, `cta` and `inquiry-form`. The browser entry is `scripts/main.js`; its local modules are `mobile-nav.js`, `scroll-lock.js`, `catalog-filter.js`, `gallery.js`, `faq.js`, `reveal.js`, `video.js` and `inquiry-form.js`. Preserve fail-open behavior and the native fallback of each module.

### Density contract

`sectors` ships two densities and the choice comes from the evidence, not from the layout. Use `.sector` inside `.grid` when each item carries distinct verified copy. Use `.sector-list` — a wrapping list of labels — when the items carry only a name, or when the set is large enough that one card per item would read as filler rather than as information. Both keep the 44px target and the accent dot, so the two densities read as one family.

Never repeat an identical supporting sentence or call-to-action label across sibling items: state it once in the section lead and drop it from the items.

The same rule decides the card itself. In a repeated sibling family, a shared call-to-action, a shared eyebrow/kicker, a decorative media/plate/mark, or a generic one-line sentence is not card-worthy content: it is chrome repeated N times, and it does not turn a shallow item into a card. Count only what differs between the siblings. Keep cards when each item carries real distinct content — the route-choice and catalog/product families stay cards — and move shallow families to a compact list such as `.sector-list`, with one shared section call-to-action instead of one per item.

A card carries exactly one resting boundary: the raised shadow, on every stage, tinted or not. Its border stays transparent at rest and returns on hover and focus, where it reports state. Process steps follow the same law. Do not nest a second boundary inside a card either: a decorative wrapper placed directly in a card keeps its background and spacing but not its own border or shadow.

## Media contracts

Choose the media mode from the verified assets actually supplied, never from a layout wish. Media is optional: the canonical seed state is `no-media`, and the Home copy is complete without a client image or video. Use only checked-in local paths and facts about the asset. Preserve the existing 90% shell, local-only boundary, captions/alt text and no-invented-facts rules.

### `media-rich`

A verified local image fills the prescribed hero or component frame. Keep intrinsic dimensions, factual alt text, a caption when the image carries meaning, and a `data-gallery-item` or component-specific hook when interactive. Hero images use a fixed-ratio frame with `object-fit: cover`: 4:3 from the desktop media breakpoint and 16:9 below it, so unusual source proportions crop cleanly rather than stretch or letterbox. A supplied image below the approved intrinsic-width threshold belongs in the contained product treatment instead of being upscaled.

```html
<figure class="media-rich">
  <img src="assets/diagrams/material-stack.svg" width="640" height="420"
       alt="[[Descrição factual do material ou produto mostrado]]">
  <figcaption>[[Legenda factual; fonte e data quando necessário]]</figcaption>
</figure>
```

### `media-light`

Use one verified local product render or technical diagram as a contained object on a deliberate plate, with inner breathing room, factual alt text and a caption/source slot for diagrams. Product plates use a 4:3 frame; diagram plates use 16:10. Do not duplicate one asset to suggest a gallery, and do not add a media column when the asset is absent.

```html
<figure class="media-light">
  <img src="../../assets/diagrams/dimension-guide.svg" width="640" height="420"
       alt="[[Relação técnica factual mostrada no diagrama]]">
  <figcaption>[[Legenda, unidade e fonte]]</figcaption>
</figure>
```

### `no-media`

This is the default and canonical hero state, and it is **copy-only**. The `.hero-grid` carries exactly one direct child: the copy block. No media column is reserved at any width. Below 1024px the copy fills the full grid width; from 1024px it is capped at the `--reading` measure (720px) and centered with automatic inline margins. The text itself stays left-aligned — only the block moves.

Forbidden in this state, at any width: an editorial index rail, a decorative ordinal such as `01 / 06`, a placeholder or “imagem em breve” label, a broken or invented image, a boxed `technical-field` balancing field, and any reserved or empty second column. The section-level `technical-field` utility may still provide a low-contrast atmospheric rule field, but it must never create a media slot. No client image or video asset is needed for this state.

```html
<section class="hero hero--editorial no-media" data-component="hero">
  <div class="container hero-grid">
    <div>
      <!-- breadcrumb? → eyebrow → h1 → lead → hero-facts? → actions → trust cue -->
      [[COPY-FIRST HERO CONTENT]]
    </div>
  </div>
</section>
```

`editorial-no-media` in `blueprint.json` (`mediaContracts.heroVariants` and `defaultHeroVariant`) is the stable identifier of this copy-only baseline, not an instruction to author a rail. The `.hero-media--editorial` CSS class is legacy compatibility vocabulary for adaptations that still carry it; it is not exempt from `.hero.no-media` hiding and must not appear in canonical seed markup.

### Hero variants

The canonical baseline has no `hero-media` child at all. When verified local media is supplied, the allowed variants are exactly `hero-media--image`, `hero-media--video`, `hero-media--product` and `hero-media--diagram`; `hero-media--editorial` remains only as legacy compatibility vocabulary and is never added to new markup. Keep the DOM copy-first order on every variant: `breadcrumb?` → `eyebrow` → `h1` → `lead` → `hero-facts?` → `actions` → trust cue → `hero-media`. The media follows the trust cue on mobile as well as in source order, so the headline, lead, action and honesty cue never depend on it.

```html
<!-- supplied image: fixed-ratio cover frame; width/height prevent layout shift -->
<div class="hero-media hero-media--image media-rich">
  <img src="../../assets/[[MIDIA.IMAGEM]]" width="[[LARGURA]]" height="[[ALTURA]]" alt="[[Alt factual]]">
</div>

<!-- optional local video: poster and controls are required; never autoplay or use a remote source -->
<div class="hero-media hero-media--video media-rich">
  <video controls muted playsinline preload="metadata"
         poster="../../assets/[[MIDIA.POSTER]]" width="[[LARGURA]]" height="[[ALTURA]]">
    <source src="../../assets/[[MIDIA.VIDEO]]" type="video/mp4">
  </video>
</div>

<!-- contained product or diagram plate; diagram needs a factual caption/source -->
<div class="hero-media hero-media--product media-light">
  <img src="../../assets/[[MIDIA.PRODUTO]]" width="[[LARGURA]]" height="[[ALTURA]]" alt="[[Produto mostrado, sem alegar desempenho]]">
</div>
<figure class="hero-media hero-media--diagram media-light">
  <img src="../../assets/diagrams/material-stack.svg" width="640" height="420" alt="[[Relações técnicas fornecidas]]">
  <figcaption>[[Legenda, unidade e fonte]]</figcaption>
</figure>
```

All sample paths are contracts, not files to invent: create a path only when the asset is supplied, approved and tested. The optional local video requires a factual poster, `controls`, `muted`, `playsinline` and `preload="metadata"`; it is never required for understanding. If that video is poster-less or errors, the existing fail-open behavior hides the video and stamps `no-media` on its `.hero-media` wrapper. CSS removes the wrapper from layout and the hero stays a single-column editorial composition; no empty frame or reserved grid cell remains. Missing or unapproved images are not replaced with invented assets or placeholders. All hero variants cover `img`, `picture`, `svg` and `video` consistently. Respect `prefers-reduced-motion`. Use `data-gallery-section`, `data-gallery-item` and `data-gallery-image` only for an actual local gallery, with captions, dialog labels and keyboard/close behavior preserved.

## Controlled page and section changes

1. Start from the matching six-file recipe and preserve the shell, `data-component` names, `main#conteudo`, one `h1`, landmarks, noindex policy and depth-correct local links.
2. Replace a token or section only after its source/proof audit. Keep the section order in the recipe unless an approved adaptation decision explains the new order; do not broad-search/replace route paths.
3. For an optional section, remove the complete section and its navigation/CTA references when there is no source. Do not leave empty frames or dead links. Required shell, hero, fit/context, process/limits and inquiry expectation sections remain unless the adapted journey is explicitly reviewed.
4. When adding a page, copy the closest complete HTML page as a local starting point, adapt every relative path from its directory depth, add the route to navigation only if it is real, and give it a unique fixed recipe. When removing a page, remove links and contextual query paths, then verify every remaining local resource and route.
5. Update `blueprint.json` descriptively, the fixed structural inventory and any browser journey together. The manifest is never the sole oracle: the HTML, filesystem and tests must independently agree.
6. Re-run the read-only structure/server checks, then the serial browser checks. Review the source fingerprint and `git diff --check` before publication.

The default `.section-head` stays a two-column split (4fr/8fr from 768px). The optional `section-head--stacked` modifier is opt-in per section: it collapses that one head to a single track so its description reads below the heading on the same left edge. It exists for a single reading block — the canonical Home route-choice section is the intentional example — and is never applied globally or used to restyle every header.

### Navigation, catalog rail, RFQ, and resource omission rules

- Keep the desktop header nav grouped and bounded as a secondary surface with one `aria-current` page, and keep one pill-shaped primary header CTA.
- Add in-page quick links only when a verified adapted Home is genuinely long and has real targets; do not make them a canonical seed component.
- On catalog, keep enhanced filter controls and the no-JS fallback navigation, including fail-open states and exact hidden/empty behavior.
- Catalog RFQ actions stay generic (`../contato/`) with no invented query context; contextual queries are only for explicit product/service detail mappings.
- Add media/document links only for checked-in local files; omit unverified resources rather than inventing placeholders.


### Six-file shell checklist

Update and review every exact file—never implement a client-side include or generated shell:

- [ ] `index.html`
- [ ] `empresa/index.html`
- [ ] `catalogo/index.html`
- [ ] `catalogo/solucao-exemplo/index.html`
- [ ] `servicos/servico-exemplo/index.html`
- [ ] `contato/index.html`

For each file preserve `<!-- SHELL:HEADER START -->` / `END`, `<!-- SHELL:FOOTER START -->` / `END`, the skip link, `main#conteudo`, semantic header/footer, desktop and native `<details class="mobile-nav">` navigation, exactly one current-page link per navigation copy, the matching relative CSS/module paths, `lang="pt-BR"`, one `h1` and the seed `noindex,nofollow` until publication review. Update route labels/hrefs consistently in desktop nav, mobile nav and footer; then check all six files as a set.

### Relative-depth matrix

| File | CSS/token paths | Runtime entry | Home path | Catalog path | Contact path |
|---|---|---|---|---|---|
| `index.html` | `styles/...` | `scripts/main.js` | `index.html` | `catalogo/index.html` | `contato/index.html` |
| `empresa/index.html` | `../styles/...` | `../scripts/main.js` | `../index.html` | `../catalogo/index.html` | `../contato/index.html` |
| `catalogo/index.html` | `../styles/...` | `../scripts/main.js` | `../index.html` | `../catalogo/index.html` | `../contato/index.html` |
| `catalogo/solucao-exemplo/index.html` | `../../styles/...` | `../../scripts/main.js` | `../../index.html` | `../../catalogo/index.html` | `../../contato/index.html` |
| `servicos/servico-exemplo/index.html` | `../../styles/...` | `../../scripts/main.js` | `../../index.html` | `../../catalogo/index.html` | `../../contato/index.html` |
| `contato/index.html` | `../styles/...` | `../scripts/main.js` | `../index.html` | `../catalogo/index.html` | `../contato/index.html` |

Audit every `href`, `src`, `poster` and form action after moving a file. Keep resources local; a relative path must resolve to a checked-in file.

## Publication decision

The seed remains `noindex,nofollow`. Before changing it, approve identity, metadata, canonical URL, legal/privacy text, contact, proof and local asset review. Decide separately whether a post-adaptation JSON-LD block is warranted: the seed emits no schema; add only factual `Organization`/`WebSite`/`Product` data with an owner and source, and do not add `FAQPage`, ratings, offers, availability or certifications merely because a recipe contains an FAQ or placeholder. Re-run metadata, route, source, accessibility and legal audits after that decision.
