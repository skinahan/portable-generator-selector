import type { Generator } from '../types/catalog'

/**
 * Retailer / affiliate link layer.
 *
 * Every link falls back to an untagged destination when the corresponding
 * partner identifier is not configured, so the app behaves exactly as before
 * until the operator supplies IDs through build-time environment variables.
 *
 *   VITE_AMAZON_ASSOCIATES_TAG        e.g. "silverrook-20"
 *   VITE_HOME_DEPOT_LINK_TEMPLATE     Impact deep-link template containing the
 *                                     literal token {url}, e.g.
 *                                     "https://homedepot.sjv.io/c/1234567/456789/8154?u={url}"
 */

export type RetailerId = 'amazon' | 'home-depot' | 'manufacturer'

export type RetailerLink = {
  retailer: RetailerId
  label: string
  url: string
  /** True when the URL carries a configured affiliate identifier. */
  tagged: boolean
}

export type AffiliateConfig = {
  amazonTag?: string
  homeDepotLinkTemplate?: string
}

function readEnv(name: string): string | undefined {
  const env = (import.meta as unknown as { env?: Record<string, unknown> }).env
  const value = env?.[name]
  return typeof value === 'string' && value.trim() !== ''
    ? value.trim()
    : undefined
}

export function affiliateConfigFromEnv(): AffiliateConfig {
  return {
    amazonTag: readEnv('VITE_AMAZON_ASSOCIATES_TAG'),
    homeDepotLinkTemplate: readEnv('VITE_HOME_DEPOT_LINK_TEMPLATE'),
  }
}

export function affiliateEnabled(config: AffiliateConfig): boolean {
  return Boolean(config.amazonTag || config.homeDepotLinkTemplate)
}

export function searchQuery(generator: Generator): string {
  return `${generator.brand} ${generator.model} portable generator`
}

export function amazonUrl(
  generator: Generator,
  tag: string | undefined,
): { url: string; tagged: boolean } {
  const asin = generator.retailers?.amazonAsin
  const base = asin
    ? `https://www.amazon.com/dp/${encodeURIComponent(asin)}`
    : `https://www.amazon.com/s?k=${encodeURIComponent(searchQuery(generator))}`
  if (!tag) return { url: base, tagged: false }
  const joiner = base.includes('?') ? '&' : '?'
  return { url: `${base}${joiner}tag=${encodeURIComponent(tag)}`, tagged: true }
}

export function homeDepotUrl(
  generator: Generator,
  template: string | undefined,
): { url: string; tagged: boolean } {
  const target =
    generator.retailers?.homeDepotUrl ??
    `https://www.homedepot.com/s/${encodeURIComponent(searchQuery(generator))}`
  if (!template || !template.includes('{url}')) {
    return { url: target, tagged: false }
  }
  return {
    url: template.replace('{url}', encodeURIComponent(target)),
    tagged: true,
  }
}

/**
 * Ordered retailer links for a generator. Tagged links come first so the
 * primary CTA earns when a partner ID is configured; the manufacturer page is
 * always present as the last, untagged option.
 */
export function buildRetailerLinks(
  generator: Generator,
  config: AffiliateConfig,
): RetailerLink[] {
  const amazon = amazonUrl(generator, config.amazonTag)
  const homeDepot = homeDepotUrl(generator, config.homeDepotLinkTemplate)

  const retail: RetailerLink[] = [
    { retailer: 'amazon', label: 'Amazon', ...amazon },
    { retailer: 'home-depot', label: 'The Home Depot', ...homeDepot },
  ]

  const tagged = retail.filter((link) => link.tagged)
  const manufacturer: RetailerLink = {
    retailer: 'manufacturer',
    label: 'Manufacturer page',
    url: generator.purchaseUrl,
    tagged: false,
  }

  // Without any configured partner, keep today's behavior: manufacturer only.
  if (tagged.length === 0) return [manufacturer]
  return [...tagged, manufacturer]
}

export function primaryRetailerLink(
  generator: Generator,
  config: AffiliateConfig,
): RetailerLink {
  return buildRetailerLinks(generator, config)[0]
}
