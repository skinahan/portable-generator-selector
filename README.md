# Portable Generator Selector

> Tell us what you need to keep running during an outage. We'll find the generators that actually fit.

**Live:** https://portable-generator-selector.vercel.app/

A client-side tool that sizes a portable generator from household loads, then recommends units that meet hard capacity and connection constraints. It answers *what size and type fit*, not which brand is vaguely “best.”

## How it works

1. Select appliances (and quantities where allowed).
2. Choose fuel preference, connection style, up to two priorities, and a soft budget band.
3. The app computes running and starting wattage with a 20% margin (one motor starts at a time).
4. It filters the catalog on capacity, dual-fuel when required, and outlet/voltage fit, then returns **Best Fit**, **Best Value**, and **Upgrade** when distinct candidates exist.

Everything runs in the browser: React + TypeScript + Vite. No backend, auth, or LLM.

## Safety

Portable generators produce carbon monoxide. Operate them outdoors only, well away from openings, and never backfeed a home through a household receptacle. Transfer equipment is required for home wiring. See the in-app notice and [U.S. CPSC guidance](https://www.cpsc.gov/Newsroom/News-Releases/2026/CPSC-Warns-of-Generator-Carbon-Monoxide-and-Fire-Hazards-Ahead-of-Hurricane-Season).

Recommendations use published specs and estimated loads — verify appliance starting requirements and manufacturer data before purchase.

## Catalog

| Asset | Count | Notes |
| --- | --- | --- |
| Loads | 10 | Fridge, freezer, lights, router, TV, furnace blower, sump/well pumps, window AC, microwave |
| Generators | 12 | Champion, Westinghouse, Honda — manufacturer-sourced watts/outlets |

Provenance and audit dates:

- [`data/LOADS_PROVENANCE.md`](data/LOADS_PROVENANCE.md)
- [`data/GENERATORS_PROVENANCE.md`](data/GENERATORS_PROVENANCE.md)
- [`docs/README.md`](docs/README.md) — engine and analytics quick reference

Prices are approximate ballparks for ranking only.

## Develop

```bash
npm install
npm run dev
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Serve the production build |
| `npm test` | Vitest (sizing, recommend, UI) |
| `npm run lint` | oxlint |

## Layout

```text
data/                 Load + generator JSON + provenance
src/engine/           Deterministic sizing + recommendation
src/components/       Questionnaire + results UI
src/lib/              Answers, purchase URL seam, analytics events
src/types/            Shared TypeScript contracts
```

## Deploy

Production host is **Vercel** only: https://portable-generator-selector.vercel.app/

Configured via `vercel.json` (Vite / `dist`). Do not re-enable GitHub Pages — analytics and the canonical public URL live on Vercel.

Privacy-light commercial events via `@vercel/analytics`: `selector_started`, `selector_completed`, `recommendation_clicked` (`product_id`, `recommendation_label`). No questionnaire payloads.

## Scope notes

- Central air is intentionally excluded from the load catalog.
- No affiliate network or custom domain in this version.
