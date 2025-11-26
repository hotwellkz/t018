import React, { createContext, useContext, useState, ReactNode } from 'react'

type Step = 1 | 2 | 3

// Минимальный интерфейс для контекста (только то, что нужно для stepper)
export interface Channel {
  id: string
  name: string
  [key: string]: any // Позволяет передавать полный объект Channel из VideoGeneration
}

interface WizardContextType {
  step: Step
  setStep: (step: Step) => void
  selectedChannel: Channel | null
  setSelectedChannel: (channel: Channel | null) => void
}

const WizardContext = createContext<WizardContextType | undefined>(undefined)

export const WizardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [step, setStep] = useState<Step>(1)
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)

  return (
    <WizardContext.Provider value={{ step, setStep, selectedChannel, setSelectedChannel }}>
      {children}
    </WizardContext.Provider>
  )
}

export const useWizard = () => {
  const context = useContext(WizardContext)
  if (context === undefined) {
    throw new Error('useWizard must be used within a WizardProvider')
  }
  return context
}

