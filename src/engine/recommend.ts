import type {
  Generator,
  QuestionnaireAnswers,
  Recommendation,
} from '../types/catalog'
import type { SizingResult } from './sizing'

/**
 * Deterministic catalog filter + rank.
 * Returns up to three roles: best_fit, best_value, upgrade.
 * Never relaxes hard constraints to force a result.
 */
export function recommendGenerators(
  requirement: SizingResult,
  answers: QuestionnaireAnswers,
  catalog: Generator[],
): Recommendation[] {
  void requirement
  void answers
  void catalog
  throw new Error('recommendGenerators is not implemented yet')
}
