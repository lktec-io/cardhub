import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiAlertCircle, FiArrowLeft, FiArrowRight, FiCheckCircle } from 'react-icons/fi';
import { Container, SectionHeader, Seo, InvitationPreview } from '../../components/common';
import { Button, Input, Select, Radio, Checkbox, EmptyState, Skeleton, GlassCard, Badge } from '../../components/ui';
import { TemplateThumb } from '../../components/templates';
import { templatesService } from '../../services/templatesService';
import { ordersService } from '../../services/ordersService';
import { getErrorMessage, mapValidationErrors } from '../../utils/mapValidationErrors';
import { formatCardPrice } from '../../constants/pricingTiers';
import { EVENT_TYPES } from '../../constants/eventTypes';
import { DELIVERY_CHANNELS, CHANNEL_STATUS_BADGE, GUEST_TYPE_OPTIONS } from '../../constants/orderStatus';
import { ROUTES } from '../../constants/routes';
import { useLanguage } from '../../hooks/useLanguage';

export function TryPage() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get('templateId');

  const STEPS = [
    t('try.step.name'),
    t('try.step.phone'),
    t('try.step.card'),
    t('try.step.event'),
    t('try.step.preview'),
    t('try.step.send'),
  ];

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [eventType, setEventType] = useState('');
  const [eventName, setEventName] = useState('');
  const [venue, setVenue] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [guestType, setGuestType] = useState('');
  const [channels, setChannels] = useState([DELIVERY_CHANNELS[0].value, DELIVERY_CHANNELS[1].value]);
  const [fieldErrors, setFieldErrors] = useState({});

  const [templates, setTemplates] = useState([]);
  const [catalogueStatus, setCatalogueStatus] = useState('loading');

  const [submitStatus, setSubmitStatus] = useState('idle'); // idle | submitting | success | error
  const [order, setOrder] = useState(null);
  const [deliveryMessage, setDeliveryMessage] = useState('');
  const [submitError, setSubmitError] = useState('');

  function toggleChannel(value) {
    setChannels((prev) => (prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]));
  }

  useEffect(() => {
    templatesService
      .list({ limit: 12 })
      .then((res) => {
        const list = res.data.data.templates;
        setTemplates(list);
        setCatalogueStatus(list.length === 0 ? 'empty' : 'success');
        if (preselectedId) {
          const match = list.find((t2) => String(t2.id) === String(preselectedId));
          if (match) setSelectedTemplate(match);
        }
      })
      .catch(() => setCatalogueStatus('error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goNext() {
    const errors = {};
    if (step === 0 && name.trim().length < 2) errors.name = t('try.nameError');
    if (step === 1 && !/^[0-9+()\-\s]{7,20}$/.test(phone)) errors.phone = t('try.phoneError');
    if (step === 2 && !selectedTemplate) errors.templateId = t('try.chooseCardError');
    if (step === 3) {
      if (!eventType) errors.eventType = t('try.eventTypeError');
      if (!eventName || eventName.trim().length < 2) errors.eventName = t('try.eventNameError');
    }

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    if (channels.length === 0) {
      setFieldErrors({ channels: t('try.channelError') });
      return;
    }

    setSubmitStatus('submitting');
    setSubmitError('');
    // Fresh per deliberate submit attempt — if the browser/network retries
    // this exact request behind the scenes, the retry carries the same
    // key and the backend replays the already-computed result instead of
    // creating a second order and sending the card twice. See
    // backend/src/utils/idempotencyCache.js.
    const idempotencyKey = crypto.randomUUID();

    try {
      const res = await ordersService.submitTryService({
        name: name.trim(),
        phone: phone.trim(),
        templateId: selectedTemplate.id,
        quantity: 1,
        channels,
        eventType,
        eventName: eventName.trim(),
        venue: venue.trim() || undefined,
        eventDate: eventDate || undefined,
        eventTime: eventTime || undefined,
        guestType: guestType || undefined,
        idempotencyKey,
      });
      setOrder(res.data.data.order);
      setDeliveryMessage(res.data.message);
      setSubmitStatus('success');
    } catch (error) {
      setFieldErrors(mapValidationErrors(error));
      setSubmitError(getErrorMessage(error, t('try.genericError')));
      setSubmitStatus('error');
    }
  }

  if (submitStatus === 'success' && order) {
    return (
      <div className="ch-try-page">
        <Seo title="Try Our Service" description="Try CardHub's digital card service — request saved." />
        <Container>
          <div className="ch-try-page__success">
            <FiCheckCircle className="ch-try-page__success-icon" aria-hidden="true" />
            <h1 className="ch-h2">
              {t('try.successThanks')}, {name.split(' ')[0]} — {t('try.successHeading')}
            </h1>
            <p className="ch-body-lg">
              We've saved your request for a <strong>{order.template?.name}</strong> card ({order.pricingTier}) at{' '}
              {formatCardPrice(order.unitPriceTzs)}.
            </p>
            <p className="ch-try-page__invitation-number">
              {t('try.invitationNumber')}: <strong>#{order.invitationNumber}</strong>
            </p>
            <p className="ch-body-lg">{deliveryMessage}</p>
            <div className="ch-try-page__success-actions">
              {order.sms?.status !== 'not_requested' && (
                <Badge variant={CHANNEL_STATUS_BADGE[order.sms?.status] || 'default'}>
                  {t('channel.sms')}: {t(`status.${order.sms?.status}`)}
                </Badge>
              )}
              {order.whatsapp?.status !== 'not_requested' && (
                <Badge variant={CHANNEL_STATUS_BADGE[order.whatsapp?.status] || 'default'}>
                  {t('channel.whatsapp')}: {t(`status.${order.whatsapp?.status}`)}
                </Badge>
              )}
            </div>
            <p className="ch-body-sm ch-try-page__success-note">
              {t('try.deliveryHonestyNote')} {t('try.yourCardLink')}{' '}
              {order.publicUrl && (
                <a href={order.publicUrl} target="_blank" rel="noreferrer">
                  {order.publicUrl}
                </a>
              )}
            </p>
            <div className="ch-try-page__success-actions">
              <Link to={ROUTES.TEMPLATES} className="ch-btn ch-btn--secondary">
                {t('try.browseMore')}
              </Link>
              <Link to={ROUTES.REGISTER} className="ch-btn ch-btn--primary">
                {t('try.createAccount')}
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="ch-try-page">
      <Seo title="Try Our Service" description="Try CardHub's digital card service in a few quick steps — no account required." />
      <Container>
        <SectionHeader eyebrow={t('try.eyebrow')} title={t('try.title')} description={t('try.description')} align="center" />

        <div className="ch-try-page__stepper" aria-label="Progress">
          {STEPS.map((label, i) => (
            <span key={label} className={`ch-try-page__step ${i === step ? 'ch-try-page__step--active' : ''} ${i < step ? 'ch-try-page__step--done' : ''}`}>
              {label}
            </span>
          ))}
        </div>

        <GlassCard className="ch-try-page__card">
          {step === 0 && (
            <div className="ch-try-page__panel">
              <h2 className="ch-h4">{t('try.nameQuestion')}</h2>
              <Input
                label={t('try.nameLabel')}
                placeholder="e.g. Amina Juma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={fieldErrors.name}
                autoFocus
              />
            </div>
          )}

          {step === 1 && (
            <div className="ch-try-page__panel">
              <h2 className="ch-h4">{t('try.phoneQuestion')}</h2>
              <Input
                label={t('try.phoneLabel')}
                type="tel"
                placeholder="e.g. 0712 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={fieldErrors.phone}
                autoFocus
              />
            </div>
          )}

          {step === 2 && (
            <div className="ch-try-page__panel">
              <h2 className="ch-h4">{t('try.chooseCard')}</h2>
              {fieldErrors.templateId && <p className="ch-field__error" role="alert">{fieldErrors.templateId}</p>}

              {catalogueStatus === 'loading' && (
                <div className="ch-try-page__template-grid">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} height="140px" radius="var(--radius-md)" />
                  ))}
                </div>
              )}
              {catalogueStatus === 'error' && (
                <EmptyState icon={<FiAlertCircle />} title={t('catalogue.loadFailedTitle')} description={t('catalogue.loadFailedDescription')} />
              )}
              {catalogueStatus === 'success' && (
                <div className="ch-try-page__template-grid">
                  {templates.map((template) => {
                    const isSelected = selectedTemplate?.id === template.id;
                    return (
                      <button
                        type="button"
                        key={template.id}
                        className={`ch-try-page__template-option ${isSelected ? 'ch-try-page__template-option--selected' : ''}`}
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <TemplateThumb template={template} className="ch-try-page__template-swatch" />
                        <span className="ch-try-page__template-name">{template.name}</span>
                        <span className="ch-caption">{t(`category.${template.category}`)}</span>
                        <span className="ch-try-page__template-price">{formatCardPrice(template.priceTzs)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="ch-try-page__panel">
              <h2 className="ch-h4">{t('try.eventQuestion')}</h2>
              <Select
                label={t('try.eventType')}
                placeholder={t('try.eventType')}
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                options={EVENT_TYPES.map((et) => ({ value: et.value, label: t(`category.${et.value}`) }))}
                error={fieldErrors.eventType}
              />
              <Input
                label={t('try.eventName')}
                placeholder={t('try.eventNamePlaceholder')}
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                error={fieldErrors.eventName}
              />
              <Input
                label={t('try.venue')}
                placeholder={t('try.venuePlaceholder')}
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                error={fieldErrors.venue}
              />
              <div className="ch-try-page__event-datetime">
                <Input label={t('try.eventDate')} type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} error={fieldErrors.eventDate} />
                <Input label={t('try.eventTime')} type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} error={fieldErrors.eventTime} />
              </div>
              {eventType === 'wedding' && (
                <div>
                  <p className="ch-field__label" style={{ marginBottom: 'var(--space-2)' }}>
                    {t('try.guestType')}
                  </p>
                  <div className="ch-try-page__guest-type">
                    {GUEST_TYPE_OPTIONS.map((opt) => (
                      <Radio
                        key={opt.value}
                        name="guestType"
                        label={t(opt.labelKey)}
                        checked={guestType === opt.value}
                        onChange={() => setGuestType(opt.value)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 4 && selectedTemplate && (
            <div className="ch-try-page__panel">
              <h2 className="ch-h4">{t('try.previewTitle')}</h2>
              {selectedTemplate.previewImage && (
                <TemplateThumb template={selectedTemplate} className="ch-try-page__preview-swatch" />
              )}
              <InvitationPreview compact title={eventName || name || 'Your Name Here'} venue={venue || selectedTemplate.name} colors={selectedTemplate.config?.colors} />
              <p className="ch-body-sm">
                {selectedTemplate.name} &middot; {t(`category.${selectedTemplate.category}`)} &middot;{' '}
                {formatCardPrice(selectedTemplate.priceTzs)}
              </p>
            </div>
          )}

          {step === 5 && selectedTemplate && (
            <div className="ch-try-page__panel">
              <h2 className="ch-h4">{t('try.readyToSend')}</h2>
              <dl className="ch-try-page__summary">
                <div>
                  <dt>{t('try.summary.name')}</dt>
                  <dd>{name}</dd>
                </div>
                <div>
                  <dt>{t('try.summary.phone')}</dt>
                  <dd>{phone}</dd>
                </div>
                <div>
                  <dt>{t('try.summary.card')}</dt>
                  <dd>{selectedTemplate.name}</dd>
                </div>
                <div>
                  <dt>{t('try.summary.event')}</dt>
                  <dd>
                    {eventName} {venue ? `· ${venue}` : ''} {eventDate ? `· ${eventDate}` : ''}
                  </dd>
                </div>
                <div>
                  <dt>{t('try.summary.price')}</dt>
                  <dd>{formatCardPrice(selectedTemplate.priceTzs)}</dd>
                </div>
              </dl>

              <div>
                <p className="ch-field__label" style={{ marginBottom: 'var(--space-2)' }}>
                  {t('try.sendVia')}
                </p>
                <div className="ch-try-page__channels">
                  {DELIVERY_CHANNELS.map((channel) => (
                    <Checkbox
                      key={channel.value}
                      label={t(`channel.${channel.value}`)}
                      checked={channels.includes(channel.value)}
                      onChange={() => toggleChannel(channel.value)}
                      className={`ch-try-page__channel-option ${
                        channels.includes(channel.value) ? 'ch-try-page__channel-option--checked' : ''
                      }`}
                    />
                  ))}
                </div>
                {fieldErrors.channels && (
                  <p className="ch-field__error" role="alert">
                    {fieldErrors.channels}
                  </p>
                )}
              </div>

              {submitStatus === 'error' && (
                <p className="ch-field__error" role="alert">
                  {submitError}
                </p>
              )}
              <p className="ch-caption">{t('try.deliveryNote')}</p>
            </div>
          )}

          <div className="ch-try-page__actions">
            {step > 0 && (
              <Button variant="ghost" onClick={goBack} disabled={submitStatus === 'submitting'}>
                <FiArrowLeft aria-hidden="true" /> {t('try.back')}
              </Button>
            )}
            {step < STEPS.length - 1 && (
              <Button variant="primary" onClick={goNext}>
                {t('try.next')} <FiArrowRight aria-hidden="true" />
              </Button>
            )}
            {step === STEPS.length - 1 && (
              <Button variant="primary" onClick={handleSubmit} isLoading={submitStatus === 'submitting'}>
                {t('try.sendRequest')}
              </Button>
            )}
          </div>
        </GlassCard>
      </Container>
    </div>
  );
}
