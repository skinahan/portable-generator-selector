type ProgressProps = {
  step: number
  total?: number
}

export function Progress({ step, total = 5 }: ProgressProps) {
  return (
    <p className="progress" aria-label={`Step ${step} of ${total}`}>
      {step} of {total}
    </p>
  )
}
