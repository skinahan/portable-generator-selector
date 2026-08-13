import { describe, expect, it } from 'vitest'
import { sizeLoads } from './sizing'

describe('sizeLoads', () => {
  it('Case A — resistive loads only: lights + router have no startup delta', () => {
    const result = sizeLoads([
      { loadId: 'lights', quantity: 1 },
      { loadId: 'router', quantity: 1 },
    ])

    expect(result.baseRunningWatts).toBe(220)
    expect(result.largestStartingDeltaWatts).toBe(0)
    expect(result.rawStartingRequirementWatts).toBe(220)
    expect(result.recommendedRunningWatts).toBe(264)
    expect(result.recommendedStartingWatts).toBe(264)
    expect(result.safetyMargin).toBe(0.2)
    expect(result.governingLoad).toBeUndefined()
  })

  it('Case B — refrigerator dominates startup over lights + router', () => {
    const result = sizeLoads([
      { loadId: 'refrigerator', quantity: 1 },
      { loadId: 'lights', quantity: 1 },
      { loadId: 'router', quantity: 1 },
    ])

    expect(result.baseRunningWatts).toBe(920)
    expect(result.largestStartingDeltaWatts).toBe(1500)
    expect(result.rawStartingRequirementWatts).toBe(2420)
    expect(result.recommendedRunningWatts).toBe(1104)
    expect(result.recommendedStartingWatts).toBe(2904)
    expect(result.governingLoad).toEqual({
      loadId: 'refrigerator',
      name: 'Refrigerator',
      startingDeltaWatts: 1500,
    })
  })

  it('Case C — multiple motors: only the largest startup delta is added', () => {
    const result = sizeLoads([
      { loadId: 'refrigerator', quantity: 1 },
      { loadId: 'gas_furnace_blower', quantity: 1 },
      { loadId: 'sump_pump', quantity: 1 },
    ])

    // Deltas: fridge 1500, furnace 1150, sump 1350 → fridge governs
    expect(result.baseRunningWatts).toBe(2100)
    expect(result.largestStartingDeltaWatts).toBe(1500)
    expect(result.rawStartingRequirementWatts).toBe(3600)
    expect(result.recommendedRunningWatts).toBe(2520)
    expect(result.recommendedStartingWatts).toBe(4320)
    expect(result.governingLoad?.loadId).toBe('refrigerator')
  })

  it('Case D — quantities: 2× refrigerator doubles running, not startup delta (one-at-a-time)', () => {
    const result = sizeLoads([{ loadId: 'refrigerator', quantity: 2 }])

    expect(result.baseRunningWatts).toBe(1400)
    expect(result.largestStartingDeltaWatts).toBe(1500)
    expect(result.rawStartingRequirementWatts).toBe(2900)
    expect(result.recommendedRunningWatts).toBe(1680)
    expect(result.recommendedStartingWatts).toBe(3480)
    expect(result.breakdown[0]?.runningContributionWatts).toBe(1400)
  })

  it('Case D — duplicate loadIds normalize by summing quantities', () => {
    const result = sizeLoads([
      { loadId: 'refrigerator', quantity: 1 },
      { loadId: 'refrigerator', quantity: 1 },
    ])

    expect(result.baseRunningWatts).toBe(1400)
    expect(result.largestStartingDeltaWatts).toBe(1500)
    expect(result.breakdown).toHaveLength(1)
    expect(result.breakdown[0]?.quantity).toBe(2)
  })

  it('Case E — rejects unknown load id', () => {
    expect(() =>
      sizeLoads([{ loadId: 'central_air', quantity: 1 }]),
    ).toThrow(/unknown load id/i)
  })

  it('Case E — rejects quantity < 1', () => {
    expect(() =>
      sizeLoads([{ loadId: 'lights', quantity: 0 }]),
    ).toThrow(/invalid quantity/i)
  })

  it('Case E — rejects non-integer quantity', () => {
    expect(() =>
      sizeLoads([{ loadId: 'lights', quantity: 1.5 }]),
    ).toThrow(/invalid quantity/i)
  })

  it('Case E — rejects empty selections', () => {
    expect(() => sizeLoads([])).toThrow(/empty/i)
  })
})
