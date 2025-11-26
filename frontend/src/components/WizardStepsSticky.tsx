import React from 'react'

interface WizardStepsStickyProps {
  currentStep: 1 | 2 | 3
  onStepClick: (step: 1 | 2 | 3) => void
  selectedChannel: { name: string } | null
  isVisible: boolean
}

const WizardStepsSticky: React.FC<WizardStepsStickyProps> = ({
  currentStep,
  onStepClick,
  selectedChannel,
  isVisible
}) => {
  const steps = [
    { number: 1, label: 'Канал', step: 1 as const },
    { number: 2, label: 'Идея', step: 2 as const },
    { number: 3, label: 'Видео', step: 3 as const }
  ]

  if (!isVisible) return null

  return (
    <div className="wizard-steps-sticky">
      <div className="wizard-steps-sticky__container">
        {steps.map(({ number, label, step }) => {
          const isActive = currentStep === step
          const isCompleted = currentStep > step
          const isClickable = step === 1 || (step === 2 && selectedChannel) || (step === 3 && selectedChannel)

          return (
            <button
              key={step}
              type="button"
              className={`wizard-steps-sticky__step ${isActive ? 'wizard-steps-sticky__step--active' : ''} ${isCompleted ? 'wizard-steps-sticky__step--completed' : ''} ${!isClickable ? 'wizard-steps-sticky__step--disabled' : ''}`}
              onClick={() => isClickable && onStepClick(step)}
              disabled={!isClickable}
              aria-label={`Шаг ${number}: ${label}`}
            >
              <span className="wizard-steps-sticky__number">
                {isCompleted ? '✓' : number}
              </span>
              <span className="wizard-steps-sticky__label">{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default WizardStepsSticky

