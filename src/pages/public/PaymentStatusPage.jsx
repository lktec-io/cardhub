import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiAlertCircle, FiArrowRight, FiCheckCircle, FiClock, FiXCircle } from 'react-icons/fi';
import { Container, Seo, SuccessConfetti } from '../../components/common';
import { Badge, GlassCard, Spinner } from '../../components/ui';
import { checkoutService } from '../../services/checkoutService';
import { formatCardPrice } from '../../constants/pricingTiers';
import { ROUTES } from '../../constants/routes';
import { useLanguage } from '../../hooks/useLanguage';

const POLL_INTERVAL_MS = 4000;
const ACTIVE_STATUSES = new Set(['pending', 'processing']);

/**
 * The customer's own payment-status screen — polls the server (never
 * trusts anything the frontend itself computed) until the payment
 * leaves pending/processing. Only a real webhook-verified "paid" status
 * coming back from the server ever shows the success state; there is no
 * client-side way to force this page into "paid".
 */
export function PaymentStatusPage() {
  const { token } = useParams();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let isMounted = true;
    let timer;

    async function poll() {
      try {
        const res = await checkoutService.getStatus(token);
        if (!isMounted) return;
        setData(res.data.data);
        setStatus('success');
        const paymentStatus = res.data.data.payment?.status;
        if (paymentStatus && ACTIVE_STATUSES.has(paymentStatus)) {
          timer = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch {
        if (isMounted) setStatus('unavailable');
      }
    }

    poll();
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="ch-public-theme ch-payment-status-page">
        <Container>
          <div className="ch-payment-status-page__status">
            <Spinner size="lg" />
          </div>
        </Container>
      </div>
    );
  }

  if (status === 'unavailable' || !data) {
    return (
      <div className="ch-public-theme ch-payment-status-page">
        <Seo title="Payment not found" />
        <Container>
          <div className="ch-payment-status-page__status">
            <FiAlertCircle aria-hidden="true" />
            <h1 className="ch-h3">{t('payment.notFound')}</h1>
            <Link to={ROUTES.TEMPLATES} className="ch-btn ch-btn--primary">
              {t('checkout.browseCatalogue')}
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  const { order, payment } = data;
  const paymentStatus = payment?.status;
  const isPaid = paymentStatus === 'paid';
  const isFailed = paymentStatus === 'failed';
  const isCancelled = paymentStatus === 'cancelled';
  const isExpired = paymentStatus === 'expired';
  const isPending = !payment || ACTIVE_STATUSES.has(paymentStatus);

  return (
    <div className="ch-public-theme ch-payment-status-page">
      <Seo title={isPaid ? 'Payment successful' : 'Payment status'} />
      <Container>
        <div className="ch-payment-status-page__inner">
          {isPaid && <SuccessConfetti />}

          {isPaid && <FiCheckCircle className="ch-payment-status-page__icon ch-payment-status-page__icon--paid" aria-hidden="true" />}
          {isPending && <FiClock className="ch-payment-status-page__icon" aria-hidden="true" />}
          {(isFailed || isCancelled || isExpired) && <FiXCircle className="ch-payment-status-page__icon ch-payment-status-page__icon--failed" aria-hidden="true" />}

          <h1 className="ch-h2">
            {isPaid && t('payment.paidTitle')}
            {isPending && t('payment.pendingTitle')}
            {isFailed && t('payment.failedTitle')}
            {isCancelled && t('payment.cancelledTitle')}
            {isExpired && t('payment.expiredTitle')}
            {!payment && t('payment.paymentUnavailableTitle')}
          </h1>
          <p className="ch-body-lg">
            {isPaid && t('payment.paidDescription')}
            {isPending && t('payment.pendingDescription')}
            {!payment && t('payment.paymentUnavailableDescription')}
          </p>

          <GlassCard className="ch-payment-status-page__card">
            <div className="ch-payment-status-page__row">
              <span>{t('payment.orderNumber')}</span>
              <strong>#{order.invitationNumber}</strong>
            </div>
            <div className="ch-payment-status-page__row">
              <span>{t('payment.amount')}</span>
              <strong>{formatCardPrice(order.unitPriceTzs)}</strong>
            </div>
            {payment && (
              <div className="ch-payment-status-page__row">
                <span>{t('payment.statusLabel')}</span>
                <Badge variant={isPaid ? 'success' : isPending ? 'accent' : 'danger'}>{t(`status.${payment.status}`) === `status.${payment.status}` ? payment.status : t(`status.${payment.status}`)}</Badge>
              </div>
            )}
          </GlassCard>

          <div className="ch-payment-status-page__actions">
            {isPaid && order.publicUrl && (
              <a href={order.publicUrl} className="ch-btn ch-btn--primary">
                {t('payment.viewInvitation')} <FiArrowRight aria-hidden="true" />
              </a>
            )}
            {(isFailed || isExpired || isCancelled) && (
              <Link to={ROUTES.CHECKOUT} className="ch-btn ch-btn--primary">
                {t('payment.tryAgain')}
              </Link>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
