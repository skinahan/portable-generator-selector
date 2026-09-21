import { describe, expect, it } from 'vitest'
import type { Generator } from '../types/catalog'
import {
  affiliateEnabled,
  amazonUrl,
  buildRetailerLinks,
  homeDepotUrl,
  primaryRetailerLink,
} from './affiliate'

const generator: Generator = {
  id: 'champion-201505',
  brand: 'Champion',
  model: '201505 5500W Dual Fuel',
  fuelTypes: ['gasoline', 'propane'],
  gasoline: { runningWatts: 5500, startingWatts: 6875 },
  propane: { runningWatts: 5000, startingWatts: 6250 },
  inverter: false,
  voltages: [120, 240],
  outlets: ['5-20R', 'L14-30R'],
  approximatePriceUsd: 799,
  manufacturerUrl: 'https://example.com/mfr',
  purchaseUrl: 'https://example.com/buy',
  auditedAt: '2026-08-12',
}

describe('affiliate link layer', () => {
  it('returns only the manufacturer link when nothing is configured', () => {
    const links = buildRetailerLinks(generator, {})
    expect(links).toEqual([
      {
        retailer: 'manufacturer',
        label: 'Manufacturer page',
        url: 'https://example.com/buy',
        tagged: false,
      },
    ])
    expect(primaryRetailerLink(generator, {}).url).toBe('https://example.com/buy')
    expect(affiliateEnabled({})).toBe(false)
  })

  it('builds a tagged Amazon search link from brand and model', () => {
    const { url, tagged } = amazonUrl(generator, 'silverrook-20')
    expect(tagged).toBe(true)
    expect(url).toBe(
      'https://www.amazon.com/s?k=Champion%20201505%205500W%20Dual%20Fuel%20portable%20generator&tag=silverrook-20',
    )
  })

  it('prefers a verified ASIN when present', () => {
    const withAsin: Generator = {
      ...generator,
      retailers: { amazonAsin: 'B0EXAMPLE1' },
    }
    expect(amazonUrl(withAsin, 'silverrook-20').url).toBe(
      'https://www.amazon.com/dp/B0EXAMPLE1?tag=silverrook-20',
    )
  })

  it('wraps the Home Depot target in the Impact template', () => {
    const template = 'https://homedepot.sjv.io/c/1/2/8154?u={url}'
    const { url, tagged } = homeDepotUrl(
      { ...generator, retailers: { homeDepotUrl: 'https://www.homedepot.com/p/123' } },
      template,
    )
    expect(tagged).toBe(true)
    expect(url).toBe(
      'https://homedepot.sjv.io/c/1/2/8154?u=https%3A%2F%2Fwww.homedepot.com%2Fp%2F123',
    )
  })

  it('ignores a Home Depot template without the {url} token', () => {
    const { url, tagged } = homeDepotUrl(generator, 'https://homedepot.sjv.io/c/1/2/8154')
    expect(tagged).toBe(false)
    expect(url.startsWith('https://www.homedepot.com/s/')).toBe(true)
  })

  it('puts tagged retailers first and the manufacturer last', () => {
    const links = buildRetailerLinks(generator, {
      amazonTag: 'silverrook-20',
      homeDepotLinkTemplate: 'https://homedepot.sjv.io/c/1/2/8154?u={url}',
    })
    expect(links.map((link) => link.retailer)).toEqual([
      'amazon',
      'home-depot',
      'manufacturer',
    ])
    expect(links[0].tagged).toBe(true)
    expect(links[2].tagged).toBe(false)
  })

  it('drops an unconfigured retailer but keeps the configured one first', () => {
    const links = buildRetailerLinks(generator, { amazonTag: 'silverrook-20' })
    expect(links.map((link) => link.retailer)).toEqual(['amazon', 'manufacturer'])
  })
})
