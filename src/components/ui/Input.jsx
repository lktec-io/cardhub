import { forwardRef, useId } from 'react';

export const Input = forwardRef(function Input(
  { label, error, hint, icon, className = '', id, ...rest },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className={`ch-field ${className}`}>
      {label && (
        <label className="ch-field__label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className={`ch-input-wrap ${icon ? 'ch-input-wrap--icon' : ''} ${error ? 'ch-input-wrap--error' : ''}`}>
        {icon && <span className="ch-input-wrap__icon">{icon}</span>}
        <input
          ref={ref}
          id={inputId}
          className="ch-input"
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...rest}
        />
      </div>
      {error && (
        <p className="ch-field__error" id={`${inputId}-error`} role="alert">
          {error}
        </p>
      )}
      {!error && hint && (
        <p className="ch-field__hint" id={`${inputId}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );
});
