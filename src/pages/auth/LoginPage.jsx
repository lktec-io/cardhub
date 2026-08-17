import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Input, PasswordField, Button, Alert, Divider } from '../../components/ui';
import { Seo } from '../../components/common';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';
import { getErrorMessage } from '../../utils/mapValidationErrors';

export function LoginPage() {
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = 'Please enter a valid email';
    if (!form.password) nextErrors.password = 'Please enter your password';
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
        setFormError('Too many attempts. Please wait a few minutes before trying again.');
      } else {
        setFormError(getErrorMessage(error, 'Invalid email or password'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Seo title="Log in" description="Log in to your CardHub account." />
      <div className="ch-auth-form">
        <h1 className="ch-h3">Welcome back</h1>
        <p className="ch-body-sm">Log in to manage your CardHub invitations.</p>

        {formError && (
          <Alert variant="danger" className="ch-auth-form__alert">
            {formError}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <Input
            type="email"
            label="Email"
            value={form.email}
            onChange={handleChange('email')}
            error={errors.email}
            autoComplete="email"
          />
          <PasswordField
            label="Password"
            value={form.password}
            onChange={handleChange('password')}
            error={errors.password}
            autoComplete="current-password"
          />
          <div className="ch-auth-form__row">
            <Link to={ROUTES.FORGOT_PASSWORD} className="ch-auth-form__link">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
            Log in
          </Button>
        </form>

        <Divider />

        <p className="ch-auth-form__footer">
          Don&rsquo;t have an account? <Link to={ROUTES.REGISTER}>Create one</Link>
        </p>
      </div>
    </>
  );
}
