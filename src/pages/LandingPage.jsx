import { Link } from 'react-router-dom';
import {
  FiArrowRight,
  FiCheckCircle,
  FiLayers,
  FiSend,
  FiSmartphone,
  FiStar,
  FiUsers,
} from 'react-icons/fi';
import { Container, SectionHeader, Seo, InvitationPreview } from '../components/common';
import { GlassCard, Badge } from '../components/ui';
import { ROUTES } from '../constants/routes';
import { DEMO_TEMPLATES } from '../constants/templates';

const VALUE_PROPS = [
  { icon: FiStar, title: 'Beautiful by design', description: 'Every template follows CardHub’s premium visual language, so your invitation looks intentional from the first glance.' },
  { icon: FiUsers, title: 'Built for your guests', description: 'Invitations are fast, mobile-friendly, and effortless to open — no app required.' },
  { icon: FiSend, title: 'Easy to share', description: 'One link, shareable anywhere — WhatsApp, SMS, or social, as CardHub’s sharing tools roll out.' },
  { icon: FiCheckCircle, title: 'Smart RSVP', description: 'Guest responses land in one organized place as CardHub’s RSVP engine comes online.' },
  { icon: FiLayers, title: 'Event ready', description: 'From your first invitation to full event management — CardHub grows with your event.' },
];

const JOURNEY_STEPS = [
  { step: '01', title: 'Choose your style', description: 'Browse CardHub’s template catalog and pick the look that fits your event.' },
  { step: '02', title: 'Create your invitation', description: 'Personalize your details — names, date, venue — in a guided, premium editor.' },
  { step: '03', title: 'Share with guests', description: 'Send a single link your guests can open instantly from any device.' },
  { step: '04', title: 'Celebrate', description: 'Bring your event together with CardHub as your invitations and guest tools grow.' },
];

export function LandingPage() {
  return (
    <>
      <Seo description="CardHub is a premium digital invitation and event platform by Clix Digital Works. Create beautiful invitations, share them with your guests, and bring your event together in one place." />

      <section className="ch-hero">
        <Container>
          <div className="ch-hero__grid">
            <div className="ch-hero__content ch-animate-slide-up">
              <Badge variant="accent">Now in early access &mdash; Tanzania</Badge>
              <h1 className="ch-display ch-hero__title">CardHub</h1>
              <p className="ch-hero__subtitle">Create. Invite. Celebrate.</p>
              <p className="ch-hero__description">
                Create beautiful digital invitations, share them with your guests, and bring your
                event together in one place.
              </p>
              <div className="ch-hero__actions">
                <Link to={ROUTES.REGISTER} className="ch-btn ch-btn--primary ch-btn--lg">
                  Create your invitation
                  <FiArrowRight aria-hidden="true" />
                </Link>
                <Link to={ROUTES.TEMPLATES} className="ch-btn ch-btn--secondary ch-btn--lg">
                  Explore templates
                </Link>
              </div>
            </div>
            <div className="ch-hero__preview ch-animate-scale-in">
              <InvitationPreview />
            </div>
          </div>
        </Container>
      </section>

      <section className="ch-section" id="why-cardhub">
        <Container>
          <SectionHeader
            eyebrow="Why CardHub"
            title="Everything you need to host unforgettable events"
            description="A single, elegant platform to design, share, and bring your invitations to life."
            align="center"
          />
          <div className="ch-value-grid">
            {VALUE_PROPS.map(({ icon: Icon, title, description }) => (
              <div key={title} className="ch-value-card">
                <div className="ch-value-card__icon">
                  <Icon aria-hidden="true" />
                </div>
                <h3 className="ch-h4">{title}</h3>
                <p className="ch-body-sm">{description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="ch-section ch-section--alt" id="how-it-works">
        <Container>
          <SectionHeader
            eyebrow="How CardHub works"
            title="From idea to invitation, in four steps"
            align="center"
          />
          <div className="ch-journey-grid">
            {JOURNEY_STEPS.map(({ step, title, description }) => (
              <div key={step} className="ch-journey-card">
                <span className="ch-journey-card__step">{step}</span>
                <h3 className="ch-h4">{title}</h3>
                <p className="ch-body-sm">{description}</p>
              </div>
            ))}
          </div>
          <div className="ch-journey-cta">
            <Link to={ROUTES.HOW_IT_WORKS} className="ch-btn ch-btn--outline ch-btn--sm">
              See the full journey
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>

      <section className="ch-section" id="templates">
        <Container>
          <SectionHeader
            eyebrow="Templates"
            title="A catalog built for every kind of celebration"
            description="A first look at CardHub's template styles — the full builder is on its way."
            align="center"
          />
          <div className="ch-template-teaser-grid">
            {DEMO_TEMPLATES.slice(0, 4).map((template) => (
              <GlassCard key={template.id} className="ch-template-teaser-card ch-animate-fade-in">
                <div
                  className="ch-template-teaser-card__swatch"
                  style={{ background: `linear-gradient(135deg, ${template.palette[0]}, ${template.palette[1]})` }}
                >
                  <FiSmartphone aria-hidden="true" />
                </div>
                <p className="ch-caption">{template.category}</p>
                <h3 className="ch-h4">{template.title}</h3>
              </GlassCard>
            ))}
          </div>
          <div className="ch-journey-cta">
            <Link to={ROUTES.TEMPLATES} className="ch-btn ch-btn--outline ch-btn--sm">
              Browse all templates
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>

      <section className="ch-section ch-cta">
        <Container>
          <GlassCard className="ch-cta__card">
            <h2 className="ch-h2">Ready to create your first invitation?</h2>
            <p className="ch-body-lg">Join CardHub today and bring your next event to life.</p>
            <Link to={ROUTES.REGISTER} className="ch-btn ch-btn--primary ch-btn--lg">
              Create your CardHub account
              <FiArrowRight aria-hidden="true" />
            </Link>
          </GlassCard>
        </Container>
      </section>
    </>
  );
}
