import { trackRecommendationClicked } from '../lib/analytics'
import { categoryLabel, formatUsd } from '../lib/answers'
import type { MergedRecommendation } from '../lib/mergeRecommendations'
import { buildPurchaseUrl } from '../lib/purchase'

type RecommendationCardProps = {
  item: MergedRecommendation
}

function fuelModeWatts(item: MergedRecommendation): {
  running: number
  starting: number
} {
  const mode =
    item.applicableFuel === 'propane'
      ? item.generator.propane
      : item.generator.gasoline
  return {
    running: mode?.runningWatts ?? 0,
    starting: mode?.startingWatts ?? 0,
  }
}

export function RecommendationCard({ item }: RecommendationCardProps) {
  const { generator } = item
  const watts = fuelModeWatts(item)
  const badges = item.categories.map(categoryLabel).join(' · ')
  const connectionBits: string[] = []
  if (generator.voltages.includes(120) && generator.voltages.includes(240)) {
    connectionBits.push('120/240V')
  } else if (generator.voltages.includes(120)) {
    connectionBits.push('120V')
  }
  if (generator.outlets.includes('L14-30R')) connectionBits.push('L14-30R')
  if (generator.outlets.includes('TT-30R')) connectionBits.push('TT-30R')
  if (generator.outlets.includes('L5-30R')) connectionBits.push('L5-30R')

  return (
    <article className="rec-card">
      <p className="rec-card__badges">{badges}</p>
      <h3>
        {generator.brand} {generator.model}
      </h3>
      <p className="rec-card__price">
        About {formatUsd(generator.approximatePriceUsd)}
      </p>
      <ul className="rec-card__specs">
        <li>
          {item.applicableFuel === 'propane' ? 'Propane' : 'Gasoline'}:{' '}
          {watts.running.toLocaleString('en-US')} running /{' '}
          {watts.starting.toLocaleString('en-US')} starting watts
        </li>
        <li>
          +{item.runningHeadroomWatts.toLocaleString('en-US')} W running
          headroom · +{item.startingHeadroomWatts.toLocaleString('en-US')} W
          startup headroom
        </li>
        {generator.inverter ? <li>Inverter (cleaner power)</li> : null}
        {connectionBits.length > 0 ? (
          <li>{connectionBits.join(' · ')}</li>
        ) : null}
      </ul>
      {!item.meetsBudget && item.overBudgetByUsd > 0 ? (
        <p className="rec-card__budget-warn">
          About {formatUsd(item.overBudgetByUsd)} above your stated budget.
        </p>
      ) : null}
      <div className="rec-card__why">
        <h4>Why it fits</h4>
        <ul>
          {item.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>
      <a
        className="btn btn-primary"
        href={buildPurchaseUrl(generator)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() =>
          trackRecommendationClicked({
            product_id: generator.id,
            recommendation_label: badges,
          })
        }
      >
        Check current price
      </a>
    </article>
  )
}
