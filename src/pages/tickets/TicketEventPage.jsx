import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiAlertCircle, FiArrowLeft, FiArrowRight, FiCalendar, FiCheck, FiClock, FiInfo, FiMapPin, FiPhone, FiUser } from 'react-icons/fi';
import { Container, Seo } from '../../components/common';
import { Alert, Button, Input, Spinner } from '../../components/ui';
import { EventCover, QuantityStepper } from '../../components/tickets';
import { ticketsService } from '../../services/ticketsService';
import { ROUTES } from '../../constants/routes';
import { useLanguage } from '../../hooks/useLanguage';
import { formatTzs } from '../../utils/money';
import { formatTicketDate, formatTimeRange } from '../../utils/ticketFormat';
import { getErrorMessage, mapValidationErrors } from '../../utils/mapValidationErrors';
import { getCheckoutKey, normalizeTzPhone, recallOrder, rememberOrder, validateBuyer } from '../../utils/ticketCheckout';

const PURCHASABLE = ['available', 'low'];

export function TicketEventPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const checkoutRef = useRef(null);
  const ticketsRef = useRef(null);

  const [state, setState] = useState({ status: 'loading', event: null, paymentMode: null, slug: null });
  const [pendingOrder, setPendingOrder] = useState(null);
  const [selectedTypeId, setSelectedTypeId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    ticketsService
      .getEvent(slug)
      .then((res) => active && setState({ status: 'success', ...res.data.data, slug }))
      .catch((error) => active && setState({ status: error?.response?.status === 404 ? 'notfound' : 'error', event: null, paymentMode: null, slug }));
    return () => {
      active = false;
    };
  }, [slug, reloadToken]);

  // An order this tab already opened for this event (e.g. the buyer refreshed or came back).
  useEffect(() => {
    const token = recallOrder(slug);
    if (!token) return undefined;
    let active = true;
    ticketsService
      .getOrder(token)
      .then((res) => {
        const order = res.data.data.order;
        if (!active) return;
        if (['pending', 'processing'].includes(order.status)) setPendingOrder(order);
        else rememberOrder(slug, null);
      })
      .catch(() => rememberOrder(slug, null));
    return () => {
      active = false;
    };
  }, [slug]);

  const isLoading = state.slug !== slug || state.status === 'loading';

  if (isLoading) {
    return (
      <div className="ch-tix ch-tix-status">
        <Spinner size="lg" />
      </div>
    );
  }

  if (state.status === 'notfound' || state.status === 'error') {
    const notFound = state.status === 'notfound';
    return (
      <div className="ch-tix ch-tix-status">
        <Seo title={notFound ? 'Event not found' : 'Event'} description="CardHub event tickets." />
        <FiAlertCircle aria-hidden="true" className="ch-tix-status__icon" />
        <h1 className="ch-tix-status__title">{notFound ? t('tix.event.notFoundTitle') : t('tix.market.errorTitle')}</h1>
        <p className="ch-tix-status__text">{notFound ? t('tix.event.notFoundDescription') : t('tix.market.errorDescription')}</p>
        <div className="ch-tix-status__actions">
          {!notFound && (
            <Button variant="brand" onClick={() => setReloadToken((n) => n + 1)}>
              {t('catalogue.retry')}
            </Button>
          )}
          <Link to={ROUTES.TICKETS} className="ch-btn ch-btn--secondary ch-btn--md">
            {t('tix.event.allEvents')}
          </Link>
        </div>
      </div>
    );
  }

  const { event, paymentMode } = state;
  const selectedType = event.ticketTypes.find((type) => type.id === selectedTypeId) || null;
  const maxQuantity = selectedType ? Math.max(1, selectedType.maxPerOrder) : 1;
  const effectiveQuantity = Math.min(quantity, maxQuantity);
  // Display only. The server recomputes the total from its own price.
  const displayTotal = selectedType ? selectedType.priceTzs * effectiveQuantity : 0;
  const venue = [event.venue?.name, event.venue?.address].filter(Boolean).join(', ');

  function selectType(type) {
    if (!PURCHASABLE.includes(type.availability) || event.isPast) return;
    setSelectedTypeId(type.id);
    setQuantity(1);
    setSubmitError('');
    setFieldErrors((prev) => ({ ...prev, ticketTypeId: undefined, quantity: undefined }));
    // On narrow screens the form sits below the list, so bring it into view.
    if (window.matchMedia('(max-width: 959px)').matches) {
      requestAnimationFrame(() => checkoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    const errorKey = { name: 'buyerName', phone: 'buyerPhone', email: 'buyerEmail' }[field];
    if (fieldErrors[errorKey]) setFieldErrors((prev) => ({ ...prev, [errorKey]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;
    setSubmitError('');

    if (!selectedType) {
      setFieldErrors({ ticketTypeId: t('tix.errors.selectTicket') });
      ticketsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const clientErrors = validateBuyer(form);
    if (Object.keys(clientErrors).length) {
      setFieldErrors(Object.fromEntries(Object.entries(clientErrors).map(([field, key]) => [field, t(key)])));
      return;
    }

    const payload = {
      eventSlug: event.slug,
      ticketTypeId: selectedType.id,
      quantity: effectiveQuantity,
      buyerName: form.name.trim(),
      buyerPhone: normalizeTzPhone(form.phone),
      buyerEmail: form.email.trim() || undefined,
    };
    payload.idempotencyKey = getCheckoutKey(event.slug, JSON.stringify(payload));

    setIsSubmitting(true);
    try {
      const res = await ticketsService.createOrder(payload);
      const order = res.data.data.order;
      rememberOrder(event.slug, order.token);
      navigate(ROUTES.ticketOrder(order.token));
    } catch (error) {
      const status = error?.response?.status;
      if (status === 422) {
        setFieldErrors(mapValidationErrors(error));
      } else {
        setSubmitError(getErrorMessage(error, t('tix.errors.generic')));
        // Sold out or unavailable: refresh availability so the list matches reality.
        if (status === 409) {
          ticketsService
            .getEvent(slug)
            .then((res) => setState({ status: 'success', ...res.data.data, slug }))
            .catch(() => {});
        }
      }
      setIsSubmitting(false);
    }
  }

  return (
    <div className="ch-tix ch-tix-event">
      <Seo title={event.title} description={`${event.title} — ${formatTicketDate(event.date)}${event.venue?.name ? `, ${event.venue.name}` : ''}. Buy tickets on CardHub.`} />

      <Container>
        <Link to={ROUTES.TICKETS} className="ch-tix-back">
          <FiArrowLeft aria-hidden="true" />
          {t('tix.event.allEvents')}
        </Link>
      </Container>

      <Container className="ch-tix-event__hero">
        <EventCover src={event.coverImage} alt={event.title} className="ch-tix-event__cover" eager />
      </Container>

      <Container>
        {pendingOrder && (
          <Alert variant="info" className="ch-tix-event__pending">
            <span>{t('tix.event.pendingOrder', { quantity: pendingOrder.quantity, type: pendingOrder.ticketType?.name || '' })}</span>
            <Link to={ROUTES.ticketOrder(pendingOrder.token)} className="ch-tix-linkbtn">
              {t('tix.event.continuePayment')}
              <FiArrowRight aria-hidden="true" />
            </Link>
          </Alert>
        )}

        <div className="ch-tix-event__layout">
          <div className="ch-tix-event__main">
            <span className="ch-tix-tag">{t(`category.${event.category}`)}</span>
            <h1 className="ch-tix-event__title">{event.title}</h1>

            <ul className="ch-tix-facts">
              <li>
                <FiCalendar aria-hidden="true" />
                <div>
                  <p className="ch-tix-facts__primary">{formatTicketDate(event.date, { weekday: true })}</p>
                  {event.isPast && <p className="ch-tix-facts__secondary">{t('tix.event.pastEvent')}</p>}
                </div>
              </li>
              {event.startTime && (
                <li>
                  <FiClock aria-hidden="true" />
                  <div>
                    <p className="ch-tix-facts__primary">{formatTimeRange(event.startTime, event.endTime)}</p>
                    <p className="ch-tix-facts__secondary">{t('tix.event.localTime')}</p>
                  </div>
                </li>
              )}
              {venue && (
                <li>
                  <FiMapPin aria-hidden="true" />
                  <div>
                    <p className="ch-tix-facts__primary">{event.venue.name}</p>
                    {event.venue.address && <p className="ch-tix-facts__secondary">{event.venue.address}</p>}
                  </div>
                </li>
              )}
            </ul>

            {event.description && (
              <section className="ch-tix-section">
                <h2 className="ch-tix-section__title">{t('tix.event.about')}</h2>
                <p className="ch-tix-event__description">{event.description}</p>
              </section>
            )}

            {event.organizer && (
              <section className="ch-tix-section">
                <h2 className="ch-tix-section__title">{t('tix.event.organizer')}</h2>
                <div className="ch-tix-organizer">
                  <span className="ch-tix-organizer__avatar" aria-hidden="true">
                    <FiUser />
                  </span>
                  <div>
                    <p className="ch-tix-organizer__name">{event.organizer.name}</p>
                    {event.organizer.contact && (
                      <a className="ch-tix-organizer__contact" href={`tel:${event.organizer.contact.replace(/\s+/g, '')}`}>
                        <FiPhone aria-hidden="true" />
                        {event.organizer.contact}
                      </a>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>

          <aside className="ch-tix-event__aside">
            <section className="ch-tix-panel" ref={ticketsRef} aria-labelledby="ch-tix-tickets-title">
              <h2 className="ch-tix-panel__title" id="ch-tix-tickets-title">
                {t('tix.event.tickets')}
              </h2>
              {paymentMode === 'demo' && (
                <p className="ch-tix-demo-note">
                  <FiInfo aria-hidden="true" />
                  {t('tix.event.demoNote')}
                </p>
              )}

              <div className="ch-tix-types" role="radiogroup" aria-label={t('tix.event.tickets')}>
                {event.ticketTypes.map((type) => {
                  const purchasable = PURCHASABLE.includes(type.availability) && !event.isPast;
                  const selected = type.id === selectedTypeId;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={!purchasable}
                      className={`ch-tix-type ${selected ? 'ch-tix-type--selected' : ''} ${purchasable ? '' : 'ch-tix-type--disabled'}`}
                      onClick={() => selectType(type)}
                    >
                      <span className="ch-tix-type__check" aria-hidden="true">
                        {selected && <FiCheck />}
                      </span>
                      <span className="ch-tix-type__info">
                        <span className="ch-tix-type__name">{type.name}</span>
                        {type.description && <span className="ch-tix-type__description">{type.description}</span>}
                        <span className={`ch-tix-type__availability ch-tix-type__availability--${type.availability}`}>
                          {type.availability === 'low'
                            ? t('tix.availability.low', { count: type.remaining })
                            : t(`tix.availability.${type.availability}`)}
                        </span>
                      </span>
                      <span className="ch-tix-type__price">{formatTzs(type.priceTzs)}</span>
                    </button>
                  );
                })}
              </div>
              {fieldErrors.ticketTypeId && (
                <p className="ch-field__error" role="alert">
                  {fieldErrors.ticketTypeId}
                </p>
              )}
            </section>

            {event.salesOpen ? (
              <form className="ch-tix-panel ch-tix-checkout" ref={checkoutRef} onSubmit={handleSubmit} noValidate>
                <h2 className="ch-tix-panel__title">{t('tix.checkout.title')}</h2>

                <div className="ch-tix-checkout__line">
                  <div>
                    <p className="ch-tix-label">{t('tix.checkout.ticketType')}</p>
                    <p className="ch-tix-checkout__value">{selectedType ? selectedType.name : t('tix.checkout.noneSelected')}</p>
                  </div>
                  {selectedType && (
                    <QuantityStepper
                      value={effectiveQuantity}
                      max={maxQuantity}
                      onChange={setQuantity}
                      label={t('tix.checkout.quantity')}
                      disabled={isSubmitting}
                    />
                  )}
                </div>
                {fieldErrors.quantity && (
                  <p className="ch-field__error" role="alert">
                    {fieldErrors.quantity}
                  </p>
                )}

                <Input
                  label={t('tix.checkout.fullName')}
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  error={fieldErrors.buyerName}
                  autoComplete="name"
                  maxLength={150}
                  required
                />
                <Input
                  label={t('tix.checkout.phone')}
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  error={fieldErrors.buyerPhone}
                  hint={t('tix.checkout.phoneHint')}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="0712 345 678"
                  maxLength={20}
                  required
                />
                <Input
                  label={t('tix.checkout.email')}
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  error={fieldErrors.buyerEmail}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  maxLength={190}
                />

                <div className="ch-tix-total">
                  <div>
                    <p className="ch-tix-label">{t('tix.checkout.total')}</p>
                    {selectedType && (
                      <p className="ch-tix-total__breakdown">
                        {formatTzs(selectedType.priceTzs)} × {effectiveQuantity}
                      </p>
                    )}
                  </div>
                  <p className="ch-tix-total__amount">{formatTzs(displayTotal)}</p>
                </div>

                {submitError && <Alert variant="danger">{submitError}</Alert>}

                <Button type="submit" variant="brand" size="lg" fullWidth isLoading={isSubmitting} rightIcon={<FiArrowRight aria-hidden="true" />}>
                  {t('tix.checkout.continue')}
                </Button>
                <p className="ch-tix-checkout__fineprint">{t('tix.checkout.holdNote')}</p>
              </form>
            ) : (
              <div className="ch-tix-panel ch-tix-closed">
                <p className="ch-tix-panel__title">{event.isPast ? t('tix.event.salesClosed') : t('tix.event.soldOutTitle')}</p>
                <p className="ch-body-sm">{event.isPast ? t('tix.event.salesClosedDescription') : t('tix.event.soldOutDescription')}</p>
              </div>
            )}
          </aside>
        </div>
      </Container>

      {event.salesOpen && (
        <div className="ch-tix-stickybar" role="region" aria-label={t('tix.checkout.title')}>
          <div className="ch-tix-stickybar__info">
            <p className="ch-tix-stickybar__label">{selectedType ? `${selectedType.name} × ${effectiveQuantity}` : t('tix.from')}</p>
            <p className="ch-tix-stickybar__amount">{formatTzs(selectedType ? displayTotal : event.startingPriceTzs)}</p>
          </div>
          <Button
            variant="brand"
            onClick={() => (selectedType ? checkoutRef.current : ticketsRef.current)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            {selectedType ? t('tix.checkout.checkout') : t('tix.event.buyTicket')}
          </Button>
        </div>
      )}
    </div>
  );
}
