import type {
  ConnectionId,
  FuelPreferenceId,
  GeneratorPreferences,
  PriorityId,
} from '../types/catalog'

export type BudgetBandId =
  | 'under_600'
  | '600_900'
  | '900_1200'
  | '1200_1500'
  | 'flexible'

export const FUEL_OPTIONS: Array<{
  id: FuelPreferenceId
  label: string
}> = [
  { id: 'gasoline-ok', label: 'Gasoline is fine' },
  { id: 'dual-fuel-required', label: 'Gasoline + propane required' },
  { id: 'no-preference', label: 'No preference' },
]

export const CONNECTION_OPTIONS: Array<{
  id: ConnectionId
  label: string
  helper?: string
}> = [
  {
    id: 'extension-cords',
    label: 'Extension cords directly to appliances',
  },
  {
    id: 'rv-30a',
    label: '30A RV connection',
  },
  {
    id: 'generator-inlet',
    label: 'Existing generator inlet / transfer equipment',
    helper:
      "We'll require a 120/240V generator with a compatible 30A generator receptacle. Your home's transfer equipment must still be independently verified.",
  },
  {
    id: 'unsure',
    label: "I'm not sure",
  },
]

export const PRIORITY_OPTIONS: Array<{
  id: PriorityId
  label: string
}> = [
  { id: 'lowest-price', label: 'Lowest purchase price' },
  { id: 'quiet', label: 'Quiet operation' },
  { id: 'fuel-efficiency', label: 'Fuel efficiency' },
  { id: 'portability', label: 'Portability' },
  { id: 'runtime', label: 'Long runtime' },
  { id: 'clean-power', label: 'Cleaner power for electronics' },
]

export const BUDGET_OPTIONS: Array<{
  id: BudgetBandId
  label: string
  budgetMaxUsd?: number
}> = [
  { id: 'under_600', label: 'Under $600', budgetMaxUsd: 600 },
  { id: '600_900', label: '$600–$900', budgetMaxUsd: 900 },
  { id: '900_1200', label: '$900–$1,200', budgetMaxUsd: 1200 },
  { id: '1200_1500', label: '$1,200–$1,500', budgetMaxUsd: 1500 },
  { id: 'flexible', label: 'Flexible' },
]

export function toGeneratorPreferences(input: {
  fuelPreference: FuelPreferenceId
  connection: ConnectionId
  priorities: PriorityId[]
  budgetBand: BudgetBandId
}): GeneratorPreferences {
  const band = BUDGET_OPTIONS.find((b) => b.id === input.budgetBand)
  const preferences: GeneratorPreferences = {
    fuelPreference: input.fuelPreference,
    connection: input.connection,
    priorities: input.priorities.slice(0, 2),
  }
  if (band?.budgetMaxUsd !== undefined) {
    preferences.budgetMaxUsd = band.budgetMaxUsd
  }
  return preferences
}

/** Round watts for hero copy (nearest 100 W). */
export function displayWatts(watts: number): number {
  return Math.round(watts / 100) * 100
}

export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`
}

export function categoryLabel(
  category: 'best-fit' | 'best-value' | 'upgrade',
): string {
  switch (category) {
    case 'best-fit':
      return 'Best Fit'
    case 'best-value':
      return 'Best Value'
    case 'upgrade':
      return 'Upgrade Pick'
  }
}
