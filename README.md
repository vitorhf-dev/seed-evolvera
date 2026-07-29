# Evolvera Industrial Static Blueprint

Persistent, inspectable six-page HTML/CSS foundation for neutral industrial B2B sites. The repository itself is the site: there is no build step, renderer, template generator, framework, production dependency or form transport.

## Routes

- `/` — Home
- `/empresa/` — Empresa
- `/catalogo/` — Catálogo
- `/catalogo/solucao-exemplo/` — Solução exemplo
- `/servicos/capacidade-exemplo/` — Capacidade exemplo
- `/contato/` — Contato técnico / RFQ

Open any `index.html` directly, or use the dependency-free read-only server:

```sh
npm run serve
npm run check
```

Node 20 or newer is required for local checks. All pages and essential navigation remain usable without JavaScript. The contact form is an inspectable baseline only and does not send data.

> **Publication warning:** visible `[[...]]`, `[SUBSTITUIR]` and `[A CONFIRMAR]` markers identify missing client facts. Replace or remove them using approved sources before publishing. Do not convert proof, technical, contact or legal slots into plausible facts.
