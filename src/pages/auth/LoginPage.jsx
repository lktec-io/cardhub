import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { FiLock } from 'react-icons/fi';
import { Input, PasswordField, Button, Alert } from '../../components/ui';
import { Seo } from '../../components/common';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { ROUTES } from '../../constants/routes';
import { getErrorMessage } from '../../utils/mapValidationErrors';

/**
 * CardHub staff sign-in (/admin/login). Uses the normal auth API; an
 * account without the admin role is signed straight back out. This is UX
 * only: every /api/v1/admin/* call is authorized server-side, and there is
 * no way to register an account from here.
 */
export function LoginPage() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, logout, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname;
  const redirectTo = from && (from.startsWith(ROUTES.ADMIN) || from.startsWith(ROUTES.DASHBOARD)) ? from : ROUTES.ADMIN;

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
      const signedIn = await login(form);
      if (signedIn?.role !== 'admin') {
        await logout().catch(() => {});
        setFormError(t('adminLogin.notAdmin'));
        return;
      }
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

  if (!isLoading && user?.role === 'admin') return <Navigate to={redirectTo} replace />;

  return (
    <>
      <Seo title="Admin sign in" description="CardHub staff sign-in." noIndex />
      <div className="ch-auth-form">
        <p className="ch-auth-form__eyebrow">
          <FiLock aria-hidden="true" /> {t('adminLogin.eyebrow')}
        </p>
        <h1 className="ch-h3">{t('adminLogin.title')}</h1>
        <p className="ch-body-sm">{t('adminLogin.subtitle')}</p>

        {(formError || (user && user.role !== 'admin')) && (
          <Alert variant="danger" className="ch-auth-form__alert">
            {formError || t('adminLogin.notAdmin')}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <Input
            type="email"
            label={t('auth.emailLabel')}
            value={form.email}
            onChange={handleChange('email')}
            error={errors.email}
            autoComplete="username"
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

          <Button type="submit" variant="brand" fullWidth isLoading={isSubmitting}>
            {t('adminLogin.submit')}
          </Button>
        </form>

        <p className="ch-auth-form__footer">
          <Link to={ROUTES.HOME}>{t('adminLogin.backToSite')}</Link>
        </p>
      </div>
    </>
  );
}
