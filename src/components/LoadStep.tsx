import type { Load } from '../types/catalog'

type LoadStepProps = {
  loads: Load[]
  selected: Record<string, number>
  onToggle: (loadId: string) => void
  onQuantityChange: (loadId: string, quantity: number) => void
  onContinue: () => void
}

export function LoadStep({
  loads,
  selected,
  onToggle,
  onQuantityChange,
  onContinue,
}: LoadStepProps) {
  const hasSelection = Object.keys(selected).length > 0

  return (
    <section className="step">
      <h1>What do you need to keep running?</h1>
      <p className="helper">
        Select only the appliances and essentials you expect to run at the same
        time.
      </p>
      <ul className="card-grid">
        {loads.map((load) => {
          const quantity = selected[load.id]
          const isSelected = quantity !== undefined
          return (
            <li key={load.id}>
              <button
                type="button"
                className={`select-card${isSelected ? ' is-selected' : ''}`}
                onClick={() => onToggle(load.id)}
                aria-pressed={isSelected}
              >
                <span className="select-card__title">{load.name}</span>
              </button>
              {isSelected && load.quantityAllowed !== false && (
                <div className="quantity" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    aria-label={`Decrease ${load.name}`}
                    disabled={quantity <= 1}
                    onClick={() => onQuantityChange(load.id, quantity - 1)}
                  >
                    −
                  </button>
                  <span aria-live="polite">{quantity}</span>
                  <button
                    type="button"
                    aria-label={`Increase ${load.name}`}
                    onClick={() => onQuantityChange(load.id, quantity + 1)}
                  >
                    +
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <div className="step-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!hasSelection}
          onClick={onContinue}
        >
          Continue
        </button>
      </div>
    </section>
  )
}
