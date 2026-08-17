import { useEffect, useRef, useState } from 'react'
import defaultLoads from '../data/loads.json'
import defaultGenerators from '../data/generators.json'
import { ChoiceStep } from './components/ChoiceStep'
import { LoadStep } from './components/LoadStep'
import { Progress } from './components/Progress'
import { Results } from './components/Results'
import {
  trackSelectorCompleted,
  trackSelectorStarted,
} from './lib/analytics'
import { recommendGenerators } from './engine/recommend'
import { sizeLoads, type SizingResult } from './engine/sizing'
import {
  BUDGET_OPTIONS,
  CONNECTION_OPTIONS,
  FUEL_OPTIONS,
  PRIORITY_OPTIONS,
  toGeneratorPreferences,
  type BudgetBandId,
} from './lib/answers'
import type {
  ConnectionId,
  FuelPreferenceId,
  Generator,
  Load,
  PriorityId,
  RecommendationResult,
} from './types/catalog'
import './App.css'

export type StepId =
  | 'loads'
  | 'fuel'
  | 'connection'
  | 'priorities'
  | 'budget'
  | 'calculating'
  | 'results'

export type AppProps = {
  loads?: Load[]
  generators?: Generator[]
  /** Test seam: skip calculating delay */
  calculateDelayMs?: number
}

const STEP_NUMBERS: Record<
  Exclude<StepId, 'calculating' | 'results'>,
  number
> = {
  loads: 1,
  fuel: 2,
  connection: 3,
  priorities: 4,
  budget: 5,
}

export default function App({
  loads = defaultLoads as Load[],
  generators = defaultGenerators as Generator[],
  calculateDelayMs = 500,
}: AppProps) {
  const [step, setStep] = useState<StepId>('loads')
  const [selectedLoads, setSelectedLoads] = useState<Record<string, number>>(
    {},
  )
  const [fuelPreference, setFuelPreference] =
    useState<FuelPreferenceId | null>(null)
  const [connection, setConnection] = useState<ConnectionId | null>(null)
  const [priorities, setPriorities] = useState<PriorityId[]>([])
  const [budgetBand, setBudgetBand] = useState<BudgetBandId | null>(null)
  const [sizing, setSizing] = useState<SizingResult | null>(null)
  const [recommendation, setRecommendation] =
    useState<RecommendationResult | null>(null)
  const startedTracked = useRef(false)
  const completedTracked = useRef(false)

  function resetAll() {
    setStep('loads')
    setSelectedLoads({})
    setFuelPreference(null)
    setConnection(null)
    setPriorities([])
    setBudgetBand(null)
    setSizing(null)
    setRecommendation(null)
    startedTracked.current = false
    completedTracked.current = false
  }

  function toggleLoad(loadId: string) {
    setSelectedLoads((prev) => {
      const next = { ...prev }
      if (next[loadId] !== undefined) {
        delete next[loadId]
      } else {
        next[loadId] = 1
        if (!startedTracked.current) {
          startedTracked.current = true
          trackSelectorStarted()
        }
      }
      return next
    })
  }

  function changeQuantity(loadId: string, quantity: number) {
    if (quantity < 1) return
    setSelectedLoads((prev) => ({ ...prev, [loadId]: quantity }))
  }

  function togglePriority(id: PriorityId) {
    setPriorities((prev) => {
      if (prev.includes(id)) {
        return prev.filter((p) => p !== id)
      }
      if (prev.length >= 2) {
        return prev
      }
      return [...prev, id]
    })
  }

  function findGenerator() {
    if (!fuelPreference || !connection || !budgetBand) return

    const selections = Object.entries(selectedLoads).map(
      ([loadId, quantity]) => ({ loadId, quantity }),
    )
    const sizingResult = sizeLoads(selections, { loads })
    const preferences = toGeneratorPreferences({
      fuelPreference,
      connection,
      priorities,
      budgetBand,
    })
    const recommendationResult = recommendGenerators(
      sizingResult,
      preferences,
      generators,
    )
    setSizing(sizingResult)
    setRecommendation(recommendationResult)
    setStep('calculating')
  }

  useEffect(() => {
    if (step !== 'calculating') return
    const timer = window.setTimeout(() => {
      setStep('results')
    }, calculateDelayMs)
    return () => window.clearTimeout(timer)
  }, [step, calculateDelayMs])

  useEffect(() => {
    if (step !== 'results' || !recommendation) return
    if (recommendation.qualifiedCount < 1) return
    if (completedTracked.current) return
    completedTracked.current = true
    trackSelectorCompleted()
  }, [step, recommendation])

  return (
    <div className="app-shell">
      <header className="app-header">
        <p className="brand">Portable Generator Selector</p>
        {step in STEP_NUMBERS ? (
          <Progress step={STEP_NUMBERS[step as keyof typeof STEP_NUMBERS]} />
        ) : null}
      </header>

      <main>
        {step === 'loads' ? (
          <LoadStep
            loads={loads}
            selected={selectedLoads}
            onToggle={toggleLoad}
            onQuantityChange={changeQuantity}
            onContinue={() => setStep('fuel')}
          />
        ) : null}

        {step === 'fuel' ? (
          <ChoiceStep
            mode="single"
            heading="What fuel do you want to use?"
            options={FUEL_OPTIONS}
            value={fuelPreference}
            onChange={setFuelPreference}
            onBack={() => setStep('loads')}
            onContinue={() => setStep('connection')}
          />
        ) : null}

        {step === 'connection' ? (
          <ChoiceStep
            mode="single"
            heading="How will you connect the generator?"
            options={CONNECTION_OPTIONS}
            value={connection}
            onChange={setConnection}
            onBack={() => setStep('fuel')}
            onContinue={() => setStep('priorities')}
          />
        ) : null}

        {step === 'priorities' ? (
          <ChoiceStep
            mode="multi"
            heading="What matters most?"
            helper="Choose up to 2"
            options={PRIORITY_OPTIONS}
            values={priorities}
            max={2}
            onToggle={togglePriority}
            onBack={() => setStep('connection')}
            onContinue={() => setStep('budget')}
          />
        ) : null}

        {step === 'budget' ? (
          <ChoiceStep
            mode="single"
            heading="What's your budget?"
            options={BUDGET_OPTIONS.map(({ id, label }) => ({ id, label }))}
            value={budgetBand}
            onChange={setBudgetBand}
            onBack={() => setStep('priorities')}
            onContinue={findGenerator}
            continueLabel="Find my generator"
          />
        ) : null}

        {step === 'calculating' ? (
          <section className="step calculating" aria-live="polite">
            <h1>Calculating your outage load…</h1>
            <p className="helper">
              Estimating running demand, the largest startup surge, and which
              generators can safely cover both.
            </p>
          </section>
        ) : null}

        {step === 'results' && sizing && recommendation ? (
          <Results
            sizing={sizing}
            recommendation={recommendation}
            onChangeSelections={() => setStep('loads')}
            onStartOver={resetAll}
          />
        ) : null}
      </main>
      <footer className="publisher-attribution">
        <a href="https://silverrooklabs.com/">A Silver Rook Labs project</a>
      </footer>
    </div>
  )
}
