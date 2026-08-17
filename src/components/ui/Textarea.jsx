import { forwardRef, useId } from 'react';

export const Textarea = forwardRef(function Textarea(
  { label, error, hint, className = '', id, rows = 4, ...rest },
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
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        className={`ch-textarea ${error ? 'ch-input-wrap--error' : ''}`}
        aria-invalid={Boolean(error) || undefined}
        {...rest}
      />
      {error && (
        <p className="ch-field__error" role="alert">
          {error}
        </p>
      )}
      {!error && hint && <p className="ch-field__hint">{hint}</p>}
    </div>
  );
});
