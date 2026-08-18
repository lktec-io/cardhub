import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiCheck, FiClock, FiCreditCard, FiSend, FiShield, FiStar } from 'react-icons/fi';
import { Container, SectionHeader, Seo, InvitationPreview, RotatingHeadline } from '../components/common';
import { GlassCard, Badge, Skeleton } from '../components/ui';
import { TemplateThumb } from '../components/templates';
import { ROUTES } from '../constants/routes';
import { templatesService } from '../services/templatesService';
import { getCategoryLabel } from '../constants/templateCategories';
import { formatCardPrice, PRICING_TIER_LIST } from '../constants/pricingTiers';

const HERO_MESSAGES = [
  'Your Moment. Your Card.',
  'Beautiful Cards. Made Simple.',
  'Celebrate. Share. Remember.',
  'Create. Send. Celebrate.',
];

const VALUE_PROPS = [
  { icon: FiStar, tone: 'blue', title: 'Beautiful by design', description: 'Every card follows CardHub’s premium visual language, so it looks intentional from the first glance.' },
  { icon: FiCreditCard, tone: 'gold', title: 'Simple, per-card pricing', description: 'No subscriptions, no packages you don’t need — pay only for the cards you actually send.' },
  { icon: FiSend, tone: 'mint', title: 'Easy to share', description: 'Every card is fast, mobile-friendly, and effortless for your guests to open — no app required.' },
  { icon: FiClock, tone: 'gold', title: 'Fast to try', description: 'Try Our Service in a few quick steps — pick a card, tell us who it’s for, done.' },
  { icon: FiShield, tone: 'blue', title: 'Built by Clix Digital Works', description: 'A Tanzanian team building CardHub for real celebrations, from send-offs to weddings to birthdays.' },
];

const JOURNEY_STEPS = [
  { step: '01', title: 'Browse the catalogue', description: 'Explore CardHub’s card catalogue by category — wedding, send-off, birthday, and more.' },
  { step: '02', title: 'Choose your card', description: 'Pick the design that fits your celebration and see its price per card upfront.' },
  { step: '03', title: 'Try Our Service', description: 'Tell us your name and phone number — no account required to get started.' },
  { step: '04', title: 'Receive your card', description: 'Your request is saved instantly, and our team follows up to bring your card to life.' },
];

export function LandingPage() {
  const [templates, setTemplates] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    templatesService
      .list({ limit: 4 })
      .then((res) => {
        const list = res.data.data.templates;
        setTemplates(list);
        setStatus(list.length === 0 ? 'empty' : 'success');
      })
      .catch(() => setStatus('error'));
  }, []);

  return (
    <>
      <Seo description="CardHub is a premium digital card service by Clix Digital Works. Browse the catalogue, see the price per card, and try the service in minutes." />

      <section className="ch-hero">
        <Container>
          <div className="ch-hero__grid">
            <div className="ch-hero__content ch-animate-slide-up">
              <Badge variant="accent">Now serving Tanzania</Badge>
              <h1 className="ch-display ch-hero__title">CardHub</h1>
              <RotatingHeadline as="p" className="ch-hero__subtitle" messages={HERO_MESSAGES} />
              <p className="ch-hero__description">
                CardHub helps you create and send beautiful digital invitations and cards — browse a real
                catalogue, see the price per card, and share with your guests in minutes.
              </p>
              <div className="ch-hero__actions">
                <Link to={ROUTES.TEMPLATES} className="ch-btn ch-btn--primary ch-btn--lg">
                  Create Your Card
                  <FiArrowRight aria-hidden="true" />
                </Link>
                <Link to={ROUTES.TRY} className="ch-btn ch-btn--secondary ch-btn--lg">
                  Try Our Service
                </Link>
              </div>
            </div>
            <div className="ch-hero__visual ch-animate-scale-in">
              <div className="ch-hero__photo">
                <img
                  src="/images/hero-couple.jpg"
                  alt="A couple celebrating their engagement — CardHub turns moments like this into a shareable digital card"
                  className="ch-hero__photo-img"
                  loading="eager"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement.classList.add('ch-hero__photo--fallback');
                  }}
                />
              </div>
              <div className="ch-hero__preview-card">
                <InvitationPreview compact />
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="ch-section" id="catalogue">
        <Container>
          <SectionHeader
            eyebrow="Card Catalogue"
            title="A card for every celebration"
            description="Real designs from CardHub's catalogue, priced per card."
            align="center"
          />

          {status === 'loading' && (
            <div className="ch-template-teaser-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} height="200px" radius="var(--radius-lg)" />
              ))}
            </div>
          )}

          {status === 'success' && (
            <div className="ch-template-teaser-grid">
              {templates.map((template) => {
                return (
                  <Link key={template.id} to={`${ROUTES.TRY}?templateId=${template.id}`} className="ch-template-teaser-link">
                    <GlassCard className="ch-template-teaser-card ch-animate-fade-in">
                      <TemplateThumb template={template} className="ch-template-teaser-card__swatch" />
                      <p className="ch-caption">{getCategoryLabel(template.category)}</p>
                      <h3 className="ch-h4">{template.name}</h3>
                      <p className="ch-template-card__price">{formatCardPrice(template.priceTzs)}</p>
                    </GlassCard>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="ch-journey-cta">
            <Link to={ROUTES.TEMPLATES} className="ch-btn ch-btn--outline ch-btn--sm">
              Browse the full catalogue
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>

      <section className="ch-section ch-section--alt" id="how-it-works">
        <Container>
          <SectionHeader eyebrow="How CardHub works" title="From browsing to your card, in four steps" align="center" />
          <div className="ch-journey-grid">
            {JOURNEY_STEPS.map(({ step, title, description }) => (
              <div key={step} className="ch-journey-card">
                <span className="ch-journey-card__step">{step}</span>
                <h3 className="ch-h4">{title}</h3>
                <p className="ch-body-sm">{description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="ch-section" id="why-cardhub">
        <Container>
          <SectionHeader
            eyebrow="Why CardHub"
            title="Everything you need, priced per card"
            description="A single, elegant service to browse, choose, and send your digital card."
            align="center"
          />
          <div className="ch-value-grid">
            {VALUE_PROPS.map(({ icon: Icon, tone, title, description }) => (
              <div key={title} className="ch-value-card">
                <div className={`ch-value-card__icon ch-value-card__icon--${tone}`}>
                  <Icon aria-hidden="true" />
                </div>
                <h3 className="ch-h4">{title}</h3>
                <p className="ch-body-sm">{description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="ch-section ch-section--alt" id="pricing">
        <Container>
          <SectionHeader
            eyebrow="Pricing"
            title="Simple pricing, per card"
            description="No subscriptions. Choose the tier that fits your card."
            align="center"
          />
          <div className="ch-landing-pricing-grid">
            {PRICING_TIER_LIST.map((tier) => (
              <GlassCard key={tier.id} className="ch-landing-pricing-card">
                <h3 className="ch-h4">{tier.name}</h3>
                <p className="ch-landing-pricing-card__price">{formatCardPrice(tier.priceTzs)}</p>
              </GlassCard>
            ))}
          </div>
          <div className="ch-journey-cta">
            <Link to={ROUTES.PRICING} className="ch-btn ch-btn--outline ch-btn--sm">
              See full pricing details
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>

      <section className="ch-section ch-cta" id="try">
        <Container>
          <GlassCard className="ch-cta__card">
            <FiCheck className="ch-cta__icon" aria-hidden="true" />
            <h2 className="ch-h2">Not ready to commit? Try it first.</h2>
            <p className="ch-body-lg">
              Tell us your name, your phone number, and the card you like — no account required.
            </p>
            <Link to={ROUTES.TRY} className="ch-btn ch-btn--primary ch-btn--lg">
              Try Our Service
              <FiArrowRight aria-hidden="true" />
            </Link>
          </GlassCard>
        </Container>
      </section>

      <section className="ch-section ch-cta">
        <Container>
          <GlassCard className="ch-cta__card">
            <h2 className="ch-h2">Ready to create your card?</h2>
            <p className="ch-body-lg">Browse CardHub's catalogue and see the price per card upfront.</p>
            <Link to={ROUTES.TEMPLATES} className="ch-btn ch-btn--primary ch-btn--lg">
              Create Your Card
              <FiArrowRight aria-hidden="true" />
            </Link>
          </GlassCard>
        </Container>
      </section>
    </>
  );
}
