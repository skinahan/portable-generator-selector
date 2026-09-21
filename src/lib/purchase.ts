import type { Generator } from '../types/catalog'
import { affiliateConfigFromEnv, primaryRetailerLink } from './affiliate'

/**
 * Primary purchase URL for a generator. Resolves to a tagged retailer link
 * when affiliate identifiers are configured at build time, otherwise to the
 * manufacturer page exactly as before.
 */
export function buildPurchaseUrl(generator: Generator): string {
  return primaryRetailerLink(generator, affiliateConfigFromEnv()).url
}
