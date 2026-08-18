import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiAlertCircle, FiArrowLeft, FiArrowRight, FiCheckCircle, FiSmartphone } from 'react-icons/fi';
import { Container, SectionHeader, Seo, InvitationPreview } from '../../components/common';
import { Button, Input, EmptyState, Skeleton, GlassCard, Badge } from '../../components/ui';
import { templatesService } from '../../services/templatesService';
import { ordersService } from '../../services/ordersService';
import { getErrorMessage, mapValidationErrors } from '../../utils/mapValidationErrors';
import { formatCardPrice } from '../../constants/pricingTiers';
import { getCategoryLabel } from '../../constants/templateCategories';
import { ROUTES } from '../../constants/routes';

const STEPS = ['Your name', 'Your phone', 'Choose a card', 'Preview', 'Send'];

export function TryPage() {
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get('templateId');

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const [templates, setTemplates] = useState([]);
  const [catalogueStatus, setCatalogueStatus] = useState('loading');

  const [submitStatus, setSubmitStatus] = useState('idle'); // idle | submitting | success | error
  const [order, setOrder] = useState(null);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    templatesService
      .list({ limit: 12 })
      .then((res) => {
        const list = res.data.data.templates;
        setTemplates(list);
        setCatalogueStatus(list.length === 0 ? 'empty' : 'success');
        if (preselectedId) {
          const match = list.find((t) => String(t.id) === String(preselectedId));
          if (match) setSelectedTemplate(match);
        }
      })
      .catch(() => setCatalogueStatus('error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goNext() {
    const errors = {};
    if (step === 0 && name.trim().length < 2) errors.name = 'Please enter your full name';
    if (step === 1 && !/^[0-9+()\-\s]{7,20}$/.test(phone)) errors.phone = 'Please enter a valid phone number';
    if (step === 2 && !selectedTemplate) errors.templateId = 'Please choose a card';

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
    setSubmitStatus('submitting');
    setSubmitError('');
    try {
      const res = await ordersService.submitTryService({
        name: name.trim(),
        phone: phone.trim(),
        templateId: selectedTemplate.id,
        quantity: 1,
      });
      setOrder(res.data.data.order);
      setSubmitStatus('success');
    } catch (error) {
      setFieldErrors(mapValidationErrors(error));
      setSubmitError(getErrorMessage(error, "Something went wrong — we couldn't save your request. Please try again."));
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
            <h1 className="ch-h2">Thanks, {name.split(' ')[0]} — your request is saved</h1>
            <p className="ch-body-lg">
              We've saved your request for a <strong>{order.template?.name}</strong> card ({order.pricingTier}) at{' '}
              {formatCardPrice(order.unitPriceTzs)}.
            </p>
            <Badge variant="accent">Ready to send</Badge>
            <p className="ch-body-sm ch-try-page__success-note">
              Delivery integration (WhatsApp/SMS) is coming in Phase 2 — for now, our team will follow up with you
              directly using the phone number you provided. We never mark a message as delivered unless it actually
              was.
            </p>
            <div className="ch-try-page__success-actions">
              <Link to={ROUTES.TEMPLATES} className="ch-btn ch-btn--secondary">
                Browse more cards
              </Link>
              <Link to={ROUTES.REGISTER} className="ch-btn ch-btn--primary">
                Create a full account
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
        <SectionHeader eyebrow="Try Our Service" title="Try Our Service" description="A few quick steps — no account needed." align="center" />

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
              <h2 className="ch-h4">What's your full name?</h2>
              <Input
                label="Full name"
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
              <h2 className="ch-h4">What's your phone number?</h2>
              <Input
                label="Phone number"
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
              <h2 className="ch-h4">Choose a card</h2>
              {fieldErrors.templateId && <p className="ch-field__error" role="alert">{fieldErrors.templateId}</p>}

              {catalogueStatus === 'loading' && (
                <div className="ch-try-page__template-grid">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} height="140px" radius="var(--radius-md)" />
                  ))}
                </div>
              )}
              {catalogueStatus === 'error' && (
                <EmptyState icon={<FiAlertCircle />} title="Couldn't load cards" description="Please try again shortly." />
              )}
              {catalogueStatus === 'success' && (
                <div className="ch-try-page__template-grid">
                  {templates.map((template) => {
                    const isSelected = selectedTemplate?.id === template.id;
                    const colors = template.config?.colors;
                    return (
                      <button
                        type="button"
                        key={template.id}
                        className={`ch-try-page__template-option ${isSelected ? 'ch-try-page__template-option--selected' : ''}`}
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <span
                          className="ch-try-page__template-swatch"
                          style={colors ? { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` } : undefined}
                        >
                          <FiSmartphone aria-hidden="true" />
                        </span>
                        <span className="ch-try-page__template-name">{template.name}</span>
                        <span className="ch-caption">{getCategoryLabel(template.category)}</span>
                        <span className="ch-try-page__template-price">{formatCardPrice(template.priceTzs)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 3 && selectedTemplate && (
            <div className="ch-try-page__panel">
              <h2 className="ch-h4">Preview</h2>
              <InvitationPreview compact title={name || 'Your Name Here'} venue={selectedTemplate.name} colors={selectedTemplate.config?.colors} />
              <p className="ch-body-sm">
                {selectedTemplate.name} &middot; {getCategoryLabel(selectedTemplate.category)} &middot;{' '}
                {formatCardPrice(selectedTemplate.priceTzs)}
              </p>
            </div>
          )}

          {step === 4 && selectedTemplate && (
            <div className="ch-try-page__panel">
              <h2 className="ch-h4">Ready to send?</h2>
              <dl className="ch-try-page__summary">
                <div>
                  <dt>Name</dt>
                  <dd>{name}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{phone}</dd>
                </div>
                <div>
                  <dt>Card</dt>
                  <dd>{selectedTemplate.name}</dd>
                </div>
                <div>
                  <dt>Price</dt>
                  <dd>{formatCardPrice(selectedTemplate.priceTzs)}</dd>
                </div>
              </dl>
              {submitStatus === 'error' && (
                <p className="ch-field__error" role="alert">
                  {submitError}
                </p>
              )}
              <p className="ch-caption">
                No SMS/WhatsApp provider is connected yet — this saves your request so our team can follow up. We
                never claim a message was delivered when it wasn't.
              </p>
            </div>
          )}

          <div className="ch-try-page__actions">
            {step > 0 && (
              <Button variant="ghost" onClick={goBack} disabled={submitStatus === 'submitting'}>
                <FiArrowLeft aria-hidden="true" /> Back
              </Button>
            )}
            {step < STEPS.length - 1 && (
              <Button variant="primary" onClick={goNext}>
                Next <FiArrowRight aria-hidden="true" />
              </Button>
            )}
            {step === STEPS.length - 1 && (
              <Button variant="primary" onClick={handleSubmit} isLoading={submitStatus === 'submitting'}>
                Send my request
              </Button>
            )}
          </div>
        </GlassCard>
      </Container>
    </div>
  );
}
