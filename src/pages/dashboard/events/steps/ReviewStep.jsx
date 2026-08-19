import { useLanguage } from '../../../../hooks/useLanguage';

export function ReviewStep({ formData, template, onEditStep }) {
  const { t } = useLanguage();

  function formatDate(value) {
    if (!value) return t('wizard.review.notSet');
    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  const rows = [
    { label: t('wizard.review.eventType'), value: formData.eventType ? t(`category.${formData.eventType}`) : '—', step: 1 },
    { label: t('wizard.review.template'), value: template?.name || '—', step: 2 },
    { label: t('wizard.review.eventName'), value: formData.title || '—', step: 3 },
    { label: t('wizard.review.host'), value: formData.hostName || '—', step: 3 },
    { label: t('wizard.review.date'), value: formatDate(formData.eventDate), step: 3 },
    { label: t('wizard.review.time'), value: formData.eventTime || t('wizard.review.notSet'), step: 3 },
    { label: t('wizard.review.timezone'), value: formData.timezone, step: 3 },
    { label: t('wizard.review.venue'), value: formData.venueName || t('wizard.review.notSet'), step: 3 },
    { label: t('wizard.review.address'), value: formData.venueAddress || t('wizard.review.notSet'), step: 3 },
    { label: t('wizard.review.description'), value: formData.description || t('wizard.review.notSet'), step: 3 },
  ];

  return (
    <div>
      <h2 className="ch-h3">{t('wizard.review.title')}</h2>
      <p className="ch-body-sm ch-wizard__intro">{t('wizard.review.intro')}</p>

      <dl className="ch-review-summary">
        {rows.map((row) => (
          <div className="ch-review-summary__row" key={row.label}>
            <dt>{row.label}</dt>
            <dd>
              {row.value}{' '}
              <button type="button" className="ch-auth-form__link" onClick={() => onEditStep(row.step)}>
                {t('wizard.review.edit')}
              </button>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
