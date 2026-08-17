import { Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import { Container, SectionHeader, Seo } from '../../components/common';
import { ROUTES } from '../../constants/routes';

const STEPS = [
  {
    step: '01',
    title: 'Choose your style',
    description:
      'Browse CardHub’s growing catalog of templates — wedding, send-off, birthday, graduation, and more — and pick the one that fits your event.',
  },
  {
    step: '02',
    title: 'Create your invitation',
    description:
      'Personalize your invitation with your event details. CardHub’s guided invitation builder is on its way to make this effortless.',
  },
  {
    step: '03',
    title: 'Share with guests',
    description: 'Share a single CardHub link with your guests — no app download required for them to view it.',
  },
  {
    step: '04',
    title: 'Manage your guest list',
    description: 'As CardHub’s guest and RSVP tools launch, you’ll be able to track responses in one organized place.',
  },
  {
    step: '05',
    title: 'Celebrate',
    description: 'Bring your event together, with CardHub supporting you from the first invitation to the last guest.',
  },
];

export function HowItWorksPage() {
  return (
    <div className="ch-how-it-works-page">
      <Seo title="How It Works" description="See how CardHub takes you from choosing a template to celebrating your event." />
      <Container>
        <SectionHeader
          eyebrow="How CardHub works"
          title="Your event, from invitation to celebration"
          description="Here’s the CardHub journey, from picking a template to bringing your guests together."
          align="center"
        />

        <div className="ch-how-it-works__timeline">
          {STEPS.map(({ step, title, description }) => (
            <div key={step} className="ch-how-it-works__row">
              <span className="ch-journey-card__step">{step}</span>
              <div>
                <h3 className="ch-h4">{title}</h3>
                <p className="ch-body-sm">{description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="ch-journey-cta">
          <Link to={ROUTES.REGISTER} className="ch-btn ch-btn--primary ch-btn--lg">
            Start creating your invitation
            <FiArrowRight aria-hidden="true" />
          </Link>
        </div>
      </Container>
    </div>
  );
}
