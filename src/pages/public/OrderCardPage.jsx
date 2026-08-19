import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { FiAlertCircle, FiArrowRight, FiCheck, FiX } from 'react-icons/fi';
import { Container, Seo } from '../../components/common';
import { Badge, Button, GlassCard, Spinner } from '../../components/ui';
import { TemplateThumb } from '../../components/templates';
import { ordersService } from '../../services/ordersService';
import { formatCardPrice } from '../../constants/pricingTiers';
import { ROUTES } from '../../constants/routes';
import { useLanguage } from '../../hooks/useLanguage';

/**
 * The real public destination sent over SMS/WhatsApp (see
 * backend/src/utils/publicUrl.js#getPublicOrderUrl) — reached via the
 * order's unguessable public_token/rsvp_code, never its sequential id.
 * Chrome-free like /invite/:slug, but still wrapped in .ch-public-theme
 * for the same warm celebration palette as the rest of the marketing
 * surface. Also doubles as the guest's RSVP page — the QR code encodes
 * this same URL, so door staff scanning it land on the same "here is
 * your card" view, which now also shows the guest's own recorded
 * response.
 */
export function OrderCardPage() {
  const { token } = useParams();
  const { t } = useLanguage();
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('loading');
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false);
  const [rsvpMessage, setRsvpMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    ordersService
      .getByToken(token)
      .then((res) => {
        if (isMounted) {
          setOrder(res.data.data.order);
          setStatus('success');
        }
      })
      .catch(() => {
        if (isMounted) setStatus('unavailable');
      });
    return () => {
      isMounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!order?.publicUrl) return;
    let isMounted = true;
    // The QR simply encodes the invitation's own public URL — generated
    // client-side from a value that's already public, so there's no
    // server round-trip or new data exposed by rendering it.
    QRCode.toDataURL(order.publicUrl, { margin: 1, width: 220 })
      .then((dataUrl) => {
        if (isMounted) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        // Non-critical — the page still works without the QR image.
      });
    return () => {
      isMounted = false;
    };
  }, [order?.publicUrl]);

  async function respondRsvp(rsvpStatus) {
    setRsvpSubmitting(true);
    try {
      const res = await ordersService.submitRsvp(token, rsvpStatus);
      setOrder(res.data.data.order);
      setRsvpMessage(res.data.message);
    } catch {
      // Non-fatal — the guest can simply try again; nothing else on the page is affected.
    } finally {
      setRsvpSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="ch-public-theme ch-order-card-page">
        <Container>
          <div className="ch-order-card-page__status">
            <Spinner size="lg" />
          </div>
        </Container>
      </div>
    );
  }

  if (status === 'unavailable') {
    return (
      <div className="ch-public-theme ch-order-card-page">
        <Seo title="Card not found" description="This card link doesn't exist or is no longer available." />
        <Container>
          <div className="ch-order-card-page__status">
            <FiAlertCircle aria-hidden="true" />
            <h1 className="ch-h3">{t('card.notFoundTitle')}</h1>
            <p className="ch-body-sm">{t('card.notFoundDescription')}</p>
            <Link to={ROUTES.TEMPLATES} className="ch-btn ch-btn--primary">
              {t('card.browseCatalogue')}
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  const firstName = order.guestName ? order.guestName.trim().split(/\s+/)[0] : '';
  const hasResponded = order.rsvpStatus && order.rsvpStatus !== 'pending';

  return (
    <div className="ch-public-theme ch-order-card-page">
      <Seo
        title={order.template?.name ? `Your ${order.template.name} card` : 'Your card'}
        description="Your CardHub digital card."
      />
      <Container>
        <div className="ch-order-card-page__inner">
          <p className="ch-label">CardHub</p>
          <h1 className="ch-h2">{firstName ? `${firstName}, ${t('card.heading')}` : t('card.hereIsYourCard')}</h1>

          {order.template && (
            <GlassCard className="ch-order-card-page__card">
              <TemplateThumb template={order.template} className="ch-order-card-page__thumb" />
              <h2 className="ch-h4">{order.template.name}</h2>
              <p className="ch-body-sm">
                {order.pricingTier} &middot; {formatCardPrice(order.unitPriceTzs)} &times; {order.quantity}
              </p>
              <div className="ch-order-card-page__badges">
                <Badge variant="default">
                  {t('card.orderLabel')}: {t(`status.${order.status}`)}
                </Badge>
                <Badge variant="default">
                  {t('card.paymentLabel')}: {t(`status.${order.paymentStatus}`)}
                </Badge>
              </div>

              {(order.eventName || order.venue || order.eventDate || order.eventTime) && (
                <dl className="ch-order-card-page__event-details">
                  {order.invitationNumber && (
                    <div>
                      <dt>{t('card.invitationNumber')}</dt>
                      <dd>#{order.invitationNumber}</dd>
                    </div>
                  )}
                  {order.venue && (
                    <div>
                      <dt>{t('card.venue')}</dt>
                      <dd>{order.venue}</dd>
                    </div>
                  )}
                  {order.eventDate && (
                    <div>
                      <dt>{t('card.date')}</dt>
                      <dd>{order.eventDate}</dd>
                    </div>
                  )}
                  {order.eventTime && (
                    <div>
                      <dt>{t('card.time')}</dt>
                      <dd>{order.eventTime}</dd>
                    </div>
                  )}
                  {order.guestType && (
                    <div>
                      <dt>{t('card.guestType')}</dt>
                      <dd>{t(`try.guestType.${order.guestType}`)}</dd>
                    </div>
                  )}
                </dl>
              )}
            </GlassCard>
          )}

          <div className="ch-order-card-page__rsvp">
            <h3 className="ch-h5">{t('card.rsvpQuestion')}</h3>
            {hasResponded ? (
              <p className="ch-body-sm">
                {order.rsvpStatus === 'attending' ? t('card.rsvpThanksAttending') : t('card.rsvpThanksDeclined')}
              </p>
            ) : (
              <>
                <div className="ch-order-card-page__rsvp-actions">
                  <Button variant="primary" onClick={() => respondRsvp('attending')} isLoading={rsvpSubmitting}>
                    <FiCheck aria-hidden="true" /> {t('card.rsvpAttending')}
                  </Button>
                  <Button variant="secondary" onClick={() => respondRsvp('declined')} isLoading={rsvpSubmitting}>
                    <FiX aria-hidden="true" /> {t('card.rsvpDeclined')}
                  </Button>
                </div>
                {rsvpMessage && <p className="ch-body-sm">{rsvpMessage}</p>}
              </>
            )}
          </div>

          {qrDataUrl && (
            <div className="ch-order-card-page__qr">
              <img src={qrDataUrl} alt="QR code for this invitation" width={160} height={160} />
              <p className="ch-caption">{t('card.qrHint')}</p>
            </div>
          )}

          <p className="ch-caption">{t('card.placed')} {new Date(order.createdAt).toLocaleDateString()}</p>

          <div className="ch-order-card-page__actions">
            <Link to={ROUTES.TEMPLATES} className="ch-btn ch-btn--secondary">
              {t('try.browseMore')}
            </Link>
            <Link to={ROUTES.REGISTER} className="ch-btn ch-btn--primary">
              {t('card.createAccount')} <FiArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
