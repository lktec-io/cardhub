import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { PasswordField, Button, Alert } from '../../components/ui';
import { Seo } from '../../components/common';
import { ROUTES } from '../../constants/routes';
import { authService } from '../../services/authService';
import { getErrorMessage } from '../../utils/mapValidationErrors';

export function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  function handleChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  function validate() {
    const nextErrors = {};
    if (!form.password || form.password.length < 8) nextErrors.password = 'Password must be at least 8 characters';
    if (form.confirmPassword !== form.password) nextErrors.confirmPassword = 'Passwords do not match';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await authService.resetPassword({ token, password: form.password });
      setIsDone(true);
    } catch (error) {
      setFormError(getErrorMessage(error, 'This reset link is invalid or has expired.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isDone) {
    return (
      <>
        <Seo title="Password reset" />
        <div className="ch-auth-form">
          <Alert variant="success" title="Password reset successfully">
            You can now log in with your new password.
          </Alert>
          <Button variant="primary" fullWidth onClick={() => navigate(ROUTES.LOGIN, { replace: true })}>
            Go to login
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Reset password" description="Choose a new password for your CardHub account." />
      <div className="ch-auth-form">
        <h1 className="ch-h3">Choose a new password</h1>
        <p className="ch-body-sm">Enter and confirm your new password below.</p>

        {formError && (
          <Alert variant="danger" className="ch-auth-form__alert">
            {formError}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <PasswordField
            label="New password"
            value={form.password}
            onChange={handleChange('password')}
            error={errors.password}
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm new password"
            value={form.confirmPassword}
            onChange={handleChange('confirmPassword')}
            error={errors.confirmPassword}
            autoComplete="new-password"
          />
          <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
            Reset password
          </Button>
        </form>

        <p className="ch-auth-form__footer">
          <Link to={ROUTES.LOGIN}>Back to login</Link>
        </p>
      </div>
    </>
  );
}
