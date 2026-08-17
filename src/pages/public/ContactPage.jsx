import { useState } from 'react';
import { FiMail, FiMapPin, FiPhone } from 'react-icons/fi';
import { Container, SectionHeader, Seo } from '../../components/common';
import { Input, Textarea, Button, Alert } from '../../components/ui';
import { contactService } from '../../services/contactService';

const INITIAL_FORM = { name: '', email: '', subject: '', message: '' };

export function ContactPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  function handleChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  function validate() {
    const nextErrors = {};
    if (!form.name.trim() || form.name.trim().length < 2) nextErrors.name = 'Please enter your name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = 'Please enter a valid email';
    if (!form.message.trim() || form.message.trim().length < 10) {
      nextErrors.message = 'Please share a few more details (at least 10 characters)';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await contactService.submit(form);
      setStatus({ variant: 'success', message: res.data.message });
      setForm(INITIAL_FORM);
    } catch (error) {
      setStatus({
        variant: 'danger',
        message: error.response?.data?.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="ch-contact-page">
      <Seo title="Contact" description="Get in touch with the CardHub team." />
      <Container>
        <SectionHeader eyebrow="Contact" title="We'd love to hear from you" align="center" />

        <div className="ch-contact-page__grid">
          <form className="ch-glass-card ch-contact-page__form" onSubmit={handleSubmit}>
            {status && (
              <Alert variant={status.variant} className="ch-contact-page__alert">
                {status.message}
              </Alert>
            )}
            <Input label="Full name" value={form.name} onChange={handleChange('name')} error={errors.name} required />
            <Input
              type="email"
              label="Email address"
              value={form.email}
              onChange={handleChange('email')}
              error={errors.email}
              required
            />
            <Input label="Subject (optional)" value={form.subject} onChange={handleChange('subject')} />
            <Textarea
              label="Message"
              value={form.message}
              onChange={handleChange('message')}
              error={errors.message}
              required
            />
            <Button type="submit" variant="primary" isLoading={isSubmitting} fullWidth>
              Send message
            </Button>
          </form>

          <div className="ch-contact-page__info">
            <div className="ch-contact-page__info-item">
              <FiMail aria-hidden="true" />
              <div>
                <p className="ch-label">Email</p>
                <p className="ch-body-sm">hello@cardhub.co.tz</p>
              </div>
            </div>
            <div className="ch-contact-page__info-item">
              <FiPhone aria-hidden="true" />
              <div>
                <p className="ch-label">Phone</p>
                <p className="ch-body-sm">+255 000 000 000</p>
              </div>
            </div>
            <div className="ch-contact-page__info-item">
              <FiMapPin aria-hidden="true" />
              <div>
                <p className="ch-label">Based in</p>
                <p className="ch-body-sm">Dar es Salaam, Tanzania</p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
