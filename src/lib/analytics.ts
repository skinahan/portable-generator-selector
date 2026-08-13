import { track as vercelTrack } from '@vercel/analytics'

type RecommendationClickProps = {
  product_id: string
  recommendation_label: string
}

export function trackSelectorStarted(): void {
  vercelTrack('selector_started')
}

export function trackSelectorCompleted(): void {
  vercelTrack('selector_completed')
}

export function trackRecommendationClicked(
  props: RecommendationClickProps,
): void {
  vercelTrack('recommendation_clicked', props)
}
