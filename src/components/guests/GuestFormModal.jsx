import { useState } from 'react';
import { Modal, Button, Input, Select, Textarea, Alert } from '../ui';
import { RSVP_STATUS_OPTIONS } from '../../constants/rsvpStatus';
import { mapValidationErrors, getErrorMessage } from '../../utils/mapValidationErrors';

const EMPTY_FORM = { name: '', phone: '', email: '', partySize: 1, status: 'pending', notes: '' };

function formFromGuest(guest) {
  return guest
    ? {
        name: guest.name || '',
        phone: guest.phone || '',
        email: guest.email || '',
        partySize: guest.partySize || 1,
        status: guest.status || 'pending',
        notes: guest.notes || '',
      }
    : EMPTY_FORM;
}

export function GuestFormModal({ isOpen, onClose, onSubmit, guest = null }) {
  const [form, setForm] = useState(() => formFromGuest(guest));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Re-seed the form whenever the modal opens for a (possibly different)
  // guest — adjusted during render, not in an effect, so there's no extra
  // render pass. See https://react.dev/learn/you-might-not-need-an-effect
  const [lastOpenKey, setLastOpenKey] = useState(null);
  const openKey = isOpen ? guest?.id || 'new' : null;
  if (isOpen && openKey !== lastOpenKey) {
    setLastOpenKey(openKey);
    setForm(formFromGuest(guest));
    if (Object.keys(errors).length) setErrors({});
    if (formError) setFormError(null);
  }

  function handleChange(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) {
      setErrors({ name: 'Guest name is required' });
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit({ ...form, partySize: Number(form.partySize) || 1, phone: form.phone || undefined, email: form.email || undefined });
      onClose();
    } catch (error) {
      setErrors(mapValidationErrors(error));
      setFormError(getErrorMessage(error, 'Could not save this guest'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={guest ? 'Edit guest' : 'Add guest'} size="sm">
      <form onSubmit={handleSubmit} noValidate className="ch-guest-form">
        {formError && <Alert variant="danger">{formError}</Alert>}
        <Input label="Full name" value={form.name} onChange={handleChange('name')} error={errors.name} />
        <Input label="Phone (optional)" value={form.phone} onChange={handleChange('phone')} error={errors.phone} />
        <Input label="Email (optional)" value={form.email} onChange={handleChange('email')} error={errors.email} />
        <div className="ch-event-form__row">
          <Input type="number" min="1" max="20" label="Party size" value={form.partySize} onChange={handleChange('partySize')} error={errors.partySize} />
          <Select label="RSVP status" value={form.status} onChange={handleChange('status')} options={RSVP_STATUS_OPTIONS} />
        </div>
        <Textarea label="Notes (optional)" value={form.notes} onChange={handleChange('notes')} error={errors.notes} />
        <Button type="submit" variant="primary" fullWidth isLoading={isSaving}>
          {guest ? 'Save changes' : 'Add guest'}
        </Button>
      </form>
    </Modal>
  );
}
