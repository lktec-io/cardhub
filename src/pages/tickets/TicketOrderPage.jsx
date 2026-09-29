import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiAlertCircle, FiArrowLeft, FiCheckCircle, FiClock, FiInfo, FiSmartphone } from 'react-icons/fi';
import { Container, Seo, SuccessConfetti } from '../../components/common';
import { Alert, Button, Input, Spinner } from '../../components/ui';
import { DemoPaymentModal, EventCover, TicketActions, TicketPass } from '../../components/tickets';
import { ticketsService } from '../../services/ticketsService';
import { ROUTES } from '../../constants/routes';
import { useLanguage } from '../../hooks/useLanguage';
import { formatTzs, formatTzPhone } from '../../utils/money';
import { formatTicketDate, formatTimeRange } from '../../utils/ticketFormat';
import { getErrorMessage } from '../../utils/mapValidationErrors';
import { normalizeTzPhone, rememberOrder } from '../../utils/ticketCheckout';

const OPEN_STATUSES = ['pending', 'processing'];
const PROVIDER_POLL_MS = 4000;
// A short, honest pause so the demo reads as a payment being processed rather than an instant state flip.
const DEMO_PROCESSING_MS = 900;

function formatCountdown(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * The buyer's private order page, reached by the order's random token.
 * Every step can be refreshed: the server is the source of truth for the
 * order's status, so reloading mid-checkout simply resumes where it was.
 */
export function TicketOrderPage() {
  const { token } = useParams();
  const { t } = useLanguage();

  const [order, setOrder] = useState(null);
  const [loadState, setLoadState] = useState('loading');
  const [payerPhone, setPayerPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | starting | demo | confirming | awaiting
  const [payError, setPayError] = useState('');
  const [justPaid, setJustPaid] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const deadlineRef = useRef(0);

  const applyOrder = useCallback((next) => {
    setOrder(next);
    deadlineRef.current = Date.now() + (next.reservationSecondsLeft || 0) * 1000;
    setSecondsLeft(next.reservationSecondsLeft || 0);
    if (!OPEN_STATUSES.includes(next.status) && next.event?.slug) rememberOrder(next.event.slug, null);
  }, []);

  const refresh = useCallback(
    () =>
      ticketsService
        .getOrder(token)
        .then((res) => applyOrder(res.data.data.order))
        .catch(() => {}),
    [token, applyOrder]
  );

  useEffect(() => {
    let active = true;
    ticketsService
      .getOrder(token)
      .then((res) => {
        if (!active) return;
        const loaded = res.data.data.order;
        applyOrder(loaded);
        setPayerPhone(formatTzPhone(loaded.buyer.phone));
        setLoadState('success');
      })
      .catch((error) => active && setLoadState(error?.response?.status === 404 ? 'notfound' : 'error'));
    return () => {
      active = false;
    };
  }, [token, applyOrder]);

  const isOpen = order && OPEN_STATUSES.includes(order.status);

  // Reservation countdown. At zero, ask the server, which releases the hold and returns "expired".
  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = setInterval(() => {
      const left = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        clearInterval(timer);
        refresh();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, order?.token, refresh]);

  // Live gateway: the provider pushed a prompt to the phone. Poll until its verified webhook settles the order.
  useEffect(() => {
    if (phase !== 'awaiting' || !isOpen) return undefined;
    const timer = setInterval(refresh, PROVIDER_POLL_MS);
    return () => clearInterval(timer);
  }, [phase, isOpen, refresh]);

  async function handlePay(e) {
    e.preventDefault();
    if (phase !== 'idle') return;
    const normalized = normalizeTzPhone(payerPhone);
    if (!normalized) {
      setPhoneError(t('tix.errors.phone'));
      return;
    }
    setPhoneError('');
    setPayError('');
    setPhase('starting');
    try {
      const res = await ticketsService.startPayment(token, { phone: normalized });
      const { order: next, nextAction, checkoutUrl, message } = res.data.data;
      applyOrder(next);
      if (nextAction === 'demo_confirmation') setPhase('demo');
      else if (nextAction === 'redirect' && checkoutUrl) window.location.assign(checkoutUrl);
      else if (nextAction === 'await_provider') setPhase('awaiting');
      else {
        setPhase('idle');
        if (nextAction === 'unavailable') setPayError(message || t('tix.order.paymentUnavailable'));
      }
    } catch (error) {
      setPayError(getErrorMessage(error, t('tix.errors.generic')));
      setPhase('idle');
    }
  }

  async function handleDemoConfirm() {
    setPhase('confirming');
    try {
      const [res] = await Promise.all([
        ticketsService.confirmDemoPayment(token),
        new Promise((resolve) => setTimeout(resolve, DEMO_PROCESSING_MS)),
      ]);
      const next = res.data.data.order;
      applyOrder(next);
      if (next.status === 'paid') {
        setJustPaid(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      setPhase('idle');
    } catch (error) {
      setPayError(getErrorMessage(error, t('tix.errors.generic')));
      setPhase('idle');
      refresh();
    }
  }

  if (loadState === 'loading') {
    return (
      <div className="ch-tix ch-tix-status">
        <Spinner size="lg" />
      </div>
    );
  }

  if (loadState !== 'success') {
    return (
      <div className="ch-tix ch-tix-status">
        <Seo title="Order not found" description="This ticket order link doesn't exist." />
        <FiAlertCircle aria-hidden="true" className="ch-tix-status__icon" />
        <h1 className="ch-tix-status__title">{loadState === 'notfound' ? t('tix.order.notFoundTitle') : t('tix.market.errorTitle')}</h1>
        <p className="ch-tix-status__text">{loadState === 'notfound' ? t('tix.order.notFoundDescription') : t('tix.market.errorDescription')}</p>
        <Link to={ROUTES.TICKETS} className="ch-btn ch-btn--brand ch-btn--md">
          {t('tix.event.allEvents')}
        </Link>
      </div>
    );
  }

  const { event } = order;

  if (order.status === 'paid') {
    return (
      <div className="ch-tix ch-tix-success">
        <Seo title="Your tickets" description="Your CardHub event tickets." />
        {justPaid && <SuccessConfetti />}
        <Container>
          <header className="ch-tix-success__header ch-tix-noprint">
            <p className="ch-tix-success__badge">
              <FiCheckCircle aria-hidden="true" />
              {t('tix.order.paymentSuccessful')}
            </p>
            <h1 className="ch-tix-success__title">{t(order.tickets.length === 1 ? 'tix.order.yourTicket' : 'tix.order.yourTickets')}</h1>
            <p className="ch-tix-success__lead">
              {t(order.tickets.length === 1 ? 'tix.order.issuedOne' : 'tix.order.issuedMany', { count: order.tickets.length })}
            </p>
            {order.isDemo && (
              <p className="ch-tix-demo-note ch-tix-demo-note--center">
                <FiInfo aria-hidden="true" />
                {t('tix.order.demoIssued')}
              </p>
            )}
          </header>

          <div className="ch-tix-success__tickets">
            {order.tickets.map((ticket, index) => (
              <section key={ticket.token} className="ch-tix-success__item" aria-label={`${index + 1} / ${order.tickets.length}`}>
                {order.tickets.length > 1 && (
                  <p className="ch-tix-success__count ch-tix-noprint">{t('tix.order.ticketOf', { index: index + 1, total: order.tickets.length })}</p>
                )}
                <TicketPass ticket={ticket} />
                <div className="ch-tix-noprint">
                  <TicketActions ticket={ticket} />
                </div>
              </section>
            ))}
          </div>

          <div className="ch-tix-success__footer ch-tix-noprint">
            <p className="ch-body-sm">{t('tix.order.keepSafe')}</p>
            {event?.slug && (
              <Link to={ROUTES.ticketEvent(event.slug)} className="ch-btn ch-btn--secondary ch-btn--md">
                {t('tix.order.buyMore')}
              </Link>
            )}
          </div>
        </Container>
      </div>
    );
  }

  const summary = (
    <aside className="ch-tix-panel ch-tix-summary">
      <EventCover src={event?.coverImage} alt="" className="ch-tix-summary__cover" />
      <div className="ch-tix-summary__body">
        <p className="ch-tix-summary__title">{event?.title}</p>
        <p className="ch-tix-summary__meta">
          {formatTicketDate(event?.date, { weekday: true, short: true })}
          {event?.startTime ? ` · ${formatTimeRange(event.startTime, event.endTime)}` : ''}
        </p>
        {event?.venue?.name && <p className="ch-tix-summary__meta">{event.venue.name}</p>}
        <dl className="ch-tix-summary__lines">
          <div>
            <dt>
              {order.ticketType?.name} × {order.quantity}
            </dt>
            <dd>{formatTzs(order.unitPriceTzs * order.quantity)}</dd>
          </div>
          <div className="ch-tix-summary__total">
            <dt>{t('tix.checkout.total')}</dt>
            <dd>{formatTzs(order.totalTzs)}</dd>
          </div>
        </dl>
        <p className="ch-tix-summary__buyer">
          {order.buyer.name} · {formatTzPhone(order.buyer.phone)}
        </p>
      </div>
    </aside>
  );

  if (!isOpen) {
    const titleKey = order.status === 'expired' ? 'tix.order.expiredTitle' : 'tix.order.closedTitle';
    const textKey = order.status === 'expired' ? 'tix.order.expiredDescription' : 'tix.order.closedDescription';
    return (
      <div className="ch-tix ch-tix-order">
        <Seo title="Order closed" description="This ticket order can no longer be paid." />
        <Container>
          <div className="ch-tix-order__layout">
            <div className="ch-tix-panel ch-tix-order__closed">
              <FiClock aria-hidden="true" className="ch-tix-status__icon" />
              <h1 className="ch-tix-status__title">{t(titleKey)}</h1>
              <p className="ch-tix-status__text">{t(textKey)}</p>
              {event?.slug && (
                <Link to={ROUTES.ticketEvent(event.slug)} className="ch-btn ch-btn--brand ch-btn--md">
                  {t('tix.order.startAgain')}
                </Link>
              )}
            </div>
            {summary}
          </div>
        </Container>
      </div>
    );
  }

  const busy = phase !== 'idle';

  return (
    <div className="ch-tix ch-tix-order">
      <Seo title="Payment" description="Complete your CardHub ticket payment." />
      <Container>
        {event?.slug && (
          <Link to={ROUTES.ticketEvent(event.slug)} className="ch-tix-back">
            <FiArrowLeft aria-hidden="true" />
            {event.title}
          </Link>
        )}

        <div className="ch-tix-order__layout">
          <form className="ch-tix-panel ch-tix-pay" onSubmit={handlePay} noValidate>
            <div className="ch-tix-pay__head">
              <h1 className="ch-tix-panel__title">{t('tix.order.paymentTitle')}</h1>
              <p className={`ch-tix-hold ${secondsLeft <= 120 ? 'ch-tix-hold--urgent' : ''}`} aria-live="off">
                <FiClock aria-hidden="true" />
                {t('tix.order.heldFor', { time: formatCountdown(secondsLeft) })}
              </p>
            </div>

            {order.paymentMode === 'demo' && (
              <p className="ch-tix-demo-note">
                <FiInfo aria-hidden="true" />
                {t('tix.order.demoModeNote')}
              </p>
            )}

            <div className="ch-tix-pay__amount">
              <p className="ch-tix-label">{t('tix.order.amount')}</p>
              <p className="ch-tix-pay__amount-value">{formatTzs(order.totalTzs)}</p>
            </div>

            <div className="ch-tix-pay__method">
              <span className="ch-tix-pay__method-icon" aria-hidden="true">
                <FiSmartphone />
              </span>
              <div>
                <p className="ch-tix-pay__method-name">{t('tix.order.mobileMoney')}</p>
                <p className="ch-tix-pay__method-hint">{t('tix.order.mobileMoneyNetworks')}</p>
              </div>
            </div>

            <Input
              label={t('tix.order.payerPhone')}
              value={payerPhone}
              onChange={(e) => {
                setPayerPhone(e.target.value);
                if (phoneError) setPhoneError('');
              }}
              error={phoneError}
              hint={t('tix.order.payerPhoneHint')}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
              disabled={busy}
            />

            {payError && <Alert variant="danger">{payError}</Alert>}

            {phase === 'awaiting' ? (
              <Alert variant="info" title={t('tix.order.checkPhoneTitle')}>
                {t('tix.order.checkPhoneDescription')}
              </Alert>
            ) : (
              <Button type="submit" variant="conversion" size="lg" fullWidth isLoading={phase === 'starting'} disabled={busy}>
                {t('tix.order.pay', { amount: formatTzs(order.totalTzs) })}
              </Button>
            )}
            <p className="ch-tix-checkout__fineprint">{t('tix.order.pinNotice')}</p>
          </form>

          {summary}
        </div>
      </Container>

      <DemoPaymentModal
        isOpen={phase === 'demo' || phase === 'confirming'}
        amountTzs={order.totalTzs}
        payerPhone={normalizeTzPhone(payerPhone)}
        isConfirming={phase === 'confirming'}
        onCancel={() => setPhase('idle')}
        onConfirm={handleDemoConfirm}
      />
    </div>
  );
}
