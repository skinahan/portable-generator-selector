# Load wattage provenance

Values in `loads.json` are **representative planning numbers** for sizing — not surveyed measurements of every appliance SKU.

They are grounded in DOE Energy Saver guidance ranges and common residential backup-sizing practice. Each load also carries `sourceUrl` / `sourceLabel` in JSON.

Central air conditioning is intentionally excluded from the catalog.

| Load | Running W | Starting W | Source label (in catalog) |
| --- | ---: | ---: | --- |
| Refrigerator | 700 | 2200 | DOE Energy Saver — appliances (representative range) |
| Freezer | 600 | 1800 | DOE Energy Saver — appliances (representative range) |
| Lights | 200 | 200 | DOE Energy Saver — LED lighting |
| Router/modem | 20 | 20 | DOE Energy Saver — electronics (representative) |
| Television | 150 | 150 | DOE Energy Saver — electronics (representative) |
| Gas-furnace blower | 600 | 1750 | DOE Energy Saver — furnaces (blower motor range) |
| Sump pump | 800 | 2150 | DOE Energy Saver — storm preparedness (pump loads) |
| Well pump | 1000 | 3000 | DOE Energy Saver — storm preparedness (pump loads) |
| Window AC | 1200 | 3600 | DOE Energy Saver — room air conditioners |
| Microwave | 1000 | 1000 | DOE Energy Saver — appliances (representative) |

Re-verify wattages against nameplates when expanding the catalog or changing sizing assumptions.
