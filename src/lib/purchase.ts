import type { Generator } from '../types/catalog'

/** Single seam for affiliate/retailer URL swaps later. */
export function buildPurchaseUrl(generator: Generator): string {
  return generator.purchaseUrl
}
