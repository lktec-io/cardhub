import { EventDetailsForm } from '../../../../components/events';

export function DetailsStep({ value, onChange, errors }) {
  return (
    <div>
      <h2 className="ch-h3">Event details</h2>
      <p className="ch-body-sm ch-wizard__intro">Tell us the basics — you can always edit these later.</p>
      <EventDetailsForm value={value} onChange={onChange} errors={errors} />
    </div>
  );
}
