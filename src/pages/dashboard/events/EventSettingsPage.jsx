import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { EventDetailsForm } from '../../../components/events';
import { Button, Alert } from '../../../components/ui';
import { eventsService } from '../../../services/eventsService';
import { useToast } from '../../../hooks/useToast';
import { mapValidationErrors, getErrorMessage } from '../../../utils/mapValidationErrors';

export function EventSettingsPage() {
  const { event, reload } = useOutletContext();
  const toast = useToast();

  const [form, setForm] = useState({
    title: event.title || '',
    hostName: event.hostName || '',
    eventDate: event.eventDate || '',
    eventTime: event.eventTime || '',
    timezone: event.timezone,
    venueName: event.venue?.name || '',
    venueAddress: event.venue?.address || '',
    description: event.description || '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event_) {
    event_.preventDefault();
    setFormError(null);
    setErrors({});

    if (!form.title || form.title.trim().length < 2) {
      setErrors({ title: 'Event name is required' });
      return;
    }

    setIsSaving(true);
    try {
      await eventsService.update(event.id, form);
      toast.success('Event details saved');
      reload();
    } catch (error) {
      setErrors(mapValidationErrors(error));
      setFormError(getErrorMessage(error, 'Could not save your changes'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2 className="ch-h4">Edit event details</h2>
      <p className="ch-body-sm ch-wizard__intro">Changes are saved to this event only.</p>

      {formError && (
        <Alert variant="danger" className="ch-auth-form__alert">
          {formError}
        </Alert>
      )}

      <EventDetailsForm value={form} onChange={handleChange} errors={errors} />

      <div className="ch-event-settings__submit">
        <Button type="submit" variant="primary" isLoading={isSaving}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
