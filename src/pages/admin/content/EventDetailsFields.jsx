import { Input, Select, Textarea } from '../../../components/ui';
import { EVENT_TYPES } from '../../../constants/eventTypes';

const TYPE_OPTIONS = EVENT_TYPES.map((t) => ({ value: t.value, label: t.label }));

export function EventDetailsFields({ details, onChange, errors = {}, disabled }) {
  const set = (field) => (e) => onChange({ ...details, [field]: e.target.value });

  return (
    <div className="ch-ae-fields">
      <Input className="ch-ae-fields__wide" label="Event title" value={details.title} onChange={set('title')} error={errors.title} maxLength={190} disabled={disabled} />
      <Select label="Category" value={details.eventType} onChange={set('eventType')} options={TYPE_OPTIONS} error={errors.eventType} disabled={disabled} />
      <Input label="Date" type="date" value={details.eventDate} onChange={set('eventDate')} error={errors.eventDate} disabled={disabled} />
      <Input label="Start time" type="time" value={details.eventTime} onChange={set('eventTime')} error={errors.eventTime} disabled={disabled} />
      <Input label="End time (optional)" type="time" value={details.endTime} onChange={set('endTime')} error={errors.endTime} disabled={disabled} />
      <Input label="Venue" value={details.venueName} onChange={set('venueName')} error={errors.venueName} maxLength={190} placeholder="e.g. Slipway" disabled={disabled} />
      <Input label="Location / address (optional)" value={details.venueAddress} onChange={set('venueAddress')} error={errors.venueAddress} maxLength={255} placeholder="e.g. Msasani, Dar es Salaam" disabled={disabled} />
      <Input label="Organizer name (optional)" value={details.hostName} onChange={set('hostName')} error={errors.hostName} maxLength={190} disabled={disabled} />
      <Input label="Organizer contact (optional)" value={details.organizerContact} onChange={set('organizerContact')} error={errors.organizerContact} maxLength={190} placeholder="Phone or email for buyer questions" disabled={disabled} />
      <Textarea className="ch-ae-fields__wide" label="Description (optional)" value={details.description} onChange={set('description')} error={errors.description} maxLength={5000} rows={5} disabled={disabled} />
    </div>
  );
}
