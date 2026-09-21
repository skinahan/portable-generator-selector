#!/usr/bin/env node
/**
 * Generates static guide and comparison pages into dist/guides after the Vite
 * build. Pages are derived entirely from the audited catalog in data/, use the
 * same sizing rule as the app (20% headroom, one motor starts at a time), and
 * carry retailer links that are tagged only when affiliate identifiers are
 * present in the build environment:
 *
 *   VITE_AMAZON_ASSOCIATES_TAG
 *   VITE_HOME_DEPOT_LINK_TEMPLATE   (must contain the literal token {url})
 *
 * Without those variables the pages link to manufacturer pages only and carry
 * no affiliate disclosure.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const SITE = process.env.VITE_SITE_URL || 'https://portable-generator-selector.vercel.app'
const SAFETY_MARGIN = 0.2
const CPSC_URL =
  'https://www.cpsc.gov/Newsroom/News-Releases/2026/CPSC-Warns-of-Generator-Carbon-Monoxide-and-Fire-Hazards-Ahead-of-Hurricane-Season'

const affiliate = {
  amazonTag: (process.env.VITE_AMAZON_ASSOCIATES_TAG || '').trim() || undefined,
  homeDepotLinkTemplate:
    (process.env.VITE_HOME_DEPOT_LINK_TEMPLATE || '').trim() || undefined,
}
const affiliateEnabled = Boolean(affiliate.amazonTag || affiliate.homeDepotLinkTemplate)

const generators = JSON.parse(await readFile(path.join(ROOT, 'data/generators.json'), 'utf8'))
const loads = JSON.parse(await readFile(path.join(ROOT, 'data/loads.json'), 'utf8'))
const loadById = new Map(loads.map((l) => [l.id, l]))

// ---------- sizing (mirrors src/engine/sizing.ts) ----------
function sizeBundle(selections) {
  let running = 0
  let largestDelta = 0
  let governing = null
  for (const { loadId, quantity } of selections) {
    const load = loadById.get(loadId)
    if (!load) throw new Error(`Unknown load ${loadId}`)
    running += load.runningWatts * quantity
    const delta = load.startingWatts - load.runningWatts
    if (delta > largestDelta) {
      largestDelta = delta
      governing = load
    }
  }
  return {
    running: Math.ceil(running * (1 + SAFETY_MARGIN)),
    starting: Math.ceil((running + largestDelta) * (1 + SAFETY_MARGIN)),
    governing,
  }
}

function fits(generator, sizing, fuel = 'gasoline') {
  const mode = generator[fuel]
  if (!mode) return false
  return mode.runningWatts >= sizing.running && mode.startingWatts >= sizing.starting
}

// ---------- retailer links (mirrors src/lib/affiliate.ts) ----------
function searchQuery(g) {
  return `${g.brand} ${g.model} portable generator`
}
function amazonUrl(g) {
  const asin = g.retailers?.amazonAsin
  const base = asin
    ? `https://www.amazon.com/dp/${encodeURIComponent(asin)}`
    : `https://www.amazon.com/s?k=${encodeURIComponent(searchQuery(g))}`
  if (!affiliate.amazonTag) return { url: base, tagged: false }
  return {
    url: `${base}${base.includes('?') ? '&' : '?'}tag=${encodeURIComponent(affiliate.amazonTag)}`,
    tagged: true,
  }
}
function homeDepotUrl(g) {
  const target =
    g.retailers?.homeDepotUrl ??
    `https://www.homedepot.com/s/${encodeURIComponent(searchQuery(g))}`
  const t = affiliate.homeDepotLinkTemplate
  if (!t || !t.includes('{url}')) return { url: target, tagged: false }
  return { url: t.replace('{url}', encodeURIComponent(target)), tagged: true }
}
function retailerLinks(g) {
  const links = [
    { retailer: 'amazon', label: 'Amazon', ...amazonUrl(g) },
    { retailer: 'home-depot', label: 'The Home Depot', ...homeDepotUrl(g) },
  ].filter((l) => l.tagged)
  links.push({ retailer: 'manufacturer', label: 'Manufacturer page', url: g.purchaseUrl, tagged: false })
  return links
}

// ---------- scenarios ----------
const SCENARIOS = [
  {
    slug: 'refrigerator-and-freezer-outage-kit',
    title: 'Generators that can run a refrigerator and a freezer',
    intro:
      'The most common outage goal: keep food cold. The startup surge of the compressor dominates sizing, so a small generator that "should" cover the running watts often stalls on startup.',
    selections: [
      { loadId: 'refrigerator', quantity: 1 },
      { loadId: 'freezer', quantity: 1 },
      { loadId: 'lights', quantity: 1 },
      { loadId: 'router', quantity: 1 },
    ],
  },
  {
    slug: 'sump-pump-backup-generators',
    title: 'Generators sized for a sump pump plus refrigerator',
    intro:
      'Basement flooding is the outage failure with the highest repair bill. This bundle covers a sump pump, a refrigerator, and lights.',
    selections: [
      { loadId: 'sump_pump', quantity: 1 },
      { loadId: 'refrigerator', quantity: 1 },
      { loadId: 'lights', quantity: 1 },
    ],
  },
  {
    slug: 'winter-furnace-blower-backup',
    title: 'Generators for a gas-furnace blower in winter',
    intro:
      'A gas furnace still needs electricity for the blower and controls. This bundle keeps heat, a refrigerator, lights, and internet running.',
    selections: [
      { loadId: 'gas_furnace_blower', quantity: 1 },
      { loadId: 'refrigerator', quantity: 1 },
      { loadId: 'lights', quantity: 1 },
      { loadId: 'router', quantity: 1 },
    ],
  },
  {
    slug: 'well-pump-generators',
    title: 'Generators that can start a well pump',
    intro:
      'Well pumps have a large starting surge and usually need 240V. This is the bundle most likely to rule out small inverter units.',
    selections: [
      { loadId: 'well_pump', quantity: 1 },
      { loadId: 'refrigerator', quantity: 1 },
      { loadId: 'lights', quantity: 1 },
    ],
    requireVoltage: 240,
  },
  {
    slug: 'window-ac-summer-backup',
    title: 'Generators for a window air conditioner in summer',
    intro:
      'Window AC units draw hard on startup. This bundle covers one window AC, a refrigerator, and lights.',
    selections: [
      { loadId: 'window_ac', quantity: 1 },
      { loadId: 'refrigerator', quantity: 1 },
      { loadId: 'lights', quantity: 1 },
    ],
  },
  {
    slug: 'rv-30-amp-generators',
    title: 'Portable generators with a 30A RV outlet (TT-30R)',
    intro:
      'For RV hookups the outlet matters as much as the watts. These catalog units carry a TT-30R receptacle.',
    selections: [
      { loadId: 'microwave', quantity: 1 },
      { loadId: 'lights', quantity: 1 },
      { loadId: 'television', quantity: 1 },
    ],
    requireOutlet: 'TT-30R',
  },
  {
    slug: 'quiet-inverter-generators',
    title: 'Quiet inverter generators for essentials',
    intro:
      'Inverter units run quieter and produce cleaner power for electronics. This page lists the inverter models in the catalog with published noise figures.',
    selections: [
      { loadId: 'refrigerator', quantity: 1 },
      { loadId: 'lights', quantity: 1 },
      { loadId: 'router', quantity: 1 },
    ],
    requireInverter: true,
  },
  {
    slug: 'dual-fuel-generators-under-1000',
    title: 'Dual-fuel (gasoline + propane) generators under $1,000',
    intro:
      'Propane stores indefinitely and is easier to keep on hand than gasoline. These catalog units run on either fuel and list at under $1,000.',
    selections: [
      { loadId: 'refrigerator', quantity: 1 },
      { loadId: 'lights', quantity: 1 },
    ],
    requireDualFuel: true,
    maxPrice: 1000,
  },
]

// ---------- html helpers ----------
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const usd = (n) => `$${Number(n).toLocaleString('en-US')}`
const fmt = (n) => Number(n).toLocaleString('en-US')

const CSS = `
:root{--bg:#f7f7f5;--surface:#fff;--ink:#1c1c1a;--muted:#5c5c56;--accent:#0b5f4b;--border:#d8d8d2;--radius:.75rem}
*{box-sizing:border-box}body{margin:0;font-family:"Source Sans 3","Segoe UI",sans-serif;color:var(--ink);background:var(--bg);line-height:1.5}
main{max-width:64rem;margin:0 auto;padding:2.5rem 1.5rem 3.5rem}h1,h2,h3{font-family:"Fraunces","Iowan Old Style",Palatino,serif;font-weight:600;letter-spacing:-.02em}
h1{font-size:clamp(1.75rem,4vw,2.4rem);line-height:1.15;margin:0 0 1rem}a{color:var(--accent)}.muted{color:var(--muted)}
.brand{font-family:"Fraunces",serif;color:var(--accent);margin:0 0 2.5rem;font-size:1.05rem}.brand a{text-decoration:none}
table{width:100%;border-collapse:collapse;margin:1.5rem 0;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
th,td{padding:.6rem .75rem;text-align:left;border-bottom:1px solid var(--border);vertical-align:top}th{font-weight:600;background:#eef3f0}
.btn{display:inline-block;padding:.6rem 1rem;border-radius:.5rem;background:var(--accent);color:#fff;text-decoration:none;font-weight:600}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:1.5rem;margin:1rem 0}
.disclosure,.safety,.credibility{font-size:.9rem;color:var(--muted);max-width:46rem}.safety{margin-top:2.5rem;padding-top:1.5rem;border-top:1px solid var(--border)}
.cta{margin:2rem 0}.grid{display:grid;gap:1rem;grid-template-columns:1fr}@media(min-width:720px){.grid{grid-template-columns:1fr 1fr}}
footer{max-width:64rem;margin:0 auto;padding:0 1.5rem 2rem;font-size:.9rem;color:var(--muted)}
`

function disclosureHtml() {
  if (!affiliateEnabled) return ''
  return `<p class="disclosure"><strong>Disclosure:</strong> some links on this page are retailer affiliate links. If you buy through them, we may earn a commission at no extra cost to you. Rankings come from published specifications, not from which retailer pays.${
    affiliate.amazonTag ? ' As an Amazon Associate we earn from qualifying purchases.' : ''
  }</p>`
}

function safetyHtml() {
  return `<aside class="safety" aria-label="Generator safety"><h2>Generator safety</h2><p>Operate portable generators outdoors only, at least 20 feet from homes and buildings, with exhaust directed away from windows, doors, and vents. Never operate one inside a home, garage, basement, crawlspace, shed, or other enclosed area, even with doors or windows open. Never connect a portable generator to a household receptacle to power home wiring; home-wiring connections require appropriate transfer equipment. Follow the manufacturer's instructions.</p><p><a href="${CPSC_URL}" rel="noopener noreferrer" target="_blank">Generator safety guidance — U.S. CPSC</a></p></aside>`
}

function linksHtml(g) {
  return retailerLinks(g)
    .map(
      (l) =>
        `<a href="${esc(l.url)}" target="_blank" rel="${l.tagged ? 'noopener noreferrer sponsored' : 'noopener noreferrer'}" data-retailer="${l.retailer}">${esc(l.label)}</a>`,
    )
    .join(' · ')
}

function page({ title, description, canonicalPath, body }) {
  const canonical = `${SITE}${canonicalPath}`
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — Portable Generator Selector</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Source+Sans+3:wght@400;600&display=swap" rel="stylesheet">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:type" content="article">
<style>${CSS}</style>
</head>
<body>
<main>
<p class="brand"><a href="/">Portable Generator Selector</a> · <a href="/guides/">Guides</a></p>
${body}
<p class="credibility">Specifications are copied from manufacturer product pages or official operator manuals; prices are approximate retail ballparks for ranking only, not live quotes. Verify appliance starting requirements and manufacturer data before purchase. Audit dates are listed per model.</p>
${safetyHtml()}
${disclosureHtml()}
</main>
<footer><a href="/">Run the selector</a> · <a href="/guides/">All guides</a></footer>
</body>
</html>
`
}

// ---------- per-generator pages ----------
function generatorBody(g) {
  const gas = g.gasoline
  const lp = g.propane
  const rows = SCENARIOS.map((s) => {
    const sizing = sizeBundle(s.selections)
    const ok =
      fits(g, sizing, 'gasoline') &&
      (!s.requireVoltage || g.voltages.includes(s.requireVoltage)) &&
      (!s.requireOutlet || g.outlets.includes(s.requireOutlet))
    return `<tr><td><a href="/guides/${s.slug}/">${esc(s.title)}</a></td><td>${fmt(sizing.running)} W / ${fmt(sizing.starting)} W</td><td>${ok ? 'Yes' : 'No'}</td></tr>`
  }).join('')

  const specs = [
    gas ? `<li>Gasoline: ${fmt(gas.runningWatts)} running / ${fmt(gas.startingWatts)} starting watts</li>` : '',
    lp ? `<li>Propane: ${fmt(lp.runningWatts)} running / ${fmt(lp.startingWatts)} starting watts</li>` : '',
    `<li>Fuel: ${g.fuelTypes.join(' + ')}${g.inverter ? ' · Inverter' : ''}</li>`,
    `<li>Voltage: ${g.voltages.join('/')}V · Outlets: ${g.outlets.join(', ')}</li>`,
    g.runtimeHours ? `<li>Runtime: about ${g.runtimeHours} h at ${g.runtimeLoadPercent ?? 50}% load (manufacturer figure)</li>` : '',
    g.noiseDb ? `<li>Noise: ${g.noiseDb} dB (manufacturer figure)</li>` : '',
    g.weightLb ? `<li>Weight: ${g.weightLb} lb</li>` : '',
    `<li>Approximate price: ${usd(g.approximatePriceUsd)}</li>`,
    `<li>Specs audited: ${g.auditedAt} · <a href="${esc(g.manufacturerUrl)}" rel="noopener noreferrer" target="_blank">manufacturer source</a></li>`,
  ]
    .filter(Boolean)
    .join('')

  return `
<h1>${esc(g.brand)} ${esc(g.model)}: what it can run during an outage</h1>
<p class="muted">Sizing uses the same rule as the selector: sum running watts, add the single largest startup surge, then apply 20% headroom.</p>
<div class="card"><h2>Specifications</h2><ul>${specs}</ul><p>Where to buy: ${linksHtml(g)}</p></div>
<h2>Household bundles this unit covers</h2>
<table><thead><tr><th>Bundle</th><th>Required running / starting</th><th>Fits on gasoline</th></tr></thead><tbody>${rows}</tbody></table>
<p class="cta"><a class="btn" href="/">Size your own outage load</a></p>
`
}

// ---------- scenario pages ----------
function scenarioBody(s) {
  const sizing = sizeBundle(s.selections)
  const candidates = generators
    .filter((g) => fits(g, sizing, 'gasoline'))
    .filter((g) => !s.requireVoltage || g.voltages.includes(s.requireVoltage))
    .filter((g) => !s.requireOutlet || g.outlets.includes(s.requireOutlet))
    .filter((g) => !s.requireInverter || g.inverter)
    .filter((g) => !s.requireDualFuel || (g.gasoline && g.propane))
    .filter((g) => !s.maxPrice || g.approximatePriceUsd < s.maxPrice)
    .sort((a, b) => a.approximatePriceUsd - b.approximatePriceUsd)

  const bundle = s.selections
    .map(({ loadId, quantity }) => {
      const l = loadById.get(loadId)
      return `<li>${quantity > 1 ? `${quantity} × ` : ''}${esc(l.name)}: ${fmt(l.runningWatts)} W running, ${fmt(l.startingWatts)} W starting</li>`
    })
    .join('')

  const rows = candidates.length
    ? candidates
        .map((g) => {
          const gas = g.gasoline
          return `<tr><td><a href="/guides/${g.id}/">${esc(g.brand)} ${esc(g.model)}</a></td><td>${fmt(gas.runningWatts)} / ${fmt(gas.startingWatts)} W</td><td>${g.fuelTypes.join(' + ')}${g.inverter ? ', inverter' : ''}</td><td>${g.outlets.join(', ')}</td><td>${usd(g.approximatePriceUsd)}</td><td>${linksHtml(g)}</td></tr>`
        })
        .join('')
    : `<tr><td colspan="6">No unit in the current catalog meets this bundle's requirements.</td></tr>`

  return `
<h1>${esc(s.title)}</h1>
<p class="muted">${esc(s.intro)}</p>
<div class="card"><h2>The bundle</h2><ul>${bundle}</ul>
<p>Required after 20% headroom: <strong>${fmt(sizing.running)} W running</strong> and <strong>${fmt(sizing.starting)} W starting</strong>${sizing.governing ? ` (startup governed by the ${esc(sizing.governing.name.toLowerCase())})` : ''}.${s.requireVoltage ? ` Requires ${s.requireVoltage}V output.` : ''}${s.requireOutlet ? ` Requires a ${s.requireOutlet} outlet.` : ''}</p></div>
<h2>Catalog units that qualify, cheapest first</h2>
<table><thead><tr><th>Model</th><th>Gasoline running / starting</th><th>Fuel</th><th>Outlets</th><th>Approx. price</th><th>Where to buy</th></tr></thead><tbody>${rows}</tbody></table>
<p class="cta"><a class="btn" href="/">Not your exact appliances? Size your own load</a></p>
`
}

// ---------- index ----------
function indexBody() {
  const scenarioList = SCENARIOS.map((s) => `<li><a href="/guides/${s.slug}/">${esc(s.title)}</a></li>`).join('')
  const genList = generators
    .slice()
    .sort((a, b) => a.approximatePriceUsd - b.approximatePriceUsd)
    .map((g) => `<li><a href="/guides/${g.id}/">${esc(g.brand)} ${esc(g.model)}</a> <span class="muted">· about ${usd(g.approximatePriceUsd)}</span></li>`)
    .join('')
  return `
<h1>Portable generator guides and comparisons</h1>
<p class="muted">Every page is generated from the same audited catalog and sizing rule the selector uses. Start with a household bundle, or look up a specific model.</p>
<div class="grid">
<div class="card"><h2>By what you need to run</h2><ul>${scenarioList}</ul></div>
<div class="card"><h2>By model</h2><ul>${genList}</ul></div>
</div>
<p class="cta"><a class="btn" href="/">Run the selector for your own appliances</a></p>
`
}

// ---------- write ----------
async function write(rel, html) {
  const file = path.join(DIST, rel, 'index.html')
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, html)
}

const urls = ['/', '/guides/']
await write('guides', page({
  title: 'Portable generator guides and comparisons',
  description: 'Which portable generators can run a refrigerator, sump pump, furnace blower, well pump, or window AC, sized with 20% headroom from manufacturer specifications.',
  canonicalPath: '/guides/',
  body: indexBody(),
}))

for (const s of SCENARIOS) {
  const sizing = sizeBundle(s.selections)
  await write(`guides/${s.slug}`, page({
    title: s.title,
    description: `${s.intro.split('.')[0]}. Requires about ${fmt(sizing.running)} W running and ${fmt(sizing.starting)} W starting after 20% headroom.`,
    canonicalPath: `/guides/${s.slug}/`,
    body: scenarioBody(s),
  }))
  urls.push(`/guides/${s.slug}/`)
}

for (const g of generators) {
  await write(`guides/${g.id}`, page({
    title: `${g.brand} ${g.model}: what it can run`,
    description: `${g.brand} ${g.model} specifications (${fmt(g.gasoline?.runningWatts ?? 0)} running / ${fmt(g.gasoline?.startingWatts ?? 0)} starting watts on gasoline) and the household outage bundles it covers.`,
    canonicalPath: `/guides/${g.id}/`,
    body: generatorBody(g),
  }))
  urls.push(`/guides/${g.id}/`)
}

const today = new Date().toISOString().slice(0, 10)
await writeFile(
  path.join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`,
)
await writeFile(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`)

console.log(
  `guides: wrote ${urls.length - 1} pages (${SCENARIOS.length} bundles, ${generators.length} models) · affiliate ${affiliateEnabled ? 'tagged' : 'untagged'}`,
)
