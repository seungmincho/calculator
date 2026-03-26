'use client'

interface Step {
  label: string
  description?: string
}

interface StepNavigatorProps {
  steps: Step[]
  currentStep: number
  onStepClick: (step: number) => void
}

export default function StepNavigator({ steps, currentStep, onStepClick }: StepNavigatorProps) {
  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>

      {/* Steps */}
      <div className="flex flex-wrap gap-1.5">
        {steps.map((step, i) => {
          const isActive = i === currentStep
          const isPast = i < currentStep

          return (
            <button
              key={i}
              onClick={() => onStepClick(i)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-300 ${
                isActive
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : isPast
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'bg-gray-100/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
              }`}
              title={step.description}
            >
              {step.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
