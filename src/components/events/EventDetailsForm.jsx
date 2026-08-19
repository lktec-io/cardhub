import { Input, Textarea, Select } from '../ui';
import { getTimezoneOptions } from '../../utils/timezones';
import { useLanguage } from '../../hooks/useLanguage';

export function EventDetailsForm({ value, onChange, errors = {} }) {
  const { t } = useLanguage();
  const timezoneOptions = getTimezoneOptions();

  function handleField(field) {
    return (event) => onChange(field, event.target.value);
  }

  return (
    <div className="ch-event-form">
      <Input label={t('eventForm.eventName')} value={value.title} onChange={handleField('title')} error={errors.title} placeholder="Leonard & Neema Wedding" />
      <Input label={t('eventForm.hostName')} value={value.hostName} onChange={handleField('hostName')} error={errors.hostName} placeholder="Leonard & Neema" />

      <div className="ch-event-form__row">
        <Input type="date" label={t('eventForm.eventDate')} value={value.eventDate} onChange={handleField('eventDate')} error={errors.eventDate} />
        <Input type="time" label={t('eventForm.eventTime')} value={value.eventTime} onChange={handleField('eventTime')} error={errors.eventTime} />
      </div>

      <Select
        label={t('eventForm.timezone')}
        value={value.timezone}
        onChange={handleField('timezone')}
        error={errors.timezone}
        options={timezoneOptions}
      />

      <div className="ch-event-form__row">
        <Input label={t('eventForm.venueName')} value={value.venueName} onChange={handleField('venueName')} error={errors.venueName} placeholder="Serena Hotel" />
        <Input label={t('eventForm.venueAddress')} value={value.venueAddress} onChange={handleField('venueAddress')} error={errors.venueAddress} placeholder="Dar es Salaam" />
      </div>

      <Textarea
        label={t('eventForm.descriptionOptional')}
        value={value.description}
        onChange={handleField('description')}
        error={errors.description}
        placeholder="Join us as we celebrate..."
      />
    </div>
  );
}
