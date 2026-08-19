import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiArrowRight, FiCheckCircle } from 'react-icons/fi';
import { Container, Seo } from '../../../components/common';
import { Button, Alert } from '../../../components/ui';
import { StepIndicator } from '../../../components/events';
import { EventTypeStep } from './steps/EventTypeStep';
import { TemplateStep } from './steps/TemplateStep';
import { DetailsStep } from './steps/DetailsStep';
import { ReviewStep } from './steps/ReviewStep';
import { eventsService } from '../../../services/eventsService';
import { getDetectedTimezone } from '../../../utils/timezones';
import { mapValidationErrors, getErrorMessage } from '../../../utils/mapValidationErrors';
import { ROUTES } from '../../../constants/routes';
import { useLanguage } from '../../../hooks/useLanguage';

const INITIAL_FORM = {
  eventType: '',
  title: '',
  hostName: '',
  eventDate: '',
  eventTime: '',
  timezone: getDetectedTimezone(),
  venueName: '',
  venueAddress: '',
  description: '',
};

function validateDetails(form, t) {
  const errors = {};
  if (!form.title || form.title.trim().length < 2) errors.title = t('wizard.eventNameRequired');
  if (!form.timezone) errors.timezone = t('wizard.chooseTimezone');
  return errors;
}

export function CreateEventWizard() {
  const { t } = useLanguage();
  const STEPS = [t('wizard.step.eventType'), t('wizard.step.template'), t('wizard.step.details'), t('wizard.step.review')];
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdEvent, setCreatedEvent] = useState(null);

  function handleDetailsChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function goNext() {
    if (step === 1 && !form.eventType) {
      setErrors({ eventType: t('wizard.chooseEventType') });
      return;
    }
    if (step === 2 && !selectedTemplate) {
      setErrors({ template: t('wizard.chooseTemplate') });
      return;
    }
    if (step === 3) {
      const detailErrors = validateDetails(form, t);
      if (Object.keys(detailErrors).length > 0) {
        setErrors(detailErrors);
        return;
      }
    }
    setErrors({});
    setStep((s) => Math.min(4, s + 1));
  }

  function goBack() {
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleCreate() {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const res = await eventsService.create({
        templateId: selectedTemplate.id,
        eventType: form.eventType,
        title: form.title,
        hostName: form.hostName || undefined,
        eventDate: form.eventDate || undefined,
        eventTime: form.eventTime || undefined,
        timezone: form.timezone,
        venueName: form.venueName || undefined,
        venueAddress: form.venueAddress || undefined,
        description: form.description || undefined,
      });
      setCreatedEvent(res.data.data.event);
    } catch (error) {
      setErrors(mapValidationErrors(error));
      setSubmitError(getErrorMessage(error, t('wizard.createFailed')));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (createdEvent) {
    return (
      <Container>
        <Seo title="Invitation created" />
        <div className="ch-wizard__success ch-animate-scale-in">
          <FiCheckCircle size={48} color="var(--accent)" aria-hidden="true" />
          <h2 className="ch-h2">{t('wizard.readyTitle')}</h2>
          <p className="ch-body">
            <strong>{createdEvent.title}</strong> {t('wizard.readyDescription')}
          </p>
          <div className="ch-wizard__success-actions">
            <Link to={ROUTES.eventDetail(createdEvent.id)} className="ch-btn ch-btn--primary">
              {t('wizard.openEvent')}
            </Link>
            <Link to={ROUTES.DASHBOARD_EVENTS} className="ch-btn ch-btn--secondary">
              {t('wizard.viewMyEvents')}
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <Seo title="Create your invitation" />
      <div className="ch-wizard">
        <StepIndicator steps={STEPS} currentStep={step} />

        {submitError && (
          <Alert variant="danger" className="ch-auth-form__alert">
            {submitError}
          </Alert>
        )}

        {step === 1 && (
          <>
            <EventTypeStep value={form.eventType} onChange={(eventType) => setForm((prev) => ({ ...prev, eventType }))} />
            {errors.eventType && (
              <p className="ch-field__error" role="alert">
                {errors.eventType}
              </p>
            )}
          </>
        )}
        {step === 2 && (
          <>
            <TemplateStep eventType={form.eventType} selectedTemplateId={selectedTemplate?.id} onSelect={setSelectedTemplate} />
            {errors.template && (
              <p className="ch-field__error" role="alert">
                {errors.template}
              </p>
            )}
          </>
        )}
        {step === 3 && <DetailsStep value={form} onChange={handleDetailsChange} errors={errors} />}
        {step === 4 && <ReviewStep formData={form} template={selectedTemplate} onEditStep={setStep} />}

        <div className="ch-wizard__actions">
          <Button variant="ghost" onClick={goBack} disabled={step === 1}>
            <FiArrowLeft aria-hidden="true" /> {t('wizard.back')}
          </Button>
          {step < 4 ? (
            <Button variant="primary" onClick={goNext}>
              {t('wizard.continue')}
              <FiArrowRight aria-hidden="true" />
            </Button>
          ) : (
            <Button variant="primary" isLoading={isSubmitting} onClick={handleCreate}>
              {t('wizard.createDraft')}
            </Button>
          )}
        </div>
      </div>
    </Container>
  );
}
