export type FuelType = 'gasoline' | 'propane'

export type OutletType = '5-20R' | 'L5-30R' | 'L14-30R' | string

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

export interface Generator {
  id: string
  brand: string
  model: string
  running_watts_gas: number
  starting_watts_gas: number
  running_watts_propane: number | null
  starting_watts_propane: number | null
  fuel: FuelType[]
  inverter: boolean
  voltage: number[]
  outlets: OutletType[]
  noise_db: number
  weight_lb: number
  runtime_50_load_hours: number
  price: number
  purchase_url: string
  source_url: string
}

export type Priority =
  | 'lowest_price'
  | 'quiet'
  | 'fuel_efficiency'
  | 'portability'
  | 'long_runtime'
  | 'clean_power'

export type FuelPreference = 'gasoline' | 'dual_fuel' | 'no_preference'

export type ConnectionPreference =
  | 'extension_cords'
  | 'rv_30a'
  | 'inlet_transfer'
  | 'unsure'

export type BudgetBand =
  | 'under_600'
  | '600_900'
  | '900_1200'
  | '1200_1500'
  | 'flexible'

export interface LoadSelection {
  loadId: string
  quantity: number
  /** Used when loadId is the custom wattage entry. */
  customRunningWatts?: number
  customStartingWatts?: number
}

export interface QuestionnaireAnswers {
  loads: LoadSelection[]
  priorities: Priority[]
  fuel: FuelPreference
  connection: ConnectionPreference
  budget: BudgetBand
}

export type RecommendationRole = 'best_fit' | 'best_value' | 'upgrade'

export interface Recommendation {
  role: RecommendationRole
  generator: Generator
  whyItFits: string
}
