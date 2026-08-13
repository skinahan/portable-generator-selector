import defaultLoads from '../../data/loads.json'
import type { Load } from '../types/catalog'

/**
 * Deterministic outage-load sizing.
 *
 * v0 assumption: when quantity > 1 for a motor load, running watts scale by
 * quantity, but only **one unit starts at a time**. The startup delta added to
 * base running load is therefore for a single unit of the governing load
 * (`startingWatts - runningWatts`), never `quantity × delta`.
 */

export interface SelectedLoad {
  loadId: string
  quantity: number
}

export interface SizingResult {
  baseRunningWatts: number
  largestStartingDeltaWatts: number
  rawStartingRequirementWatts: number
  recommendedRunningWatts: number
  recommendedStartingWatts: number
  safetyMargin: number
  governingLoad?: {
    loadId: string
    name: string
    startingDeltaWatts: number
  }
  breakdown: Array<{
    loadId: string
    name: string
    quantity: number
    runningWatts: number
    startingWatts: number
    runningContributionWatts: number
  }>
}

export interface SizeLoadsOptions {
  loads?: Load[]
  safetyMargin?: number
}

const catalogLoads = defaultLoads as Load[]

function normalizeSelections(selections: SelectedLoad[]): SelectedLoad[] {
  const merged = new Map<string, number>()
  for (const selection of selections) {
    const previous = merged.get(selection.loadId) ?? 0
    merged.set(selection.loadId, previous + selection.quantity)
  }
  return [...merged.entries()].map(([loadId, quantity]) => ({ loadId, quantity }))
}

function assertValidSelections(
  selections: SelectedLoad[],
  loadById: Map<string, Load>,
): void {
  if (selections.length === 0) {
    throw new Error('selections must not be empty')
  }

  for (const selection of selections) {
    if (!Number.isInteger(selection.quantity) || selection.quantity < 1) {
      throw new Error(
        `invalid quantity for load "${selection.loadId}": expected integer >= 1, got ${selection.quantity}`,
      )
    }
    if (!loadById.has(selection.loadId)) {
      throw new Error(`unknown load id: ${selection.loadId}`)
    }
  }
}

export function sizeLoads(
  selections: SelectedLoad[],
  options: SizeLoadsOptions = {},
): SizingResult {
  const loads = options.loads ?? catalogLoads
  const safetyMargin = options.safetyMargin ?? 0.2
  const loadById = new Map(loads.map((load) => [load.id, load]))

  const normalized = normalizeSelections(selections)
  assertValidSelections(normalized, loadById)

  const breakdown: SizingResult['breakdown'] = []
  let baseRunningWatts = 0
  let largestStartingDeltaWatts = 0
  let governingLoad: SizingResult['governingLoad']

  for (const selection of normalized) {
    const load = loadById.get(selection.loadId)!
    const runningContributionWatts = load.runningWatts * selection.quantity
    baseRunningWatts += runningContributionWatts

    // One unit starts at a time — do not multiply delta by quantity.
    const startingDeltaWatts = load.startingWatts - load.runningWatts
    if (
      governingLoad === undefined ||
      startingDeltaWatts > largestStartingDeltaWatts
    ) {
      largestStartingDeltaWatts = startingDeltaWatts
      governingLoad = {
        loadId: load.id,
        name: load.name,
        startingDeltaWatts,
      }
    }

    breakdown.push({
      loadId: load.id,
      name: load.name,
      quantity: selection.quantity,
      runningWatts: load.runningWatts,
      startingWatts: load.startingWatts,
      runningContributionWatts,
    })
  }

  const rawStartingRequirementWatts =
    baseRunningWatts + largestStartingDeltaWatts
  const factor = 1 + safetyMargin

  return {
    baseRunningWatts,
    largestStartingDeltaWatts,
    rawStartingRequirementWatts,
    recommendedRunningWatts: Math.ceil(baseRunningWatts * factor),
    recommendedStartingWatts: Math.ceil(rawStartingRequirementWatts * factor),
    safetyMargin,
    governingLoad:
      largestStartingDeltaWatts > 0 ? governingLoad : undefined,
    breakdown,
  }
}
