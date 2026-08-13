import type { Load, LoadRequirement, LoadSelection } from '../types/catalog'

/**
 * Deterministic outage-load sizing.
 * Implement in the next slice:
 *   base_load = sum(running watts)
 *   largest_start_delta = max(starting - running)
 *   required_starting = base_load + largest_start_delta
 *   recommended_minimum = required_starting * (1 + safetyMargin)
 */
export function computeLoadRequirement(
  loads: Load[],
  selections: LoadSelection[],
  safetyMargin = 0.2,
): LoadRequirement {
  void loads
  void selections
  void safetyMargin
  throw new Error('computeLoadRequirement is not implemented yet')
}
