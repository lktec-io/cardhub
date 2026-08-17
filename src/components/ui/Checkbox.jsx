import { forwardRef, useId } from 'react';
import { FiCheck } from 'react-icons/fi';

export const Checkbox = forwardRef(function Checkbox({ label, className = '', id, ...rest }, ref) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <label className={`ch-checkbox ${className}`} htmlFor={inputId}>
      <span className="ch-checkbox__box">
        <input ref={ref} type="checkbox" id={inputId} className="ch-checkbox__input" {...rest} />
        <FiCheck className="ch-checkbox__mark" aria-hidden="true" />
      </span>
      {label && <span className="ch-checkbox__label">{label}</span>}
    </label>
  );
});
