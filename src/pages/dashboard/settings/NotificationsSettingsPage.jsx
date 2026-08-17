import { useEffect, useState } from 'react';
import { Switch, Spinner } from '../../../components/ui';
import { useToast } from '../../../hooks/useToast';
import { usersService } from '../../../services/usersService';
import { getErrorMessage } from '../../../utils/mapValidationErrors';

const FIELDS = [
  { key: 'emailNotifications', label: 'Email notifications', description: 'Account and activity updates by email.' },
  { key: 'smsNotifications', label: 'SMS notifications', description: 'Important updates by text message.' },
  { key: 'marketingNotifications', label: 'Marketing communications', description: 'Product news and occasional offers.' },
  { key: 'securityNotifications', label: 'Security notifications', description: 'Alerts about sign-ins and account changes.' },
];

export function NotificationsSettingsPage() {
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
      .catch((error) => toast.error(getErrorMessage(error, 'Could not load your preferences')))
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
      toast.error(getErrorMessage(error, 'Could not save your preference'));
    } finally {
      setSavingKey(null);
    }
  }

  if (isLoading) {
    return (
      <div className="ch-settings-form__loading">
        <Spinner label="Loading preferences" />
      </div>
    );
  }

  return (
    <div className="ch-settings-form">
      <h2 className="ch-h4">Notifications</h2>
      <p className="ch-body-sm">Choose what CardHub keeps you updated about.</p>

      <div className="ch-settings-form__switches">
        {FIELDS.map((field) => (
          <Switch
            key={field.key}
            label={field.label}
            description={field.description}
            checked={Boolean(preferences?.[field.key])}
            disabled={savingKey === field.key}
            onChange={(value) => handleToggle(field.key, value)}
          />
        ))}
      </div>
    </div>
  );
}
