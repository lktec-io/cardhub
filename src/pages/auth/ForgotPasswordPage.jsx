import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input, Button, Alert, Divider } from '../../components/ui';
import { Seo } from '../../components/common';
import { ROUTES } from '../../constants/routes';
import { authService } from '../../services/authService';
import { getErrorMessage } from '../../utils/mapValidationErrors';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email');
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
        <h1 className="ch-h3">Reset your password</h1>
        <p className="ch-body-sm">Enter the email on your account and we&rsquo;ll send you a reset link.</p>

        {error && (
          <Alert variant="danger" className="ch-auth-form__alert">
            {error}
          </Alert>
        )}

        {result ? (
          <Alert variant="success" title="Check your email">
            {result.message}
            {result.data?.resetUrl && (
              <p className="ch-auth-form__dev-note">
                Development mode &mdash; no email provider is configured yet, so here&rsquo;s your reset link:{' '}
                <Link to={result.data.resetUrl.replace(window.location.origin, '')}>Reset your password</Link>
              </p>
            )}
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <Input
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
              Send reset link
            </Button>
          </form>
        )}

        <Divider />

        <p className="ch-auth-form__footer">
          Remembered your password? <Link to={ROUTES.LOGIN}>Log in</Link>
        </p>
      </div>
    </>
  );
}
