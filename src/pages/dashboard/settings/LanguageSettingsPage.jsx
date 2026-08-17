import { useState } from 'react';
import { Radio } from '../../../components/ui';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { usersService } from '../../../services/usersService';
import { getErrorMessage } from '../../../utils/mapValidationErrors';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'sw', label: 'Kiswahili' },
];

export function LanguageSettingsPage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [language, setLanguage] = useState(user?.preferredLanguage || 'en');
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(value) {
    setLanguage(value);
    setIsSaving(true);
    try {
      await usersService.updatePreferences({ preferredLanguage: value });
      await refreshUser();
      toast.success('Language preference saved');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save your language preference'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="ch-settings-form">
      <h2 className="ch-h4">Language</h2>
      <p className="ch-body-sm">
        Choose your preferred language. CardHub currently displays in English — full Kiswahili
        translation is on the roadmap.
      </p>

      <div className="ch-settings-form__radios">
        {LANGUAGES.map((option) => (
          <Radio
            key={option.value}
            name="language"
            label={option.label}
            value={option.value}
            checked={language === option.value}
            disabled={isSaving}
            onChange={() => handleChange(option.value)}
          />
        ))}
      </div>
    </div>
  );
}
