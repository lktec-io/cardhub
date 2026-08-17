import { forwardRef, useId } from 'react';
import { FiChevronDown } from 'react-icons/fi';

export const Select = forwardRef(function Select(
  { label, error, hint, options = [], placeholder, className = '', id, value, defaultValue, ...rest },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const valueProps = value !== undefined ? { value } : { defaultValue: defaultValue ?? '' };

  return (
    <div className={`ch-field ${className}`}>
      {label && (
        <label className="ch-field__label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className={`ch-select-wrap ${error ? 'ch-input-wrap--error' : ''}`}>
        <select ref={ref} id={inputId} className="ch-select" {...valueProps} {...rest}>
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <FiChevronDown className="ch-select-wrap__icon" aria-hidden="true" />
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
