import { useState } from 'react';
import { PasswordField, Button, Alert } from '../../../components/ui';
import { useToast } from '../../../hooks/useToast';
import { useLanguage } from '../../../hooks/useLanguage';
import { usersService } from '../../../services/usersService';
import { mapValidationErrors, getErrorMessage } from '../../../utils/mapValidationErrors';

const INITIAL_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' };

export function SecuritySettingsPage() {
  const { t } = useLanguage();
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
    if (!form.currentPassword) nextErrors.currentPassword = t('settings.security.currentPasswordError');
    if (!form.newPassword || form.newPassword.length < 8) {
      nextErrors.newPassword = t('settings.security.newPasswordMinError');
    }
    if (form.confirmPassword !== form.newPassword) nextErrors.confirmPassword = t('auth.confirmPasswordError');
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
      toast.success(t('settings.security.changed'));
    } catch (error) {
      setErrors(mapValidationErrors(error));
      setFormError(getErrorMessage(error, t('settings.security.changeFailed')));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="ch-settings-form" onSubmit={handleSubmit} noValidate>
      <h2 className="ch-h4">{t('settings.security.title')}</h2>
      <p className="ch-body-sm">{t('settings.security.description')}</p>

      {formError && <Alert variant="danger">{formError}</Alert>}

      <PasswordField
        label={t('settings.security.currentPassword')}
        value={form.currentPassword}
        onChange={handleChange('currentPassword')}
        error={errors.currentPassword}
        autoComplete="current-password"
      />
      <PasswordField
        label={t('settings.security.newPassword')}
        value={form.newPassword}
        onChange={handleChange('newPassword')}
        error={errors.newPassword}
        autoComplete="new-password"
      />
      <PasswordField
        label={t('settings.security.confirmNewPassword')}
        value={form.confirmPassword}
        onChange={handleChange('confirmPassword')}
        error={errors.confirmPassword}
        autoComplete="new-password"
      />

      <Button type="submit" variant="primary" isLoading={isSubmitting}>
        {t('settings.security.changePassword')}
      </Button>
    </form>
  );
}
