import { FiCheck } from 'react-icons/fi';

export function StepIndicator({ steps, currentStep }) {
  return (
    <ol className="ch-step-indicator" aria-label="Progress">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const state = stepNumber < currentStep ? 'completed' : stepNumber === currentStep ? 'active' : 'upcoming';

        return (
          <li key={step} className={`ch-step-indicator__item ch-step-indicator__item--${state}`}>
            <span className="ch-step-indicator__dot" aria-hidden="true">
              {state === 'completed' ? <FiCheck /> : stepNumber}
            </span>
            <span className="ch-step-indicator__label">{step}</span>
          </li>
        );
      })}
    </ol>
  );
}
