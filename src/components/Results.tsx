import { displayWatts } from '../lib/answers'
import type { RecommendationResult } from '../types/catalog'
import type { SizingResult } from '../engine/sizing'
import { mergeRecommendations } from '../lib/mergeRecommendations'
import { RecommendationCard } from './RecommendationCard'
import { SafetyNotice } from './SafetyNotice'

type ResultsProps = {
  sizing: SizingResult
  recommendation: RecommendationResult
  onChangeSelections: () => void
  onStartOver: () => void
}

export function Results({
  sizing,
  recommendation,
  onChangeSelections,
  onStartOver,
}: ResultsProps) {
  const cards = mergeRecommendations(recommendation.recommendations)
  const noMatch = recommendation.qualifiedCount === 0 || cards.length === 0
  const displayRunning = displayWatts(sizing.recommendedRunningWatts)
  const displayStarting = displayWatts(sizing.recommendedStartingWatts)

  return (
    <section className="results">
      {noMatch ? (
        <>
          <h1>
            Your selected loads exceed the capacity of the generators in our
            current catalog.
          </h1>
          <p className="lede">
            Your estimated requirement is approximately{' '}
            {displayRunning.toLocaleString('en-US')} running watts and{' '}
            {displayStarting.toLocaleString('en-US')} starting watts
            (including 20% headroom). We won&apos;t recommend a generator that
            fails those electrical requirements.
          </p>
          <div className="step-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={onChangeSelections}
            >
              Change my selections
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onStartOver}
            >
              Start over
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="brand">Your backup size</p>
          <h1>
            You need approximately {displayRunning.toLocaleString('en-US')}{' '}
            running watts and {displayStarting.toLocaleString('en-US')} starting
            watts.
          </h1>
          <ul className="sizing-summary">
            <li>
              Selected running load:{' '}
              <strong>
                {sizing.baseRunningWatts.toLocaleString('en-US')} W
              </strong>
            </li>
            <li>
              Largest startup event:{' '}
              <strong>
                +{sizing.largestStartingDeltaWatts.toLocaleString('en-US')} W
              </strong>
              {sizing.governingLoad
                ? ` (${sizing.governingLoad.name})`
                : null}
            </li>
            <li>
              20% headroom applied → recommended{' '}
              <strong>
                {sizing.recommendedRunningWatts.toLocaleString('en-US')} W
              </strong>{' '}
              running /{' '}
              <strong>
                {sizing.recommendedStartingWatts.toLocaleString('en-US')} W
              </strong>{' '}
              starting
            </li>
            {sizing.governingLoad ? (
              <li>
                Governing startup appliance:{' '}
                <strong>{sizing.governingLoad.name}</strong>
              </li>
            ) : null}
          </ul>

          <details className="calc-details">
            <summary>How we calculated this</summary>
            <table>
              <thead>
                <tr>
                  <th>Load</th>
                  <th>Qty</th>
                  <th>Running</th>
                  <th>Starting</th>
                  <th>Contribution</th>
                </tr>
              </thead>
              <tbody>
                {sizing.breakdown.map((row) => (
                  <tr key={row.loadId}>
                    <td>{row.name}</td>
                    <td>{row.quantity}</td>
                    <td>{row.runningWatts.toLocaleString('en-US')} W</td>
                    <td>{row.startingWatts.toLocaleString('en-US')} W</td>
                    <td>
                      {row.runningContributionWatts.toLocaleString('en-US')} W
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="calc-note">
              Startup sizing adds only the largest single-unit surge (
              {sizing.largestStartingDeltaWatts.toLocaleString('en-US')} W),
              assuming one motor starts at a time. Then we apply{' '}
              {(sizing.safetyMargin * 100).toFixed(0)}% headroom.
            </p>
          </details>

          {recommendation.warnings.map((warning) => (
            <p key={warning} className="warning-banner">
              {warning}
            </p>
          ))}

          <h2 className="rec-heading">Generators that fit</h2>
          <div className="rec-list">
            {cards.map((item) => (
              <RecommendationCard key={item.generator.id} item={item} />
            ))}
          </div>

          <div className="step-actions step-actions--results">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onStartOver}
            >
              Start over
            </button>
          </div>
        </>
      )}

      <SafetyNotice />
    </section>
  )
}
