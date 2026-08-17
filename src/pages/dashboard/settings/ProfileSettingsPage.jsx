import { useState } from 'react';
import { Input, Button } from '../../../components/ui';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { usersService } from '../../../services/usersService';
import { mapValidationErrors, getErrorMessage } from '../../../utils/mapValidationErrors';

export function ProfileSettingsPage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrors({});

    if (!form.name.trim() || form.name.trim().length < 2) {
      setErrors({ name: 'Name must be at least 2 characters' });
      return;
    }

    setIsSubmitting(true);
    try {
      await usersService.updateProfile({ name: form.name, phone: form.phone || undefined });
      await refreshUser();
      toast.success('Profile updated successfully');
    } catch (error) {
      setErrors(mapValidationErrors(error));
      toast.error(getErrorMessage(error, 'Could not update your profile'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="ch-settings-form" onSubmit={handleSubmit} noValidate>
      <h2 className="ch-h4">Profile</h2>
      <p className="ch-body-sm">Update your name and phone number.</p>

      <Input label="Email" value={user?.email || ''} disabled hint="Email changes aren't supported yet." />
      <Input label="Full name" value={form.name} onChange={handleChange('name')} error={errors.name} />
      <Input label="Phone" value={form.phone} onChange={handleChange('phone')} error={errors.phone} />

      <Button type="submit" variant="primary" isLoading={isSubmitting}>
        Save changes
      </Button>
    </form>
  );
}
