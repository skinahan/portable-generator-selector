import { describe, expect, it } from 'vitest'
import catalog from '../../data/generators.json'
import type { Generator, GeneratorPreferences } from '../types/catalog'
import { recommendGenerators } from './recommend'
import { sizeLoads, type SizingResult } from './sizing'

const realCatalog = catalog as Generator[]

function baseSizing(overrides: Partial<SizingResult> = {}): SizingResult {
  return {
    baseRunningWatts: 2000,
    largestStartingDeltaWatts: 1000,
    rawStartingRequirementWatts: 3000,
    recommendedRunningWatts: 2400,
    recommendedStartingWatts: 3600,
    safetyMargin: 0.2,
    breakdown: [],
    ...overrides,
  }
}

function prefs(
  overrides: Partial<GeneratorPreferences> = {},
): GeneratorPreferences {
  return {
    fuelPreference: 'gasoline-ok',
    connection: 'extension-cords',
    priorities: [],
    ...overrides,
  }
}

function gen(partial: Partial<Generator> & Pick<Generator, 'id' | 'model'>): Generator {
  return {
    brand: 'Fixture',
    fuelTypes: ['gasoline'],
    gasoline: { runningWatts: 5000, startingWatts: 6250 },
    inverter: false,
    voltages: [120],
    outlets: ['5-20R'],
    approximatePriceUsd: 800,
    manufacturerUrl: 'https://example.com/mfr',
    purchaseUrl: 'https://example.com/buy',
    auditedAt: '2026-08-12',
    ...partial,
  }
}

describe('recommendGenerators', () => {
  it('Case A — undersized generator never appears', () => {
    const fixture = [
      gen({
        id: 'too-small',
        model: 'Small',
        gasoline: { runningWatts: 2000, startingWatts: 2500 },
        approximatePriceUsd: 400,
      }),
      gen({
        id: 'ok',
        model: 'OK',
        gasoline: { runningWatts: 5000, startingWatts: 6250 },
        approximatePriceUsd: 900,
      }),
    ]
    const result = recommendGenerators(baseSizing(), prefs(), fixture)
    expect(result.qualifiedCount).toBe(1)
    expect(result.recommendations.map((r) => r.generator.id)).not.toContain(
      'too-small',
    )
    expect(result.recommendations[0]?.generator.id).toBe('ok')
  })

  it('Case B — dual-fuel-required rejects unit that only qualifies on gasoline', () => {
    const fixture = [
      gen({
        id: 'weak-propane',
        model: 'Weak LPG',
        fuelTypes: ['gasoline', 'propane'],
        gasoline: { runningWatts: 5000, startingWatts: 6250 },
        propane: { runningWatts: 2000, startingWatts: 2500 },
        approximatePriceUsd: 700,
      }),
      gen({
        id: 'strong-propane',
        model: 'Strong LPG',
        fuelTypes: ['gasoline', 'propane'],
        gasoline: { runningWatts: 5500, startingWatts: 6875 },
        propane: { runningWatts: 5000, startingWatts: 6250 },
        voltages: [120, 240],
        outlets: ['5-20R', 'L14-30R'],
        approximatePriceUsd: 900,
      }),
    ]
    const result = recommendGenerators(
      baseSizing(),
      prefs({ fuelPreference: 'dual-fuel-required' }),
      fixture,
    )
    expect(result.recommendations.map((r) => r.generator.id)).not.toContain(
      'weak-propane',
    )
    expect(result.recommendations.some((r) => r.generator.id === 'strong-propane')).toBe(
      true,
    )
    expect(
      result.recommendations.every((r) => r.applicableFuel === 'propane'),
    ).toBe(true)
  })

  it('Case C — 120 V-only generator cannot satisfy generator-inlet', () => {
    const fixture = [
      gen({
        id: '120-only',
        model: '120 Only',
        voltages: [120],
        outlets: ['5-20R', 'L5-30R'],
        gasoline: { runningWatts: 5000, startingWatts: 6250 },
      }),
      gen({
        id: 'inlet-ready',
        model: 'Inlet Ready',
        voltages: [120, 240],
        outlets: ['5-20R', 'L14-30R'],
        gasoline: { runningWatts: 5500, startingWatts: 6875 },
        approximatePriceUsd: 950,
      }),
    ]
    const result = recommendGenerators(
      baseSizing(),
      prefs({ connection: 'generator-inlet' }),
      fixture,
    )
    expect(result.recommendations.map((r) => r.generator.id)).not.toContain(
      '120-only',
    )
    expect(result.recommendations[0]?.generator.id).toBe('inlet-ready')
  })

  it('Case D — over-budget unit survives with meetsBudget false and overBudgetByUsd', () => {
    const fixture = [
      gen({
        id: 'pricey',
        model: 'Pricey',
        approximatePriceUsd: 1100,
        gasoline: { runningWatts: 5000, startingWatts: 6250 },
      }),
    ]
    const result = recommendGenerators(
      baseSizing(),
      prefs({ budgetMaxUsd: 900 }),
      fixture,
    )
    expect(result.qualifiedCount).toBe(1)
    const rec = result.recommendations[0]!
    expect(rec.meetsBudget).toBe(false)
    expect(rec.overBudgetByUsd).toBe(200)
    expect(result.warnings).toContain(
      'No generators meeting your electrical requirements were found within your stated budget.',
    )
  })

  it('Case E — cheapest otherwise-qualified product wins Best Value', () => {
    const fixture = [
      gen({
        id: 'cheap',
        model: 'Cheap',
        approximatePriceUsd: 600,
        gasoline: { runningWatts: 6000, startingWatts: 7500 },
      }),
      gen({
        id: 'fit',
        model: 'Fit',
        approximatePriceUsd: 900,
        gasoline: { runningWatts: 5000, startingWatts: 6250 },
      }),
    ]
    const result = recommendGenerators(baseSizing(), prefs(), fixture)
    const bestFit = result.recommendations.find((r) => r.category === 'best-fit')
    const bestValue = result.recommendations.find(
      (r) => r.category === 'best-value',
    )
    expect(bestFit?.generator.id).toBe('fit')
    expect(bestValue?.generator.id).toBe('cheap')
  })

  it('Case F — appropriately sized unit beats a materially oversized one for Best Fit', () => {
    const fixture = [
      gen({
        id: 'near',
        model: 'Near',
        approximatePriceUsd: 900,
        gasoline: { runningWatts: 5000, startingWatts: 6250 },
      }),
      gen({
        id: 'huge',
        model: 'Huge',
        approximatePriceUsd: 800,
        gasoline: { runningWatts: 9500, startingWatts: 12500 },
      }),
    ]
    const result = recommendGenerators(baseSizing(), prefs(), fixture)
    expect(
      result.recommendations.find((r) => r.category === 'best-fit')?.generator.id,
    ).toBe('near')
  })

  it('Case G — upgrade within 1.75× is selected; ridiculous oversizing is excluded', () => {
    const sizing = baseSizing({
      recommendedRunningWatts: 4000,
      recommendedStartingWatts: 5000,
    })
    const fixture = [
      gen({
        id: 'fit',
        model: 'Fit',
        approximatePriceUsd: 700,
        gasoline: { runningWatts: 4500, startingWatts: 5500 },
      }),
      gen({
        id: 'upgrade-ok',
        model: 'Upgrade OK',
        approximatePriceUsd: 900,
        gasoline: { runningWatts: 6000, startingWatts: 7500 },
      }),
      gen({
        id: 'absurd',
        model: 'Absurd',
        approximatePriceUsd: 1200,
        gasoline: { runningWatts: 9500, startingWatts: 12500 },
      }),
    ]
    // 4000 * 1.75 = 7000 → upgrade-ok qualifies, absurd does not
    const result = recommendGenerators(sizing, prefs(), fixture)
    const upgrade = result.recommendations.find((r) => r.category === 'upgrade')
    expect(upgrade?.generator.id).toBe('upgrade-ok')
    expect(result.recommendations.map((r) => r.generator.id)).not.toContain(
      'absurd',
    )
  })

  it('Case H — impossible load returns zero recommendations and a warning without throwing', () => {
    const result = recommendGenerators(
      baseSizing({
        recommendedRunningWatts: 20000,
        recommendedStartingWatts: 30000,
      }),
      prefs(),
      [
        gen({
          id: 'normal',
          model: 'Normal',
          gasoline: { runningWatts: 5000, startingWatts: 6250 },
        }),
      ],
    )
    expect(result.qualifiedCount).toBe(0)
    expect(result.recommendations).toEqual([])
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('Case I — missing noise/weight cannot beat published quieter/lighter unit', () => {
    const fixture = [
      gen({
        id: 'quiet-known',
        model: 'Quiet Known',
        inverter: true,
        noiseDb: 58,
        weightLb: 50,
        approximatePriceUsd: 1000,
        gasoline: { runningWatts: 5000, startingWatts: 6250 },
      }),
      gen({
        id: 'missing-metrics',
        model: 'Missing Metrics',
        inverter: false,
        // no noiseDb / weightLb
        approximatePriceUsd: 900,
        gasoline: { runningWatts: 5000, startingWatts: 6250 },
      }),
    ]
    const result = recommendGenerators(
      baseSizing(),
      prefs({ priorities: ['quiet', 'portability'] }),
      fixture,
    )
    expect(
      result.recommendations.find((r) => r.category === 'best-fit')?.generator.id,
    ).toBe('quiet-known')
  })

  it('rejects more than two priorities', () => {
    expect(() =>
      recommendGenerators(
        baseSizing(),
        prefs({
          priorities: ['quiet', 'runtime', 'lowest-price'],
        }),
        [gen({ id: 'x', model: 'X' })],
      ),
    ).toThrow(/at most two/i)
  })

  it('DoD scenario against real catalog returns qualifying dual-fuel inlet units', () => {
    const sizing = sizeLoads([
      { loadId: 'refrigerator', quantity: 1 },
      { loadId: 'gas_furnace_blower', quantity: 1 },
      { loadId: 'sump_pump', quantity: 1 },
      { loadId: 'lights', quantity: 1 },
      { loadId: 'router', quantity: 1 },
    ])
    expect(sizing.recommendedRunningWatts).toBe(2784)
    expect(sizing.recommendedStartingWatts).toBe(4584)

    const result = recommendGenerators(
      sizing,
      {
        fuelPreference: 'dual-fuel-required',
        connection: 'generator-inlet',
        priorities: ['lowest-price', 'runtime'],
        budgetMaxUsd: 1000,
      },
      realCatalog,
    )

    expect(result.qualifiedCount).toBeGreaterThan(0)
    expect(result.recommendations.length).toBeGreaterThan(0)
    expect(result.recommendations.length).toBeLessThanOrEqual(3)

    for (const rec of result.recommendations) {
      expect(rec.applicableFuel).toBe('propane')
      expect(rec.generator.fuelTypes).toEqual(
        expect.arrayContaining(['gasoline', 'propane']),
      )
      expect(rec.generator.propane!.runningWatts).toBeGreaterThanOrEqual(2784)
      expect(rec.generator.propane!.startingWatts).toBeGreaterThanOrEqual(4584)
      expect(rec.generator.voltages).toEqual(expect.arrayContaining([120, 240]))
      expect(rec.generator.outlets).toContain('L14-30R')
      expect(rec.reasons.length).toBeGreaterThan(0)
    }

    const bestFit = result.recommendations.find((r) => r.category === 'best-fit')
    const bestValue = result.recommendations.find(
      (r) => r.category === 'best-value',
    )
    expect(bestFit?.generator.id).toBe('champion-201505')
    // Best Value is cheapest qualifying — same unit as Best Fit, not a pricier filler.
    expect(bestValue?.generator.id).toBe('champion-201505')
    expect(bestValue?.generator.approximatePriceUsd).toBe(799)
  })

  it('Best Value may equal Best Fit when the closest unit is also cheapest', () => {
    const fixture = [
      gen({
        id: 'winner',
        model: 'Winner',
        approximatePriceUsd: 700,
        gasoline: { runningWatts: 5000, startingWatts: 6250 },
      }),
      gen({
        id: 'pricier-larger',
        model: 'Pricier Larger',
        approximatePriceUsd: 1100,
        gasoline: { runningWatts: 6000, startingWatts: 7500 },
      }),
    ]
    const result = recommendGenerators(baseSizing(), prefs(), fixture)
    expect(
      result.recommendations.find((r) => r.category === 'best-fit')?.generator.id,
    ).toBe('winner')
    expect(
      result.recommendations.find((r) => r.category === 'best-value')
        ?.generator.id,
    ).toBe('winner')
  })
})
