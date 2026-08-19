import { Link } from 'react-router-dom';
import { FiCheck } from 'react-icons/fi';
import { Container, SectionHeader, Seo } from '../../components/common';
import { GlassCard, Badge } from '../../components/ui';
import { ROUTES } from '../../constants/routes';
import { PRICING_TIER_LIST } from '../../constants/pricingTiers';
import { useLanguage } from '../../hooks/useLanguage';

const TIER_DETAILS = {
  starter: { isFeatured: false, featureCount: 3 },
  premium: { isFeatured: true, featureCount: 3 },
  classic: { isFeatured: false, featureCount: 3 },
};

export function PricingPage() {
  const { t } = useLanguage();

  return (
    <div className="ch-pricing-page">
      <Seo title="Pricing" description="Simple, per-card pricing for CardHub digital cards — Starter, Premium, and Classic tiers." />
      <Container>
        <SectionHeader eyebrow={t('landing.pricingEyebrow')} title={t('pricing.title')} description={t('pricing.description')} align="center" />

        <div className="ch-pricing-grid">
          {PRICING_TIER_LIST.map((tier) => {
            const details = TIER_DETAILS[tier.id];
            const features = Array.from({ length: details.featureCount }, (_, i) => t(`pricing.tier.${tier.id}.feature.${i + 1}`));
            return (
              <GlassCard key={tier.id} className={`ch-pricing-card ${details.isFeatured ? 'ch-pricing-card--featured' : ''}`}>
                {details.isFeatured && <Badge variant="accent">{t('pricing.mostPopular')}</Badge>}
                <h3 className="ch-h3">{tier.name}</h3>
                <p className="ch-body-sm">{t(`pricing.tier.${tier.id}.tagline`)}</p>
                <p className="ch-pricing-card__price">
                  TSh {new Intl.NumberFormat('en-TZ').format(tier.priceTzs)}
                  <span>/card</span>
                </p>
                <ul className="ch-pricing-card__features">
                  {features.map((feature) => (
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
                  {t('pricing.browseCards', { tier: tier.name })}
                </Link>
              </GlassCard>
            );
          })}
        </div>

        <p className="ch-pricing-page__note ch-caption">
          {t('pricing.note')} <Link to={ROUTES.TRY}>{t('pricing.noteLink')}</Link>
        </p>
      </Container>
    </div>
  );
}
