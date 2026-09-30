# AGENTS.md — Wyze AI Camera UI System

Rules for any AI coding agent working in this repo. Read this first.

## Read first

- **Smart Cards** (the mobile card feed, detail sheet, suggestions, WYZE AI chat, and anything you
  plug into the real Wyze system): read [`SMART-CARDS-SPEC.md`](SMART-CARDS-SPEC.md) before
  touching code. It is the UI logic and rules contract.
- **v4 design system** (elements, layout, and templates in the other tabs): read
  [`PRODUCTION-MIGRATION.md`](PRODUCTION-MIGRATION.md) and
  [`AI-Camera-Builder-Reference.md`](AI-Camera-Builder-Reference.md).

## Working rules

- The whole mockup is `index.html`. Search by identifier, since line numbers drift.
- Smart Cards rules in the spec are product behavior; values in the `SMART_CARD_*` tables are mock
  data. Don't hard-code mock values into production.
- If you change a rule, update `SMART-CARDS-SPEC.md` and the pinning test in the same change.
- Every animation needs a `prefers-reduced-motion` fallback, and every style needs its
  `body.sc-light-page` counterpart.
- Verify before calling work done:
  ```bash
  node --test tests/smart-card-layout.test.mjs
  node tests/smart-card-pages.e2e.mjs
  node tests/smart-card-feedback.regression-1.e2e.mjs
  ```
- Releases: bump `VERSION`, move `CHANGELOG.md` entries out of Unreleased, and tag `vX.Y.Z`. The
  version label in the app must match `VERSION`, and a test enforces that.
