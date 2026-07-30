# Testing and safety boundary

These checks validate a checked-in static tree. They do not generate, rewrite, install into the product, seed data or contact an external service.

## Prerequisites and boundaries

- Node.js 20 or newer is required by `package.json`.
- The browser suites use the checked-in Playwright dev dependency. Install dependencies in the normal workspace before browser validation; viewing the pages and the structural/server source checks do not require an install beyond Node.
- The server binds one run-owned ephemeral `127.0.0.1` port, serves only contained files, and accepts only `GET` and `HEAD`. Structural/server validation has `NO_STATEFUL_RESOURCES`: there is no database, cache, queue, bucket, external API, migration, seed, cleanup hook or write method. It reads canonical files and closes the server in `finally`.
- Browser tests route requests to loopback and abort non-loopback requests. They use run-owned browser contexts and close the browser/server. There is no network fallback, analytics, storage, form submission or source-write hook.

## Safe command order

Use the package scripts, not ad hoc globs:

```sh
npm run test:structure
npm run test:browser
npm run test
npm run check
```

`test` and `check` run the fixed structural/server surface first, then the browser surface. All test surfaces use `--test-concurrency=1`. Browser surfaces use `--max-old-space-size=768`. The focused interaction surface remains available:

```sh
npm run test:interactions
```

It is also serial and memory-capped. Do **not** replace these commands with `node --test tests/*.test.mjs`, parallel browser files, one Chromium process per interaction test, or an uncapped direct interaction command. A prior malformed assertion serialized a `JSHandle` and caused a worker to approach 2 GiB; serial execution and the browser heap cap are part of the contract. The repaired interaction run has recorded RSS receipts of approximately 148–163 MB with an unchanged boot ID.

For additional operational containment, an orchestrator may run the same package command inside a cgroup with a documented memory limit and record the process/cgroup identity. That cgroup is optional containment, not a replacement for the package heap cap or serial order.

## What each surface proves

`test:structure` compares fixed route, section, module, shell, depth-correct resource, metadata, token/color and package inventories against actual files. It independently checks the descriptive manifest, active documentation for removed generator/config instructions, local-resource closure, lock consistency and required guide/resource existence. `test:server` is available for the server portion when needed.

`test:browser` runs the foundation and interaction journeys at 390, 768 and 1440 widths, with JavaScript-disabled fallbacks, reduced motion, keyboard/focus, navigation, filter, gallery, FAQ, video and inquiry states. It checks local-only requests and the no-transport form boundary. Browser completion is not implied by a structure pass.

Before and after loopback requests, the server suite fingerprints canonical HTML, CSS, JS, local assets, `blueprint.json`, documentation and `package.json` bytes. A changed fingerprint is a failure: serving a page must not mutate the source tree. `git diff --check` and a package-lock no-diff check are additional delivery gates.

## Reporting an unavailable browser surface

If Playwright cannot run safely or the monitored environment has no approved containment, run only the permitted static/structural checks and report:

> Browser surface: **UNVERIFIED** — not run because [specific environment/safety reason]. `test:structure` result: [result].

Do not call an unverified browser or aggregate `test`/`check` a pass. The orchestrator owns monitored full validation and should record command, Node/Playwright versions, RSS/boot-ID receipt, cgroup status when used, teardown result and the exact commit/tree fingerprint. Never loosen the heap cap, concurrency, network block or source-fingerprint oracle to obtain a pass.

## No-source-write guarantee

The server and browser suites are read-only with respect to canonical source. A test must not write HTML/CSS/JS/assets/manifest/docs/package or create `dist/`; generated reports, caches and temporary artifacts are outside the product tree. If a fingerprint changes unexpectedly, stop mutating commands and diagnose read-only. Do not restore, reseed, retry or clean a suspected shared resource from this workflow.
