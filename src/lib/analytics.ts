import { track as vercelTrack } from '@vercel/analytics'

type RecommendationClickProps = {
  product_id: string
  recommendation_label: string
  /** Outbound destination: amazon | home-depot | manufacturer. */
  retailer: string
  /** Whether the outbound URL carried an affiliate identifier. */
  tagged: boolean
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
