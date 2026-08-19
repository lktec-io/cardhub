import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input, Button, Alert, Divider } from '../../components/ui';
import { Seo } from '../../components/common';
import { ROUTES } from '../../constants/routes';
import { authService } from '../../services/authService';
import { getErrorMessage } from '../../utils/mapValidationErrors';
import { useLanguage } from '../../hooks/useLanguage';

export function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t('auth.emailError'));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authService.forgotPassword(email);
      setResult(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Seo title="Forgot password" description="Reset your CardHub account password." />
      <div className="ch-auth-form">
        <h1 className="ch-h3">{t('forgotPassword.title')}</h1>
        <p className="ch-body-sm">{t('forgotPassword.subtitle')}</p>

        {error && (
          <Alert variant="danger" className="ch-auth-form__alert">
            {error}
          </Alert>
        )}

        {result ? (
          <Alert variant="success" title={t('forgotPassword.checkEmail')}>
            {result.message}
            {result.data?.resetUrl && (
              <p className="ch-auth-form__dev-note">
                {t('forgotPassword.devNote')}{' '}
                <Link to={result.data.resetUrl.replace(window.location.origin, '')}>{t('forgotPassword.resetLinkText')}</Link>
              </p>
            )}
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <Input
              type="email"
              label={t('auth.emailLabel')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
              {t('forgotPassword.sendLink')}
            </Button>
          </form>
        )}

        <Divider />

        <p className="ch-auth-form__footer">
          {t('forgotPassword.remembered')} <Link to={ROUTES.LOGIN}>{t('login.submit')}</Link>
        </p>
      </div>
    </>
  );
}
