import { FiMinus, FiPlus } from 'react-icons/fi';

export function QuantityStepper({ value, min = 1, max, onChange, label, disabled = false }) {
  const canDecrease = !disabled && value > min;
  const canIncrease = !disabled && value < max;

  return (
    <div className="ch-tix-stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={!canDecrease} aria-label={`${label}: −1`}>
        <FiMinus aria-hidden="true" />
      </button>
      <output className="ch-tix-stepper__value" aria-live="polite">
        {value}
      </output>
      <button type="button" onClick={() => onChange(value + 1)} disabled={!canIncrease} aria-label={`${label}: +1`}>
        <FiPlus aria-hidden="true" />
      </button>
    </div>
  );
}
