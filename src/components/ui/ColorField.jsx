import { useId } from 'react';

export function ColorField({ label, value, onChange, className = '' }) {
  const id = useId();

  return (
    <div className={`ch-field ${className}`}>
      {label && (
        <label className="ch-field__label" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="ch-color-field">
        <input
          id={id}
          type="color"
          className="ch-color-field__swatch"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="ch-color-field__hex">{value.toUpperCase()}</span>
      </div>
    </div>
  );
}
