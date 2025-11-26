import React from 'react'

interface WizardStepsProps {
  currentStep: 1 | 2 | 3
  onStepClick: (step: 1 | 2 | 3) => void
  selectedChannel: { name: string } | null
  isCondensed?: boolean
}

const WizardSteps: React.FC<WizardStepsProps> = ({
  currentStep,
  onStepClick,
  selectedChannel,
  isCondensed = false
}) => {
  const steps = [
    { number: 1, label: 'Канал', step: 1 as const },
    { number: 2, label: 'Идея', step: 2 as const },
    { number: 3, label: 'Видео', step: 3 as const }
  ]

  return (
    <div className={`wizard-steps ${isCondensed ? 'wizard-steps--condensed' : ''}`}>
      {selectedChannel && isCondensed && (
        <div className="wizard-steps__channel">
          {selectedChannel.name}
        </div>
      )}
      <div className="wizard-steps__container">
        {steps.map(({ number, label, step }) => {
          const isActive = currentStep === step
          const isCompleted = currentStep > step
          const isClickable = step === 1 || (step === 2 && selectedChannel) || (step === 3 && selectedChannel)

          return (
            <button
              key={step}
              type="button"
              className={`wizard-steps__step ${isActive ? 'wizard-steps__step--active' : ''} ${isCompleted ? 'wizard-steps__step--completed' : ''} ${!isClickable ? 'wizard-steps__step--disabled' : ''}`}
              onClick={() => isClickable && onStepClick(step)}
              disabled={!isClickable}
              aria-label={`Шаг ${number}: ${label}`}
            >
              <span className="wizard-steps__number">
                {isCompleted ? '✓' : number}
              </span>
              <span className="wizard-steps__label">{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default WizardSteps

