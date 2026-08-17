import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input, PasswordField, Button, Alert, Divider } from '../../components/ui';
import { Seo } from '../../components/common';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';
import { mapValidationErrors, getErrorMessage } from '../../utils/mapValidationErrors';

const INITIAL_FORM = { name: '', email: '', phone: '', password: '', confirmPassword: '' };

function validate(form) {
  const errors = {};
  if (!form.name.trim() || form.name.trim().length < 2) errors.name = 'Please enter your full name';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Please enter a valid email';
  if (form.phone && !/^[0-9+()\-\s]{7,20}$/.test(form.phone)) errors.phone = 'Please enter a valid phone number';
  if (!form.password || form.password.length < 8) errors.password = 'Password must be at least 8 characters';
  if (form.confirmPassword !== form.password) errors.confirmPassword = 'Passwords do not match';
  return errors;
}

export function RegisterPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  function handleChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);

    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await register({ name: form.name, email: form.email, phone: form.phone || undefined, password: form.password });
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (error) {
      setErrors(mapValidationErrors(error));
      setFormError(getErrorMessage(error, 'We couldn’t create your account. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Seo title="Create your account" description="Create your CardHub account to start designing invitations." />
      <div className="ch-auth-form">
        <h1 className="ch-h3">Welcome to CardHub</h1>
        <p className="ch-body-sm">Create beautiful invitations and bring your event together.</p>

        {formError && (
          <Alert variant="danger" className="ch-auth-form__alert">
            {formError}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <Input label="Full name" value={form.name} onChange={handleChange('name')} error={errors.name} autoComplete="name" />
          <Input
            type="email"
            label="Email"
            value={form.email}
            onChange={handleChange('email')}
            error={errors.email}
            autoComplete="email"
          />
          <Input
            type="tel"
            label="Phone (optional)"
            value={form.phone}
            onChange={handleChange('phone')}
            error={errors.phone}
            autoComplete="tel"
          />
          <PasswordField
            label="Password"
            value={form.password}
            onChange={handleChange('password')}
            error={errors.password}
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm password"
            value={form.confirmPassword}
            onChange={handleChange('confirmPassword')}
            error={errors.confirmPassword}
            autoComplete="new-password"
          />

          <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
            Create my account
          </Button>
        </form>

        <Divider />

        <p className="ch-auth-form__footer">
          Already have an account? <Link to={ROUTES.LOGIN}>Log in</Link>
        </p>
      </div>
    </>
  );
}
