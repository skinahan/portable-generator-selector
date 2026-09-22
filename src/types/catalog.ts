export type FuelType = 'gasoline' | 'propane' | 'battery'

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
  /** Continuous AC / surge ratings for indoor-safe battery power stations. */
  battery?: FuelModeRatings
  /** Usable energy capacity in Wh when published by the manufacturer. */
  capacityWh?: number
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
  /**
   * Optional verified retailer identifiers. When absent, retailer links fall
   * back to a brand + model search on that retailer. Record the source and
   * audit date in data/GENERATORS_PROVENANCE.md when filling these in.
   */
  retailers?: {
    amazonAsin?: string
    homeDepotUrl?: string
  }
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
  | 'battery-indoor-safe'
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
