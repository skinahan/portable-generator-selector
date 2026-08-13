export type FuelType = 'gasoline' | 'propane'

export type FuelModeRatings = {
  runningWatts: number
  startingWatts: number
}

export interface Generator {
  id: string
  brand: string
  model: string
  fuelTypes: FuelType[]
  gasoline?: FuelModeRatings
  propane?: FuelModeRatings
  inverter: boolean
  voltages: number[]
  outlets: string[]
  weightLb?: number
  runtimeHours?: number
  runtimeLoadPercent?: number
  noiseDb?: number
  approximatePriceUsd: number
  manufacturerUrl: string
  purchaseUrl: string
  auditedAt: string
}

export interface Load {
  id: string
  name: string
  runningWatts: number
  startingWatts: number
  quantityAllowed?: boolean
  notes?: string
  sourceUrl?: string
  sourceLabel?: string
}

export type PriorityId =
  | 'lowest-price'
  | 'quiet'
  | 'fuel-efficiency'
  | 'portability'
  | 'runtime'
  | 'clean-power'

export type FuelPreferenceId =
  | 'gasoline-ok'
  | 'dual-fuel-required'
  | 'no-preference'

export type ConnectionId =
  | 'extension-cords'
  | 'rv-30a'
  | 'generator-inlet'
  | 'unsure'

export interface GeneratorPreferences {
  fuelPreference: FuelPreferenceId
  connection: ConnectionId
  priorities: PriorityId[]
  budgetMaxUsd?: number
}

export interface LoadSelection {
  loadId: string
  quantity: number
  customRunningWatts?: number
  customStartingWatts?: number
}

export type RecommendationCategory = 'best-fit' | 'best-value' | 'upgrade'

export interface Recommendation {
  category: RecommendationCategory
  generator: Generator
  applicableFuel: FuelType
  runningHeadroomWatts: number
  startingHeadroomWatts: number
  meetsBudget: boolean
  overBudgetByUsd: number
  reasons: string[]
}

export interface RecommendationResult {
  qualifiedCount: number
  recommendations: Recommendation[]
  warnings: string[]
}
