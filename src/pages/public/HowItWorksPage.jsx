import { Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import { Container, SectionHeader, Seo } from '../../components/common';
import { ROUTES } from '../../constants/routes';
import { useLanguage } from '../../hooks/useLanguage';

const STEPS = [
  { step: '01', key: 'howItWorks.step.1' },
  { step: '02', key: 'howItWorks.step.2' },
  { step: '03', key: 'howItWorks.step.3' },
  { step: '04', key: 'howItWorks.step.4' },
  { step: '05', key: 'howItWorks.step.5' },
];

export function HowItWorksPage() {
  const { t } = useLanguage();

  return (
    <div className="ch-how-it-works-page">
      <Seo title="How It Works" description="See how CardHub takes you from choosing a template to celebrating your event." />
      <Container>
        <SectionHeader
          eyebrow={t('howItWorks.eyebrow')}
          title={t('howItWorks.title')}
          description={t('howItWorks.description')}
          align="center"
        />

        <div className="ch-how-it-works__timeline">
          {STEPS.map(({ step, key }) => (
            <div key={step} className="ch-how-it-works__row">
              <span className="ch-journey-card__step">{step}</span>
              <div>
                <h3 className="ch-h4">{t(`${key}.title`)}</h3>
                <p className="ch-body-sm">{t(`${key}.description`)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="ch-journey-cta">
          <Link to={ROUTES.REGISTER} className="ch-btn ch-btn--primary ch-btn--lg">
            {t('howItWorks.startCta')}
            <FiArrowRight aria-hidden="true" />
          </Link>
        </div>
      </Container>
    </div>
  );
}
