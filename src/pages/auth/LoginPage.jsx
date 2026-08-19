import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Input, PasswordField, Button, Alert, Divider } from '../../components/ui';
import { Seo } from '../../components/common';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { ROUTES } from '../../constants/routes';
import { getErrorMessage } from '../../utils/mapValidationErrors';

export function LoginPage() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = location.state?.from?.pathname || ROUTES.DASHBOARD;

  function handleChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  function validate() {
    const nextErrors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = t('auth.emailError');
    if (!form.password) nextErrors.password = t('auth.passwordRequiredError');
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await login(form);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (error.response?.status === 429) {
        setFormError(t('auth.rateLimited'));
      } else {
        setFormError(getErrorMessage(error, t('login.invalidCredentials')));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Seo title="Log in" description="Log in to your CardHub account." />
      <div className="ch-auth-form">
        <h1 className="ch-h3">{t('login.welcomeBack')}</h1>
        <p className="ch-body-sm">{t('login.subtitle')}</p>

        {formError && (
          <Alert variant="danger" className="ch-auth-form__alert">
            {formError}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <Input
            type="email"
            label={t('auth.emailLabel')}
            value={form.email}
            onChange={handleChange('email')}
            error={errors.email}
            autoComplete="email"
          />
          <PasswordField
            label={t('auth.passwordLabel')}
            value={form.password}
            onChange={handleChange('password')}
            error={errors.password}
            autoComplete="current-password"
          />
          <div className="ch-auth-form__row">
            <Link to={ROUTES.FORGOT_PASSWORD} className="ch-auth-form__link">
              {t('login.forgotPassword')}
            </Link>
          </div>

          <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
            {t('login.submit')}
          </Button>
        </form>

        <Divider />

        <p className="ch-auth-form__footer">
          {t('login.noAccount')} <Link to={ROUTES.REGISTER}>{t('login.createOne')}</Link>
        </p>
      </div>
    </>
  );
}
