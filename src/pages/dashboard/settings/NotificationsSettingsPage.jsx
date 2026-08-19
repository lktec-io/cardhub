import { useEffect, useState } from 'react';
import { Switch, Spinner } from '../../../components/ui';
import { useToast } from '../../../hooks/useToast';
import { useLanguage } from '../../../hooks/useLanguage';
import { usersService } from '../../../services/usersService';
import { getErrorMessage } from '../../../utils/mapValidationErrors';

const FIELDS = [
  { key: 'emailNotifications', i18nKey: 'settings.notifications.email' },
  { key: 'smsNotifications', i18nKey: 'settings.notifications.sms' },
  { key: 'marketingNotifications', i18nKey: 'settings.notifications.marketing' },
  { key: 'securityNotifications', i18nKey: 'settings.notifications.security' },
];

export function NotificationsSettingsPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const [preferences, setPreferences] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);

  useEffect(() => {
    let isMounted = true;
    usersService
      .getPreferences()
      .then((res) => {
        if (isMounted) setPreferences(res.data.data);
      })
      .catch((error) => toast.error(getErrorMessage(error, t('settings.notifications.loadFailed'))))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleToggle(key, value) {
    const previous = preferences;
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setSavingKey(key);
    try {
      await usersService.updatePreferences({ [key]: value });
    } catch (error) {
      setPreferences(previous);
      toast.error(getErrorMessage(error, t('settings.notifications.saveFailed')));
    } finally {
      setSavingKey(null);
    }
  }

  if (isLoading) {
    return (
      <div className="ch-settings-form__loading">
        <Spinner label={t('settings.notifications.loading')} />
      </div>
    );
  }

  return (
    <div className="ch-settings-form">
      <h2 className="ch-h4">{t('settings.notifications.title')}</h2>
      <p className="ch-body-sm">{t('settings.notifications.description')}</p>

      <div className="ch-settings-form__switches">
        {FIELDS.map((field) => (
          <Switch
            key={field.key}
            label={t(`${field.i18nKey}.label`)}
            description={t(`${field.i18nKey}.description`)}
            checked={Boolean(preferences?.[field.key])}
            disabled={savingKey === field.key}
            onChange={(value) => handleToggle(field.key, value)}
          />
        ))}
      </div>
    </div>
  );
}
