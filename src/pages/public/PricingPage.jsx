import { Link } from 'react-router-dom';
import { FiCheck } from 'react-icons/fi';
import { Container, SectionHeader, Seo } from '../../components/common';
import { GlassCard, Badge } from '../../components/ui';
import { ROUTES } from '../../constants/routes';
import { PRICING_TIER_LIST } from '../../constants/pricingTiers';

const TIER_DETAILS = {
  starter: {
    tagline: 'For a simple, beautiful card',
    isFeatured: false,
    features: ['Standard catalogue designs', 'Shareable card link', 'Try Our Service — no account required'],
  },
  premium: {
    tagline: 'For cards that deserve more polish',
    isFeatured: true,
    features: ['Premium catalogue designs', 'Custom card details', 'Priority follow-up on your request'],
  },
  classic: {
    tagline: 'For hosts who want it all handled',
    isFeatured: false,
    features: ['Classic, most detailed designs', 'Custom card details', 'Priority follow-up on your request'],
  },
};

export function PricingPage() {
  return (
    <div className="ch-pricing-page">
      <Seo title="Pricing" description="Simple, per-card pricing for CardHub digital cards — Starter, Premium, and Classic tiers." />
      <Container>
        <SectionHeader
          eyebrow="Pricing"
          title="Simple pricing, per card"
          description="CardHub is priced per card, not per event. No subscriptions, no hidden fees — see the price before you choose a design."
          align="center"
        />

        <div className="ch-pricing-grid">
          {PRICING_TIER_LIST.map((tier) => {
            const details = TIER_DETAILS[tier.id];
            return (
              <GlassCard key={tier.id} className={`ch-pricing-card ${details.isFeatured ? 'ch-pricing-card--featured' : ''}`}>
                {details.isFeatured && <Badge variant="accent">Most popular</Badge>}
                <h3 className="ch-h3">{tier.name}</h3>
                <p className="ch-body-sm">{details.tagline}</p>
                <p className="ch-pricing-card__price">
                  TSh {new Intl.NumberFormat('en-TZ').format(tier.priceTzs)}
                  <span>/card</span>
                </p>
                <ul className="ch-pricing-card__features">
                  {details.features.map((feature) => (
                    <li key={feature}>
                      <FiCheck aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={ROUTES.TEMPLATES}
                  className={`ch-btn ch-btn--full ${details.isFeatured ? 'ch-btn--primary' : 'ch-btn--secondary'}`}
                >
                  Browse {tier.name} cards
                </Link>
              </GlassCard>
            );
          })}
        </div>

        <p className="ch-pricing-page__note ch-caption">
          Prices are shown in Tanzanian Shillings, per card, and are subject to change. Payment processing is not
          yet available — <Link to={ROUTES.TRY}>try our service</Link> to save your request while it's connected.
        </p>
      </Container>
    </div>
  );
}
