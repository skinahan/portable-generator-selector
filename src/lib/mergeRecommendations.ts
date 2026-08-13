import type {
  FuelType,
  Generator,
  Recommendation,
  RecommendationCategory,
} from '../types/catalog'

export type MergedRecommendation = {
  generator: Generator
  categories: RecommendationCategory[]
  applicableFuel: FuelType
  runningHeadroomWatts: number
  startingHeadroomWatts: number
  meetsBudget: boolean
  overBudgetByUsd: number
  reasons: string[]
  runningWatts: number
  startingWatts: number
}

const ORDER: RecommendationCategory[] = ['best-fit', 'best-value', 'upgrade']

export function mergeRecommendations(
  recommendations: Recommendation[],
): MergedRecommendation[] {
  const byId = new Map<string, MergedRecommendation>()

  for (const rec of recommendations) {
    const existing = byId.get(rec.generator.id)
    const mode =
      rec.applicableFuel === 'propane'
        ? rec.generator.propane
        : rec.generator.gasoline
    if (!existing) {
      byId.set(rec.generator.id, {
        generator: rec.generator,
        categories: [rec.category],
        applicableFuel: rec.applicableFuel,
        runningHeadroomWatts: rec.runningHeadroomWatts,
        startingHeadroomWatts: rec.startingHeadroomWatts,
        meetsBudget: rec.meetsBudget,
        overBudgetByUsd: rec.overBudgetByUsd,
        reasons: rec.reasons,
        runningWatts: mode?.runningWatts ?? 0,
        startingWatts: mode?.startingWatts ?? 0,
      })
    } else if (!existing.categories.includes(rec.category)) {
      existing.categories.push(rec.category)
      existing.categories.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))
    }
  }

  const seen = new Set<string>()
  const merged: MergedRecommendation[] = []
  for (const rec of recommendations) {
    if (seen.has(rec.generator.id)) continue
    seen.add(rec.generator.id)
    merged.push(byId.get(rec.generator.id)!)
  }
  return merged
}
