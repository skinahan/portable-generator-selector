# Docs

| Doc | Purpose |
| --- | --- |
| [../README.md](../README.md) | Product overview, how it works, develop / deploy |
| [../data/LOADS_PROVENANCE.md](../data/LOADS_PROVENANCE.md) | Load wattage sources and planning figures |
| [../data/GENERATORS_PROVENANCE.md](../data/GENERATORS_PROVENANCE.md) | Generator catalog sources and audit dates |

## Engines (quick reference)

**Sizing** (`src/engine/sizing.ts`)

- Sum selected running watts.
- Add the largest single-unit starting delta (one motor at a time).
- Apply 20% headroom via `Math.ceil` to running and starting requirements.

**Recommend** (`src/engine/recommend.ts`)

- Hard filters: capacity on the applicable fuel, dual-fuel when required, connection outlets/voltages.
- Soft: budget band (`meetsBudget` / over-budget amount).
- Categories: Best Fit (closest adequate), Best Value (cheapest qualifying; may equal Best Fit), Upgrade (next step up when useful).

## Analytics events

| Event | When | Props |
| --- | --- | --- |
| `selector_started` | First load selection / continue from loads | — |
| `selector_completed` | Results with ≥1 recommendation | — |
| `recommendation_clicked` | Outbound CTA | `product_id`, `recommendation_label` |

Purchase links go through `buildPurchaseUrl()` in `src/lib/purchase.ts` (currently returns `generator.purchaseUrl`).
