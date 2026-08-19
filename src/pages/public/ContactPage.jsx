import { useState } from 'react';
import { FiMail, FiMapPin, FiPhone } from 'react-icons/fi';
import { Container, SectionHeader, Seo } from '../../components/common';
import { Input, Textarea, Button, Alert } from '../../components/ui';
import { contactService } from '../../services/contactService';
import { useLanguage } from '../../hooks/useLanguage';

const INITIAL_FORM = { name: '', email: '', subject: '', message: '' };

export function ContactPage() {
  const { t } = useLanguage();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  function handleChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  function validate() {
    const nextErrors = {};
    if (!form.name.trim() || form.name.trim().length < 2) nextErrors.name = t('contact.nameError');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = t('contact.emailError');
    if (!form.message.trim() || form.message.trim().length < 10) {
      nextErrors.message = t('contact.messageError');
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
        message: error.response?.data?.message || t('contact.genericError'),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="ch-contact-page">
      <Seo title="Contact" description="Get in touch with the CardHub team." />
      <Container>
        <SectionHeader eyebrow={t('footer.contact')} title={t('contact.title')} align="center" />

        <div className="ch-contact-page__grid">
          <form className="ch-glass-card ch-contact-page__form" onSubmit={handleSubmit}>
            {status && (
              <Alert variant={status.variant} className="ch-contact-page__alert">
                {status.message}
              </Alert>
            )}
            <Input label={t('contact.fullName')} value={form.name} onChange={handleChange('name')} error={errors.name} required />
            <Input
              type="email"
              label={t('contact.emailAddress')}
              value={form.email}
              onChange={handleChange('email')}
              error={errors.email}
              required
            />
            <Input label={t('contact.subjectOptional')} value={form.subject} onChange={handleChange('subject')} />
            <Textarea
              label={t('contact.message')}
              value={form.message}
              onChange={handleChange('message')}
              error={errors.message}
              required
            />
            <Button type="submit" variant="primary" isLoading={isSubmitting} fullWidth>
              {t('contact.sendMessage')}
            </Button>
          </form>

          <div className="ch-contact-page__info">
            <div className="ch-contact-page__info-item">
              <FiMail aria-hidden="true" />
              <div>
                <p className="ch-label">{t('contact.email')}</p>
                <p className="ch-body-sm">hello@cardhub.co.tz</p>
              </div>
            </div>
            <div className="ch-contact-page__info-item">
              <FiPhone aria-hidden="true" />
              <div>
                <p className="ch-label">{t('contact.phone')}</p>
                <p className="ch-body-sm">+255 000 000 000</p>
              </div>
            </div>
            <div className="ch-contact-page__info-item">
              <FiMapPin aria-hidden="true" />
              <div>
                <p className="ch-label">{t('contact.basedIn')}</p>
                <p className="ch-body-sm">Dar es Salaam, Tanzania</p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
