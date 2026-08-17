import { Input, Textarea, Select } from '../ui';
import { getTimezoneOptions } from '../../utils/timezones';

export function EventDetailsForm({ value, onChange, errors = {} }) {
  const timezoneOptions = getTimezoneOptions();

  function handleField(field) {
    return (event) => onChange(field, event.target.value);
  }

  return (
    <div className="ch-event-form">
      <Input label="Event name" value={value.title} onChange={handleField('title')} error={errors.title} placeholder="Leonard & Neema Wedding" />
      <Input label="Host name" value={value.hostName} onChange={handleField('hostName')} error={errors.hostName} placeholder="Leonard & Neema" />

      <div className="ch-event-form__row">
        <Input type="date" label="Event date" value={value.eventDate} onChange={handleField('eventDate')} error={errors.eventDate} />
        <Input type="time" label="Event time" value={value.eventTime} onChange={handleField('eventTime')} error={errors.eventTime} />
      </div>

      <Select
        label="Timezone"
        value={value.timezone}
        onChange={handleField('timezone')}
        error={errors.timezone}
        options={timezoneOptions}
      />

      <div className="ch-event-form__row">
        <Input label="Venue name" value={value.venueName} onChange={handleField('venueName')} error={errors.venueName} placeholder="Serena Hotel" />
        <Input label="Venue address" value={value.venueAddress} onChange={handleField('venueAddress')} error={errors.venueAddress} placeholder="Dar es Salaam" />
      </div>

      <Textarea
        label="Description (optional)"
        value={value.description}
        onChange={handleField('description')}
        error={errors.description}
        placeholder="Join us as we celebrate..."
      />
    </div>
  );
}
