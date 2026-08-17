import { forwardRef, useId, useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

export const PasswordField = forwardRef(function PasswordField(
  { label, error, hint, className = '', id, ...rest },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={`ch-field ${className}`}>
      {label && (
        <label className="ch-field__label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className={`ch-input-wrap ${error ? 'ch-input-wrap--error' : ''}`}>
        <input
          ref={ref}
          id={inputId}
          type={isVisible ? 'text' : 'password'}
          className="ch-input"
          aria-invalid={Boolean(error) || undefined}
          {...rest}
        />
        <button
          type="button"
          className="ch-input-wrap__toggle"
          onClick={() => setIsVisible((prev) => !prev)}
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {isVisible ? <FiEyeOff /> : <FiEye />}
        </button>
      </div>
      {error && (
        <p className="ch-field__error" role="alert">
          {error}
        </p>
      )}
      {!error && hint && <p className="ch-field__hint">{hint}</p>}
    </div>
  );
});
