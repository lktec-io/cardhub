import { useState } from 'react';
import { Input, Button } from '../../../components/ui';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { useLanguage } from '../../../hooks/useLanguage';
import { usersService } from '../../../services/usersService';
import { mapValidationErrors, getErrorMessage } from '../../../utils/mapValidationErrors';

export function ProfileSettingsPage() {
  const { t } = useLanguage();
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
      setErrors({ name: t('settings.profile.nameMinError') });
      return;
    }

    setIsSubmitting(true);
    try {
      await usersService.updateProfile({ name: form.name, phone: form.phone || undefined });
      await refreshUser();
      toast.success(t('settings.profile.updated'));
    } catch (error) {
      setErrors(mapValidationErrors(error));
      toast.error(getErrorMessage(error, t('settings.profile.updateFailed')));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="ch-settings-form" onSubmit={handleSubmit} noValidate>
      <h2 className="ch-h4">{t('settings.profile.title')}</h2>
      <p className="ch-body-sm">{t('settings.profile.description')}</p>

      <Input label={t('auth.emailLabel')} value={user?.email || ''} disabled hint={t('settings.profile.emailHint')} />
      <Input label={t('settings.profile.fullName')} value={form.name} onChange={handleChange('name')} error={errors.name} />
      <Input label={t('settings.profile.phone')} value={form.phone} onChange={handleChange('phone')} error={errors.phone} />

      <Button type="submit" variant="primary" isLoading={isSubmitting}>
        {t('settings.profile.saveChanges')}
      </Button>
    </form>
  );
}
