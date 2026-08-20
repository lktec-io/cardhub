import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiAlertCircle, FiArrowRight, FiCreditCard } from 'react-icons/fi';
import { Container, SectionHeader, Seo } from '../../components/common';
import { Button, Input, Select, Radio, EmptyState, GlassCard, Alert } from '../../components/ui';
import { TemplateThumb } from '../../components/templates';
import { templatesService } from '../../services/templatesService';
import { checkoutService } from '../../services/checkoutService';
import { getErrorMessage, mapValidationErrors } from '../../utils/mapValidationErrors';
import { formatCardPrice } from '../../constants/pricingTiers';
import { EVENT_TYPES } from '../../constants/eventTypes';
import { GUEST_TYPE_OPTIONS } from '../../constants/orderStatus';
import { ROUTES } from '../../constants/routes';
import { useLanguage } from '../../hooks/useLanguage';

/**
 * A real card purchase — separate from the free /try flow (TryPage.jsx),
 * which stays untouched. Same server-trusted-price principle throughout:
 * this page only ever displays `template.priceTzs` as loaded from the
 * catalogue API; the actual amount charged is computed again, from
 * scratch, server-side in payment.service.js — nothing here is ever sent
 * to or trusted from the client for pricing.
 */
export function CheckoutPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('templateId');

  const [template, setTemplate] = useState(null);
  const [templateStatus, setTemplateStatus] = useState('loading');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [eventType, setEventType] = useState('');
  const [eventName, setEventName] = useState('');
  const [venue, setVenue] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [guestType, setGuestType] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitStatus, setSubmitStatus] = useState('idle');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!templateId) return;
    templatesService
      .getOne(templateId)
      .then((res) => {
        setTemplate(res.data.data.template);
        setTemplateStatus('success');
      })
      .catch(() => setTemplateStatus('error'));
  }, [templateId]);

  if (!templateId) {
    return (
      <div className="ch-checkout-page">
        <Seo title="Checkout" description="Complete your CardHub purchase." />
        <Container>
          <EmptyState
            icon={<FiAlertCircle />}
            title={t('checkout.chooseCardFirst')}
            action={
              <Link to={ROUTES.TEMPLATES} className="ch-btn ch-btn--primary">
                {t('checkout.browseCatalogue')}
              </Link>
            }
          />
        </Container>
      </div>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitStatus('submitting');
    setSubmitError('');
    setFieldErrors({});

    try {
      const res = await checkoutService.initiate({
        name: name.trim(),
        phone: phone.trim(),
        templateId: template.id,
        quantity: 1,
        eventType,
        eventName: eventName.trim(),
        venue: venue.trim() || undefined,
        eventDate: eventDate || undefined,
        eventTime: eventTime || undefined,
        guestType: guestType || undefined,
        method: 'mobile_money',
      });
      const { order } = res.data.data;
      navigate(ROUTES.paymentStatus(order.publicUrl.split('/').pop()));
    } catch (error) {
      setFieldErrors(mapValidationErrors(error));
      setSubmitError(getErrorMessage(error, t('checkout.genericError')));
      setSubmitStatus('error');
    }
  }

  if (templateStatus === 'error') {
    return (
      <div className="ch-checkout-page">
        <Seo title="Checkout" description="Complete your CardHub purchase." />
        <Container>
          <EmptyState
            icon={<FiAlertCircle />}
            title={t('checkout.chooseCardFirst')}
            action={
              <Link to={ROUTES.TEMPLATES} className="ch-btn ch-btn--primary">
                {t('checkout.browseCatalogue')}
              </Link>
            }
          />
        </Container>
      </div>
    );
  }

  if (templateStatus === 'loading' || !template) {
    return (
      <div className="ch-checkout-page">
        <Container>
          <div className="ch-checkout-page__loading" />
        </Container>
      </div>
    );
  }

  return (
    <div className="ch-checkout-page">
      <Seo title="Checkout" description="Complete your CardHub purchase." />
      <Container>
        <SectionHeader eyebrow={t('checkout.title')} title={t('checkout.title')} description={t('checkout.description')} align="center" />

        <form onSubmit={handleSubmit} className="ch-checkout-page__layout">
          <div className="ch-checkout-page__form">
            <GlassCard className="ch-checkout-page__section">
              <h2 className="ch-h4">{t('checkout.yourDetails')}</h2>
              <Input label={t('try.nameLabel')} value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} required />
              <Input label={t('try.phoneLabel')} type="tel" placeholder="e.g. 0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} error={fieldErrors.phone} required />
            </GlassCard>

            <GlassCard className="ch-checkout-page__section">
              <h2 className="ch-h4">{t('checkout.eventDetails')}</h2>
              <Select
                label={t('try.eventType')}
                placeholder={t('try.eventType')}
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                options={EVENT_TYPES.map((et) => ({ value: et.value, label: t(`category.${et.value}`) }))}
                error={fieldErrors.eventType}
              />
              <Input label={t('try.eventName')} placeholder={t('try.eventNamePlaceholder')} value={eventName} onChange={(e) => setEventName(e.target.value)} error={fieldErrors.eventName} required />
              <Input label={t('try.venue')} placeholder={t('try.venuePlaceholder')} value={venue} onChange={(e) => setVenue(e.target.value)} error={fieldErrors.venue} />
              <div className="ch-checkout-page__row">
                <Input label={t('try.eventDate')} type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} error={fieldErrors.eventDate} />
                <Input label={t('try.eventTime')} type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} error={fieldErrors.eventTime} />
              </div>
              {eventType === 'wedding' && (
                <div>
                  <p className="ch-field__label" style={{ marginBottom: 'var(--space-2)' }}>{t('try.guestType')}</p>
                  <div className="ch-checkout-page__row">
                    {GUEST_TYPE_OPTIONS.map((opt) => (
                      <Radio key={opt.value} name="guestType" label={t(opt.labelKey)} checked={guestType === opt.value} onChange={() => setGuestType(opt.value)} />
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>

            <GlassCard className="ch-checkout-page__section">
              <h2 className="ch-h4">{t('checkout.paymentMethod')}</h2>
              <div className="ch-checkout-page__payment-method">
                <FiCreditCard aria-hidden="true" />
                <span>{t('checkout.mobileMoney')}</span>
              </div>
              <p className="ch-caption">{t('checkout.savedOrderNote')}</p>
            </GlassCard>

            {submitStatus === 'error' && (
              <Alert variant="danger">{submitError}</Alert>
            )}
          </div>

          <GlassCard className="ch-checkout-page__summary">
            <h2 className="ch-h4">{t('checkout.orderSummary')}</h2>
            <TemplateThumb template={template} className="ch-checkout-page__summary-thumb" />
            <dl className="ch-checkout-page__summary-list">
              <div>
                <dt>{t('checkout.card')}</dt>
                <dd>{template.name}</dd>
              </div>
              <div>
                <dt>{t('checkout.tier')}</dt>
                <dd>{template.pricingTier}</dd>
              </div>
              <div className="ch-checkout-page__summary-total">
                <dt>{t('checkout.total')}</dt>
                <dd>{formatCardPrice(template.priceTzs)}</dd>
              </div>
            </dl>
            <Button type="submit" variant="primary" fullWidth isLoading={submitStatus === 'submitting'}>
              {t('checkout.payNow')} <FiArrowRight aria-hidden="true" />
            </Button>
          </GlassCard>
        </form>
      </Container>
    </div>
  );
}
