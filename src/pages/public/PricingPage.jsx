import { Link } from 'react-router-dom';
import { FiCheck } from 'react-icons/fi';
import { Container, SectionHeader, Seo } from '../../components/common';
import { GlassCard, Badge } from '../../components/ui';
import { ROUTES } from '../../constants/routes';
import { PRICING_PLANS, CURRENCY } from '../../constants/pricing';

function formatPrice(amount) {
  return new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 }).format(amount);
}

export function PricingPage() {
  return (
    <div className="ch-pricing-page">
      <Seo title="Pricing" description="Simple, per-event pricing for CardHub digital invitations — Basic, Classic, and Premium plans." />
      <Container>
        <SectionHeader
          eyebrow="Pricing"
          title="Simple pricing, per event"
          description="Choose the plan that fits your celebration. No subscriptions, no hidden fees."
          align="center"
        />

        <div className="ch-pricing-grid">
          {PRICING_PLANS.map((plan) => (
            <GlassCard
              key={plan.id}
              className={`ch-pricing-card ${plan.isFeatured ? 'ch-pricing-card--featured' : ''}`}
            >
              {plan.isFeatured && <Badge variant="accent">Most popular</Badge>}
              <h3 className="ch-h3">{plan.name}</h3>
              <p className="ch-body-sm">{plan.tagline}</p>
              <p className="ch-pricing-card__price">
                {CURRENCY} {formatPrice(plan.price)}
                <span>/{plan.billingNote}</span>
              </p>
              <ul className="ch-pricing-card__features">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <FiCheck aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={ROUTES.REGISTER}
                className={`ch-btn ch-btn--full ${plan.isFeatured ? 'ch-btn--primary' : 'ch-btn--secondary'}`}
              >
                Get started
              </Link>
            </GlassCard>
          ))}
        </div>

        <p className="ch-pricing-page__note ch-caption">
          Prices are shown in Tanzanian Shillings and are subject to change. Payment processing is
          not yet available — pricing is shown for reference ahead of launch.
        </p>
      </Container>
    </div>
  );
}
