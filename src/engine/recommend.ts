import type {
  ConnectionId,
  FuelPreferenceId,
  FuelType,
  Generator,
  GeneratorPreferences,
  PriorityId,
  Recommendation,
  RecommendationResult,
} from '../types/catalog'
import type { SizingResult } from './sizing'

const FUEL_PREFERENCES: FuelPreferenceId[] = [
  'gasoline-ok',
  'dual-fuel-required',
  'no-preference',
]

const CONNECTIONS: ConnectionId[] = [
  'extension-cords',
  'rv-30a',
  'generator-inlet',
  'unsure',
]

const PRIORITIES: PriorityId[] = [
  'lowest-price',
  'quiet',
  'fuel-efficiency',
  'portability',
  'runtime',
  'clean-power',
]

interface QualifiedCandidate {
  generator: Generator
  applicableFuel: FuelType
  runningWatts: number
  startingWatts: number
  capacityWaste: number
  meetsBudget: boolean
  overBudgetByUsd: number
  priorityScore: number
}

function assertPreferences(preferences: GeneratorPreferences): void {
  if (!FUEL_PREFERENCES.includes(preferences.fuelPreference)) {
    throw new Error(`unknown fuelPreference: ${preferences.fuelPreference}`)
  }
  if (!CONNECTIONS.includes(preferences.connection)) {
    throw new Error(`unknown connection: ${preferences.connection}`)
  }
  if (preferences.priorities.length > 2) {
    throw new Error('priorities must contain at most two values')
  }
  const seen = new Set<PriorityId>()
  for (const priority of preferences.priorities) {
    if (!PRIORITIES.includes(priority)) {
      throw new Error(`unknown priority: ${priority}`)
    }
    if (seen.has(priority)) {
      throw new Error(`duplicate priority: ${priority}`)
    }
    seen.add(priority)
  }
}

function resolveApplicableFuel(
  generator: Generator,
  fuelPreference: FuelPreferenceId,
): { fuel: FuelType; runningWatts: number; startingWatts: number } | null {
  const hasGas = generator.fuelTypes.includes('gasoline') && generator.gasoline
  const hasPropane =
    generator.fuelTypes.includes('propane') && generator.propane

  if (fuelPreference === 'dual-fuel-required') {
    if (!hasGas || !hasPropane || !generator.propane) return null
    return {
      fuel: 'propane',
      runningWatts: generator.propane.runningWatts,
      startingWatts: generator.propane.startingWatts,
    }
  }

  if (fuelPreference === 'gasoline-ok') {
    if (!hasGas || !generator.gasoline) return null
    return {
      fuel: 'gasoline',
      runningWatts: generator.gasoline.runningWatts,
      startingWatts: generator.gasoline.startingWatts,
    }
  }

  // no-preference: dual-fuel uses the weaker mode; gas-only uses gasoline
  if (hasGas && hasPropane && generator.gasoline && generator.propane) {
    const gasRank =
      generator.gasoline.runningWatts * 1_000_000 +
      generator.gasoline.startingWatts
    const propaneRank =
      generator.propane.runningWatts * 1_000_000 +
      generator.propane.startingWatts
    if (propaneRank <= gasRank) {
      return {
        fuel: 'propane',
        runningWatts: generator.propane.runningWatts,
        startingWatts: generator.propane.startingWatts,
      }
    }
    return {
      fuel: 'gasoline',
      runningWatts: generator.gasoline.runningWatts,
      startingWatts: generator.gasoline.startingWatts,
    }
  }

  if (hasGas && generator.gasoline) {
    return {
      fuel: 'gasoline',
      runningWatts: generator.gasoline.runningWatts,
      startingWatts: generator.gasoline.startingWatts,
    }
  }

  if (hasPropane && generator.propane) {
    return {
      fuel: 'propane',
      runningWatts: generator.propane.runningWatts,
      startingWatts: generator.propane.startingWatts,
    }
  }

  return null
}

function passesConnection(
  generator: Generator,
  connection: ConnectionId,
): boolean {
  if (connection === 'extension-cords' || connection === 'unsure') return true
  if (connection === 'rv-30a') {
    return (
      generator.outlets.includes('TT-30R') ||
      generator.outlets.includes('L5-30R')
    )
  }
  // generator-inlet
  const has120 = generator.voltages.includes(120)
  const has240 = generator.voltages.includes(240)
  return has120 && has240 && generator.outlets.includes('L14-30R')
}

function budgetFields(
  price: number,
  budgetMaxUsd: number | undefined,
): { meetsBudget: boolean; overBudgetByUsd: number } {
  if (budgetMaxUsd === undefined) {
    return { meetsBudget: true, overBudgetByUsd: 0 }
  }
  if (price <= budgetMaxUsd) {
    return { meetsBudget: true, overBudgetByUsd: 0 }
  }
  return { meetsBudget: false, overBudgetByUsd: price - budgetMaxUsd }
}

function normalizeAscending(
  value: number | undefined,
  knownValues: number[],
): number | null {
  if (value === undefined || knownValues.length === 0) return null
  const min = Math.min(...knownValues)
  const max = Math.max(...knownValues)
  if (min === max) return 1
  // lower is better → invert
  return (max - value) / (max - min)
}

function normalizeDescending(
  value: number | undefined,
  knownValues: number[],
): number | null {
  if (value === undefined || knownValues.length === 0) return null
  const min = Math.min(...knownValues)
  const max = Math.max(...knownValues)
  if (min === max) return 1
  return (value - min) / (max - min)
}

function runtimeProxy(generator: Generator): number | undefined {
  if (
    generator.runtimeHours === undefined ||
    generator.runtimeLoadPercent === undefined
  ) {
    return undefined
  }
  // Higher hours at a stated load fraction → better; normalize by load percent
  return generator.runtimeHours / (generator.runtimeLoadPercent / 100)
}

function priorityScoreFor(
  generator: Generator,
  priorities: PriorityId[],
  qualified: Generator[],
): number {
  if (priorities.length === 0) return 0

  const prices = qualified.map((g) => g.approximatePriceUsd)
  const noises = qualified
    .map((g) => g.noiseDb)
    .filter((n): n is number => n !== undefined)
  const weights = qualified
    .map((g) => g.weightLb)
    .filter((w): w is number => w !== undefined)
  const runtimes = qualified
    .map((g) => runtimeProxy(g))
    .filter((r): r is number => r !== undefined)

  const scores: number[] = []

  for (const priority of priorities) {
    switch (priority) {
      case 'lowest-price': {
        const score = normalizeAscending(generator.approximatePriceUsd, prices)
        if (score !== null) scores.push(score)
        break
      }
      case 'quiet': {
        // Inverter bonus always available; noise only among published ratings
        const parts: number[] = [generator.inverter ? 1 : 0]
        const noiseScore = normalizeAscending(generator.noiseDb, noises)
        if (noiseScore !== null) parts.push(noiseScore)
        scores.push(parts.reduce((a, b) => a + b, 0) / parts.length)
        break
      }
      case 'fuel-efficiency': {
        const parts: number[] = [generator.inverter ? 1 : 0]
        const runtimeScore = normalizeDescending(runtimeProxy(generator), runtimes)
        if (runtimeScore !== null) parts.push(runtimeScore)
        scores.push(parts.reduce((a, b) => a + b, 0) / parts.length)
        break
      }
      case 'portability': {
        const score = normalizeAscending(generator.weightLb, weights)
        if (score !== null) scores.push(score)
        break
      }
      case 'runtime': {
        const score = normalizeDescending(runtimeProxy(generator), runtimes)
        if (score !== null) scores.push(score)
        break
      }
      case 'clean-power': {
        scores.push(generator.inverter ? 1 : 0)
        break
      }
    }
  }

  if (scores.length === 0) return 0
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

function buildReasons(
  candidate: QualifiedCandidate,
  sizing: SizingResult,
  preferences: GeneratorPreferences,
): string[] {
  const g = candidate.generator
  const reasons: string[] = [
    `+ ${candidate.runningWatts - sizing.recommendedRunningWatts} W running headroom`,
    `+ ${candidate.startingWatts - sizing.recommendedStartingWatts} W startup headroom`,
  ]

  if (g.fuelTypes.includes('gasoline') && g.fuelTypes.includes('propane')) {
    reasons.push('+ Supports gasoline and propane')
  } else if (candidate.applicableFuel === 'gasoline') {
    reasons.push('+ Evaluated on gasoline output')
  } else {
    reasons.push('+ Evaluated on propane output (weaker dual-fuel mode)')
  }

  if (preferences.connection === 'generator-inlet') {
    reasons.push('+ 120/240 V + L14-30R matches generator-inlet requirement')
  } else if (preferences.connection === 'rv-30a') {
    reasons.push('+ Includes a 30 A RV-compatible receptacle')
  }

  if (preferences.budgetMaxUsd !== undefined) {
    if (candidate.meetsBudget) {
      reasons.push(
        `+ Within stated $${preferences.budgetMaxUsd.toLocaleString('en-US')} budget`,
      )
    } else {
      reasons.push(
        `+ Exceeds stated budget by $${candidate.overBudgetByUsd.toLocaleString('en-US')}`,
      )
    }
  }

  if (preferences.priorities.includes('clean-power') && g.inverter) {
    reasons.push('+ Inverter output preferred for clean power')
  }
  if (preferences.priorities.includes('quiet') && g.inverter) {
    reasons.push('+ Inverter platform favors quieter operation')
  }
  if (
    preferences.priorities.includes('runtime') &&
    g.runtimeHours !== undefined
  ) {
    reasons.push(
      `+ Published runtime about ${g.runtimeHours} h at ${g.runtimeLoadPercent}% load`,
    )
  }

  return reasons
}

function toRecommendation(
  category: Recommendation['category'],
  candidate: QualifiedCandidate,
  sizing: SizingResult,
  preferences: GeneratorPreferences,
): Recommendation {
  return {
    category,
    generator: candidate.generator,
    applicableFuel: candidate.applicableFuel,
    runningHeadroomWatts:
      candidate.runningWatts - sizing.recommendedRunningWatts,
    startingHeadroomWatts:
      candidate.startingWatts - sizing.recommendedStartingWatts,
    meetsBudget: candidate.meetsBudget,
    overBudgetByUsd: candidate.overBudgetByUsd,
    reasons: buildReasons(candidate, sizing, preferences),
  }
}

function compareBestFit(a: QualifiedCandidate, b: QualifiedCandidate): number {
  if (a.capacityWaste !== b.capacityWaste) {
    return a.capacityWaste - b.capacityWaste
  }
  if (a.meetsBudget !== b.meetsBudget) {
    return a.meetsBudget ? -1 : 1
  }
  if (a.priorityScore !== b.priorityScore) {
    return b.priorityScore - a.priorityScore
  }
  return a.generator.approximatePriceUsd - b.generator.approximatePriceUsd
}

function compareBestValue(a: QualifiedCandidate, b: QualifiedCandidate): number {
  if (a.meetsBudget !== b.meetsBudget) {
    return a.meetsBudget ? -1 : 1
  }
  if (a.generator.approximatePriceUsd !== b.generator.approximatePriceUsd) {
    return a.generator.approximatePriceUsd - b.generator.approximatePriceUsd
  }
  return a.capacityWaste - b.capacityWaste
}

function compareUpgrade(a: QualifiedCandidate, b: QualifiedCandidate): number {
  if (a.priorityScore !== b.priorityScore) {
    return b.priorityScore - a.priorityScore
  }
  if (a.capacityWaste !== b.capacityWaste) {
    return a.capacityWaste - b.capacityWaste
  }
  if (a.meetsBudget !== b.meetsBudget) {
    return a.meetsBudget ? -1 : 1
  }
  return a.generator.approximatePriceUsd - b.generator.approximatePriceUsd
}

/**
 * Deterministic catalog filter + rank.
 * Hard constraints: capacity (applicable fuel), dual-fuel requirement, connection.
 * Soft: budget (flagged, never eliminates), priorities (secondary ranking).
 */
export function recommendGenerators(
  sizing: SizingResult,
  preferences: GeneratorPreferences,
  catalog: Generator[],
): RecommendationResult {
  assertPreferences(preferences)

  const warnings: string[] = []
  const prelim: Array<Omit<QualifiedCandidate, 'priorityScore'>> = []

  for (const generator of catalog) {
    const applicable = resolveApplicableFuel(
      generator,
      preferences.fuelPreference,
    )
    if (!applicable) continue

    if (
      applicable.runningWatts < sizing.recommendedRunningWatts ||
      applicable.startingWatts < sizing.recommendedStartingWatts
    ) {
      continue
    }

    if (!passesConnection(generator, preferences.connection)) continue

    const budget = budgetFields(
      generator.approximatePriceUsd,
      preferences.budgetMaxUsd,
    )

    prelim.push({
      generator,
      applicableFuel: applicable.fuel,
      runningWatts: applicable.runningWatts,
      startingWatts: applicable.startingWatts,
      capacityWaste: applicable.runningWatts - sizing.recommendedRunningWatts,
      meetsBudget: budget.meetsBudget,
      overBudgetByUsd: budget.overBudgetByUsd,
    })
  }

  const qualifiedGenerators = prelim.map((p) => p.generator)
  const qualified: QualifiedCandidate[] = prelim.map((p) => ({
    ...p,
    priorityScore: priorityScoreFor(
      p.generator,
      preferences.priorities,
      qualifiedGenerators,
    ),
  }))

  if (qualified.length === 0) {
    return {
      qualifiedCount: 0,
      recommendations: [],
      warnings: [
        'We could not find a generator in our catalog that safely meets these electrical requirements.',
      ],
    }
  }

  const bestFit = [...qualified].sort(compareBestFit)[0]!

  let bestValue: QualifiedCandidate | undefined
  const valueSorted = [...qualified].sort(compareBestValue)
  bestValue = valueSorted.find((c) => c.generator.id !== bestFit.generator.id)
  // If every qualified unit is the same as best fit, omit best-value rather than duplicate

  const upgradeCap = sizing.recommendedRunningWatts * 1.75
  const upgradePool = qualified.filter(
    (c) =>
      c.generator.id !== bestFit.generator.id &&
      c.runningWatts > bestFit.runningWatts &&
      c.runningWatts <= upgradeCap,
  )
  const upgrade = [...upgradePool].sort(compareUpgrade)[0]

  const recommendations: Recommendation[] = [
    toRecommendation('best-fit', bestFit, sizing, preferences),
  ]
  if (bestValue) {
    recommendations.push(
      toRecommendation('best-value', bestValue, sizing, preferences),
    )
  }
  if (upgrade) {
    recommendations.push(
      toRecommendation('upgrade', upgrade, sizing, preferences),
    )
  }

  const anyWithinBudget = qualified.some((c) => c.meetsBudget)
  if (preferences.budgetMaxUsd !== undefined && !anyWithinBudget) {
    warnings.push(
      'No generators meeting your electrical requirements were found within your stated budget.',
    )
  }

  return {
    qualifiedCount: qualified.length,
    recommendations,
    warnings,
  }
}
