import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiAlertCircle, FiArrowRight } from 'react-icons/fi';
import { Container, Seo } from '../../components/common';
import { Badge, GlassCard, Spinner } from '../../components/ui';
import { TemplateThumb } from '../../components/templates';
import { ordersService } from '../../services/ordersService';
import { formatCardPrice } from '../../constants/pricingTiers';
import { ROUTES } from '../../constants/routes';

/**
 * The real public destination sent over SMS/WhatsApp (see
 * backend/src/utils/publicUrl.js#getPublicOrderUrl) — reached via the
 * order's unguessable public_token, never its sequential id. Chrome-free
 * like /invite/:slug, but still wrapped in .ch-public-theme for the same
 * warm celebration palette as the rest of the marketing surface.
 */
export function OrderCardPage() {
  const { token } = useParams();
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('loading');

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
            <h1 className="ch-h3">Card not found</h1>
            <p className="ch-body-sm">This link doesn&rsquo;t exist, or is no longer available.</p>
            <Link to={ROUTES.TEMPLATES} className="ch-btn ch-btn--primary">
              Browse the catalogue
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  const firstName = order.guestName ? order.guestName.trim().split(/\s+/)[0] : '';

  return (
    <div className="ch-public-theme ch-order-card-page">
      <Seo
        title={order.template?.name ? `Your ${order.template.name} card` : 'Your card'}
        description="Your CardHub digital card."
      />
      <Container>
        <div className="ch-order-card-page__inner">
          <p className="ch-label">CardHub</p>
          <h1 className="ch-h2">{firstName ? `${firstName}, here's your card` : "Here's your card"}</h1>

          {order.template && (
            <GlassCard className="ch-order-card-page__card">
              <TemplateThumb template={order.template} className="ch-order-card-page__thumb" />
              <h2 className="ch-h4">{order.template.name}</h2>
              <p className="ch-body-sm">
                {order.pricingTier} &middot; {formatCardPrice(order.unitPriceTzs)} &times; {order.quantity}
              </p>
              <div className="ch-order-card-page__badges">
                <Badge variant="default">Order: {order.status}</Badge>
                <Badge variant="default">Payment: {order.paymentStatus}</Badge>
              </div>
            </GlassCard>
          )}

          <p className="ch-caption">Placed {new Date(order.createdAt).toLocaleDateString()}</p>

          <div className="ch-order-card-page__actions">
            <Link to={ROUTES.TEMPLATES} className="ch-btn ch-btn--secondary">
              Browse more cards
            </Link>
            <Link to={ROUTES.REGISTER} className="ch-btn ch-btn--primary">
              Create a full account <FiArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
