import { getEventTypeLabel } from '../../../../constants/eventTypes';

function formatDate(value) {
  if (!value) return 'Not set';
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function ReviewStep({ formData, template, onEditStep }) {
  const rows = [
    { label: 'Event type', value: getEventTypeLabel(formData.eventType), step: 1 },
    { label: 'Template', value: template?.name || '—', step: 2 },
    { label: 'Event name', value: formData.title || '—', step: 3 },
    { label: 'Host', value: formData.hostName || '—', step: 3 },
    { label: 'Date', value: formatDate(formData.eventDate), step: 3 },
    { label: 'Time', value: formData.eventTime || 'Not set', step: 3 },
    { label: 'Timezone', value: formData.timezone, step: 3 },
    { label: 'Venue', value: formData.venueName || 'Not set', step: 3 },
    { label: 'Address', value: formData.venueAddress || 'Not set', step: 3 },
    { label: 'Description', value: formData.description || 'Not set', step: 3 },
  ];

  return (
    <div>
      <h2 className="ch-h3">Review your invitation</h2>
      <p className="ch-body-sm ch-wizard__intro">Confirm everything looks right before creating your draft.</p>

      <dl className="ch-review-summary">
        {rows.map((row) => (
          <div className="ch-review-summary__row" key={row.label}>
            <dt>{row.label}</dt>
            <dd>
              {row.value}{' '}
              <button type="button" className="ch-auth-form__link" onClick={() => onEditStep(row.step)}>
                Edit
              </button>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
