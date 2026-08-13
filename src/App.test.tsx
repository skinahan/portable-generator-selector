/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import type { Generator, Load } from './types/catalog'

afterEach(() => {
  cleanup()
})

const tinyLoads: Load[] = [
  {
    id: 'refrigerator',
    name: 'Refrigerator',
    runningWatts: 700,
    startingWatts: 2200,
    quantityAllowed: true,
  },
  {
    id: 'lights',
    name: 'Lights',
    runningWatts: 200,
    startingWatts: 200,
    quantityAllowed: true,
  },
  {
    id: 'gas_furnace_blower',
    name: 'Gas-furnace blower',
    runningWatts: 600,
    startingWatts: 1750,
    quantityAllowed: false,
  },
  {
    id: 'sump_pump',
    name: 'Sump pump',
    runningWatts: 800,
    startingWatts: 2150,
    quantityAllowed: true,
  },
  {
    id: 'router',
    name: 'Router/modem',
    runningWatts: 20,
    startingWatts: 20,
    quantityAllowed: true,
  },
]

function gen(
  partial: Partial<Generator> & Pick<Generator, 'id' | 'model'>,
): Generator {
  return {
    brand: 'Fixture',
    fuelTypes: ['gasoline', 'propane'],
    gasoline: { runningWatts: 5500, startingWatts: 6875 },
    propane: { runningWatts: 5000, startingWatts: 6250 },
    inverter: false,
    voltages: [120, 240],
    outlets: ['5-20R', 'L14-30R'],
    approximatePriceUsd: 799,
    manufacturerUrl: 'https://example.com/mfr',
    purchaseUrl: 'https://example.com/buy',
    auditedAt: '2026-08-12',
    ...partial,
  }
}

async function flushCalculating() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

describe('Questionnaire App', () => {
  it('cannot advance from loads with no selection', () => {
    render(<App loads={tinyLoads} generators={[]} calculateDelayMs={0} />)
    const continueBtn = screen.getByRole('button', { name: 'Continue' })
    expect(continueBtn).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Refrigerator' }))
    expect(continueBtn).not.toBeDisabled()
  })

  it('third priority cannot be selected', () => {
    render(<App loads={tinyLoads} generators={[]} calculateDelayMs={0} />)
    fireEvent.click(screen.getByRole('button', { name: 'Refrigerator' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Gasoline is fine' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: "I'm not sure" }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    fireEvent.click(
      screen.getByRole('button', { name: 'Lowest purchase price' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Quiet operation' }))
    const third = screen.getByRole('button', { name: 'Fuel efficiency' })
    expect(third).toBeDisabled()
    fireEvent.click(third)
    expect(third).toHaveAttribute('aria-pressed', 'false')
  })

  it('completing the questionnaire renders the sizing result for the DoD path', async () => {
    const catalog = [
      gen({ id: 'champion-201505', brand: 'Champion', model: '201505 5500W Dual Fuel' }),
      gen({
        id: 'champion-201463',
        brand: 'Champion',
        model: '201463 6250W Dual Fuel',
        approximatePriceUsd: 899,
        propane: { runningWatts: 5600, startingWatts: 7050 },
        gasoline: { runningWatts: 6250, startingWatts: 7850 },
      }),
    ]

    render(
      <App loads={tinyLoads} generators={catalog} calculateDelayMs={0} />,
    )

    for (const name of [
      'Refrigerator',
      'Gas-furnace blower',
      'Sump pump',
      'Lights',
      'Router/modem',
    ]) {
      fireEvent.click(screen.getByRole('button', { name }))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'Gasoline + propane required' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(
      screen.getByRole('button', {
        name: /Existing generator inlet \/ transfer equipment/i,
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'Lowest purchase price' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Long runtime' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: '$900–$1,200' }))
    fireEvent.click(screen.getByRole('button', { name: 'Find my generator' }))

    expect(
      screen.getByRole('heading', { name: /Calculating your outage load/i }),
    ).toBeTruthy()

    await flushCalculating()

    expect(
      screen.getByRole('heading', {
        name: /You need approximately 2,800 running watts and 4,600 starting watts/i,
      }),
    ).toBeTruthy()
    expect(screen.getByText(/Best Fit · Best Value/i)).toBeTruthy()
    expect(screen.getByText(/Champion 201505/i)).toBeTruthy()
  })

  it('duplicate Best Fit / Best Value renders one card with both labels', async () => {
    const catalog = [
      gen({
        id: 'only-fit',
        brand: 'Champion',
        model: 'Only Fit',
        approximatePriceUsd: 799,
      }),
    ]
    render(
      <App loads={tinyLoads} generators={catalog} calculateDelayMs={0} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Refrigerator' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'Gasoline + propane required' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(
      screen.getByRole('button', {
        name: /Existing generator inlet/i,
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Flexible' }))
    fireEvent.click(screen.getByRole('button', { name: 'Find my generator' }))
    await flushCalculating()

    const badges = screen.getAllByText(/Best Fit · Best Value/i)
    expect(badges).toHaveLength(1)
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1)
  })

  it('no-match result renders recovery actions', async () => {
    const undersized: Generator[] = [
      gen({
        id: 'tiny',
        model: 'Tiny',
        propane: { runningWatts: 1000, startingWatts: 1200 },
        gasoline: { runningWatts: 1200, startingWatts: 1500 },
      }),
    ]
    render(
      <App loads={tinyLoads} generators={undersized} calculateDelayMs={0} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Refrigerator' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sump pump' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'Gasoline + propane required' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(
      screen.getByRole('button', {
        name: /Existing generator inlet/i,
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Flexible' }))
    fireEvent.click(screen.getByRole('button', { name: 'Find my generator' }))
    await flushCalculating()

    expect(
      screen.getByRole('heading', {
        name: /exceed the capacity of the generators in our current catalog/i,
      }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Change my selections' }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Start over' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Change my selections' }))
    expect(
      within(document.body).getByRole('heading', {
        name: /What do you need to keep running/i,
      }),
    ).toBeTruthy()
  })
})
