import { EVENT_TYPES } from '../../../../constants/eventTypes';

export function EventTypeStep({ value, onChange }) {
  return (
    <div>
      <h2 className="ch-h3">What are you celebrating?</h2>
      <p className="ch-body-sm ch-wizard__intro">Choose the type of event you're creating an invitation for.</p>

      <div className="ch-event-type-grid" role="radiogroup" aria-label="Event type">
        {EVENT_TYPES.map(({ value: typeValue, label, description, icon: Icon }) => {
          const isSelected = value === typeValue;
          return (
            <button
              key={typeValue}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`ch-event-type-card ${isSelected ? 'ch-event-type-card--selected' : ''}`}
              onClick={() => onChange(typeValue)}
            >
              <span className="ch-event-type-card__icon">
                <Icon aria-hidden="true" />
              </span>
              <h3 className="ch-h4">{label}</h3>
              <p className="ch-caption">{description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
