type ChoiceOption<T extends string> = {
  id: T
  label: string
  helper?: string
}

type SingleChoiceProps<T extends string> = {
  mode: 'single'
  heading: string
  helper?: string
  options: ChoiceOption<T>[]
  value: T | null
  onChange: (id: T) => void
  onContinue: () => void
  onBack: () => void
  continueLabel?: string
  continueDisabled?: boolean
}

type MultiChoiceProps<T extends string> = {
  mode: 'multi'
  heading: string
  helper?: string
  options: ChoiceOption<T>[]
  values: T[]
  max?: number
  onToggle: (id: T) => void
  onContinue: () => void
  onBack: () => void
  continueLabel?: string
}

export function ChoiceStep<T extends string>(
  props: SingleChoiceProps<T> | MultiChoiceProps<T>,
) {
  const canContinue =
    props.mode === 'multi'
      ? true
      : props.value !== null && !props.continueDisabled

  return (
    <section className="step">
      <h1>{props.heading}</h1>
      {props.helper ? <p className="helper">{props.helper}</p> : null}
      <ul className="card-grid card-grid--choices">
        {props.options.map((option) => {
          const selected =
            props.mode === 'multi'
              ? props.values.includes(option.id)
              : props.value === option.id
          const multiFull =
            props.mode === 'multi' &&
            (props.max ?? 2) <= props.values.length &&
            !selected

          return (
            <li key={option.id}>
              <button
                type="button"
                className={`select-card${selected ? ' is-selected' : ''}`}
                aria-pressed={selected}
                disabled={multiFull}
                onClick={() => {
                  if (props.mode === 'multi') {
                    props.onToggle(option.id)
                  } else {
                    props.onChange(option.id)
                  }
                }}
              >
                <span className="select-card__title">{option.label}</span>
                {option.helper ? (
                  <span className="select-card__helper">{option.helper}</span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>
      <div className="step-actions">
        <button type="button" className="btn btn-secondary" onClick={props.onBack}>
          Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canContinue}
          onClick={props.onContinue}
        >
          {props.continueLabel ?? 'Continue'}
        </button>
      </div>
    </section>
  )
}
