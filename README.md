# Portable Generator Selector

**MYR-RA-001** — Buy Once vertical (Sprint 0 scaffold).

> Tell us what you need to keep running during an outage. We'll find the generators that actually fit.

Client-side React + TypeScript + Vite app. Deterministic sizing and recommendations; no backend, auth, or LLM in v0.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Serve the production build |
| `npm test` | Run Vitest (engine tests land next) |

## Layout

```text
data/                 Load + generator JSON catalog
src/types/            Shared TypeScript types
src/engine/           Sizing + recommendation (stubs for now)
src/components/       UI components (next slices)
```

## Status

Checkpoint 1: repository + scaffold only. Questionnaire, catalog curation, scoring, safety copy, and public deploy follow in later slices.
