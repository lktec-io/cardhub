import { useState } from 'react';
import { Radio } from '../../../components/ui';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { useLanguage } from '../../../hooks/useLanguage';
import { usersService } from '../../../services/usersService';
import { getErrorMessage } from '../../../utils/mapValidationErrors';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'sw', label: 'Kiswahili' },
];

/**
 * Two things named "language preference" used to exist and disagree: the
 * real UI toggle (LanguageContext, localStorage-backed, drives every
 * translated string via t()) and this page (only wrote user.preferredLanguage
 * to the backend, which nothing actually read). Picking a language here
 * now does both — applies it immediately via setLanguage (so it's the
 * same single source of truth as the navbar toggle) and persists it to
 * the account for cross-device sync.
 */
export function LanguageSettingsPage() {
  const { user, refreshUser } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(value) {
    setLanguage(value);
    setIsSaving(true);
    try {
      await usersService.updatePreferences({ preferredLanguage: value });
      await refreshUser();
      toast.success(t('settings.language.saved'));
    } catch (error) {
      toast.error(getErrorMessage(error, t('settings.language.saveFailed')));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="ch-settings-form">
      <h2 className="ch-h4">{t('settings.language.title')}</h2>
      <p className="ch-body-sm">{t('settings.language.description')}</p>

      <div className="ch-settings-form__radios">
        {LANGUAGES.map((option) => (
          <Radio
            key={option.value}
            name="language"
            label={option.label}
            value={option.value}
            checked={(user?.preferredLanguage || language) === option.value}
            disabled={isSaving}
            onChange={() => handleChange(option.value)}
          />
        ))}
      </div>
    </div>
  );
}
