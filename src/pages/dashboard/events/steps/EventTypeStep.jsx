import { EVENT_TYPES } from '../../../../constants/eventTypes';
import { useLanguage } from '../../../../hooks/useLanguage';

export function EventTypeStep({ value, onChange }) {
  const { t } = useLanguage();

  return (
    <div>
      <h2 className="ch-h3">{t('wizard.eventType.question')}</h2>
      <p className="ch-body-sm ch-wizard__intro">{t('wizard.eventType.intro')}</p>

      <div className="ch-event-type-grid" role="radiogroup" aria-label="Event type">
        {EVENT_TYPES.map(({ value: typeValue, icon: Icon }) => {
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
              <h3 className="ch-h4">{t(`category.${typeValue}`)}</h3>
              <p className="ch-caption">{t(`category.${typeValue}.description`)}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
