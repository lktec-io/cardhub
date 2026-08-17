import { forwardRef, useId } from 'react';

export const Radio = forwardRef(function Radio({ label, className = '', id, ...rest }, ref) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <label className={`ch-radio ${className}`} htmlFor={inputId}>
      <span className="ch-radio__box">
        <input ref={ref} type="radio" id={inputId} className="ch-radio__input" {...rest} />
        <span className="ch-radio__dot" />
      </span>
      {label && <span className="ch-radio__label">{label}</span>}
    </label>
  );
});
