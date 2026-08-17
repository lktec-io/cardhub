import { useState } from 'react';
import { PasswordField, Button, Alert } from '../../../components/ui';
import { useToast } from '../../../hooks/useToast';
import { usersService } from '../../../services/usersService';
import { mapValidationErrors, getErrorMessage } from '../../../utils/mapValidationErrors';

const INITIAL_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' };

export function SecuritySettingsPage() {
  const toast = useToast();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  function validate() {
    const nextErrors = {};
    if (!form.currentPassword) nextErrors.currentPassword = 'Enter your current password';
    if (!form.newPassword || form.newPassword.length < 8) {
      nextErrors.newPassword = 'New password must be at least 8 characters';
    }
    if (form.confirmPassword !== form.newPassword) nextErrors.confirmPassword = 'Passwords do not match';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await usersService.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setForm(INITIAL_FORM);
      toast.success('Password changed. You’ve been signed out of your other sessions.');
    } catch (error) {
      setErrors(mapValidationErrors(error));
      setFormError(getErrorMessage(error, 'Could not change your password'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="ch-settings-form" onSubmit={handleSubmit} noValidate>
      <h2 className="ch-h4">Security</h2>
      <p className="ch-body-sm">Change your password. This will sign you out of your other active sessions.</p>

      {formError && <Alert variant="danger">{formError}</Alert>}

      <PasswordField
        label="Current password"
        value={form.currentPassword}
        onChange={handleChange('currentPassword')}
        error={errors.currentPassword}
        autoComplete="current-password"
      />
      <PasswordField
        label="New password"
        value={form.newPassword}
        onChange={handleChange('newPassword')}
        error={errors.newPassword}
        autoComplete="new-password"
      />
      <PasswordField
        label="Confirm new password"
        value={form.confirmPassword}
        onChange={handleChange('confirmPassword')}
        error={errors.confirmPassword}
        autoComplete="new-password"
      />

      <Button type="submit" variant="primary" isLoading={isSubmitting}>
        Change password
      </Button>
    </form>
  );
}
