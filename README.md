# Portable Generator Selector

**MYR-RA-001** — Buy Once vertical (Sprint 0).

> Tell us what you need to keep running during an outage. We'll find the generators that actually fit.

**Live:** https://portable-generator-selector.vercel.app/

Client-side React + TypeScript + Vite app. Deterministic sizing and recommendations; no backend, auth, or LLM in v0.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Serve the production build |
| `npm test` | Run Vitest |

## Layout

```text
data/                 Load + generator JSON catalog
src/types/            Shared TypeScript types
src/engine/           Sizing + recommendation
src/components/       Questionnaire + results UI
src/lib/              Answer mapping, analytics, purchase URL seam
```

## Status

Sprint 0 published: public selector with CPSC-aligned safety copy, spot-audited catalog rows, and outbound-click instrumentation (`@vercel/analytics` events).

Hosted on **Vercel**. GitHub Pages remains a fallback at https://skinahan.github.io/portable-generator-selector/. Custom domain deferred.
