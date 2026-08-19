import { EventDetailsForm } from '../../../../components/events';
import { useLanguage } from '../../../../hooks/useLanguage';

export function DetailsStep({ value, onChange, errors }) {
  const { t } = useLanguage();

  return (
    <div>
      <h2 className="ch-h3">{t('wizard.details.title')}</h2>
      <p className="ch-body-sm ch-wizard__intro">{t('wizard.details.intro')}</p>
      <EventDetailsForm value={value} onChange={onChange} errors={errors} />
    </div>
  );
}
