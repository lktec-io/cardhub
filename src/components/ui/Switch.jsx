import { useId } from 'react';

export function Switch({ label, description, checked, onChange, disabled = false, className = '' }) {
  const id = useId();

  return (
    <label className={`ch-switch-row ${className}`} htmlFor={id}>
      <span>
        {label && <span className="ch-switch-row__label">{label}</span>}
        {description && <span className="ch-switch-row__description">{description}</span>}
      </span>
      <span className="ch-switch">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange?.(event.target.checked)}
        />
        <span className="ch-switch__track">
          <span className="ch-switch__thumb" />
        </span>
      </span>
    </label>
  );
}
