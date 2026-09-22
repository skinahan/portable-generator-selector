# Generator catalog provenance

Electrical specifications were copied from **manufacturer product pages or official operator manuals**. Approximate prices are retail ballparks for ranking only and are not live quotes.

| Brand | Model | Manufacturer source | Price source | Audited |
| --- | --- | --- | --- | --- |
| Champion | 201286 3500W | championpowerequipment.com product page | Manufacturer page ballpark | 2026-08-13 |
| Champion | 201267 3550W | championpowerequipment.com product page | Manufacturer page ballpark | 2026-08-12 |
| Champion | 201489 3500W Wireless | championpowerequipment.com product page | Manufacturer page ballpark | 2026-08-12 |
| Westinghouse | WGen3600DFc | Official operator manual PDF | Brand site ballpark | 2026-08-12 |
| Champion | 201213 3500W Dual Fuel | championpowerequipment.com product page | Manufacturer page ballpark | 2026-08-12 |
| Champion | 201505 5500W Dual Fuel | championpowerequipment.com product page | Manufacturer page ballpark | 2026-08-13 (weight 170 lb) |
| Champion | 201463 6250W Dual Fuel | championpowerequipment.com product page | Manufacturer page ballpark | 2026-08-13 (weight 171 lb) |
| Champion | 201281 7500W Dual Fuel | championpowerequipment.com product page | Manufacturer page ballpark | 2026-08-12 |
| Westinghouse | WGen7500DF | Official operator manual PDF | Brand site ballpark | 2026-08-12 |
| Honda | EU2200i | Honda Power Equipment product page (MSRP listed) | Honda MSRP | 2026-08-13 |
| Champion | 201319 4500W DF Inverter | championpowerequipment.com product page | Manufacturer page ballpark | 2026-08-12 |
| Westinghouse | iGen4500DFc | Official operator manual PDF | Brand site ballpark | 2026-08-12 |
| Jackery | Explorer 1000 Plus | jackery.com product page (1264.64 Wh; AC 2000 W rated / 4000 W surge; 32 lb; 3× 120 V AC) | Manufacturer storefront ballpark | 2026-09-22 |
| EcoFlow | DELTA 2 Max | Official user manual (EFD350: 2048 Wh; AC 2400 W / surge 4800 W; ~50 lb) + US product page | Manufacturer storefront ballpark | 2026-09-22 |
| BLUETTI | AC200L | Product page + official user manual PDF (2048 Wh; AC 2400 W total; overload / Power Lifting to 3600 W; 28.3 kg / 62.4 lb; NEMA TT-30) | Manufacturer storefront ballpark | 2026-09-22 |

Optional fields (`noiseDb`, `weightLb`, `runtimeHours`) are omitted when the manufacturer source for that row did not publish them.

Battery tier (`fuelTypes: ["battery"]`) is the indoor-safe, carbon-monoxide-free alternative offered when the selector fuel preference is `battery-indoor-safe`. Capacity is stored as `capacityWh` (Wh rounded to nearest Wh when the manufacturer publishes a fractional figure). Battery `startingWatts` uses the manufacturer surge / short-duration overload rating, not continuous Power Lifting mode marketing alone.

Spot-audit set for publish (watts/outlets re-checked; no ranking-changing wattage drift): `champion-201505`, `champion-201463`, `champion-201286`, `honda-eu2200i`, `jackery-explorer-1000-plus`, `ecoflow-delta-2-max`, `bluetti-ac200l`.
