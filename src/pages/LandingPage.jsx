import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiCheck, FiClock, FiCreditCard, FiFilm, FiHeart, FiSend, FiShield, FiStar, FiUsers } from 'react-icons/fi';
import { Container, SectionHeader, Seo, RotatingHeadline, HeroSlideshow } from '../components/common';
import { GlassCard, Badge, Skeleton } from '../components/ui';
import { TemplateThumb } from '../components/templates';
import { ROUTES } from '../constants/routes';
import { templatesService } from '../services/templatesService';
import { formatCardPrice, PRICING_TIER_LIST } from '../constants/pricingTiers';
import { useLanguage } from '../hooks/useLanguage';
import { useReducedMotion } from '../hooks/useReducedMotion';

const HERO_VIDEO_SRC = '/videos/cardhub-hero.mp4';

const HERO_MESSAGES = {
  en: ['Your Moment. Your Card.', 'Beautiful Cards. Made Simple.', 'Celebrate. Share. Remember.', 'Create. Send. Celebrate.'],
  sw: ['Wakati Wako. Kadi Yako.', 'Kadi Nzuri. Rahisi Kupata.', 'Sherehekea. Shiriki. Kumbuka.', 'Tengeneza. Tuma. Sherehekea.'],
};

/** One floating selector per hero slide — index-matched to HeroSlideshow's HERO_SLIDES. */
const HERO_SLIDE_CONTENT = [
  { icon: FiHeart, key: 'hero.slide.1' },
  { icon: FiSend, key: 'hero.slide.2' },
  { icon: FiUsers, key: 'hero.slide.3' },
];

const VALUE_PROPS = [
  { icon: FiStar, tone: 'blue', key: 'landing.value.1' },
  { icon: FiCreditCard, tone: 'gold', key: 'landing.value.2' },
  { icon: FiSend, tone: 'mint', key: 'landing.value.3' },
  { icon: FiClock, tone: 'gold', key: 'landing.value.4' },
  { icon: FiShield, tone: 'blue', key: 'landing.value.5' },
];

const JOURNEY_STEPS = [
  { step: '01', key: 'landing.journey.1' },
  { step: '02', key: 'landing.journey.2' },
  { step: '03', key: 'landing.journey.3' },
  { step: '04', key: 'landing.journey.4' },
];

export function LandingPage() {
  const { t, language } = useLanguage();
  const reducedMotion = useReducedMotion();
  const [heroVideoFailed, setHeroVideoFailed] = useState(false);
  const [heroPhotoFailed, setHeroPhotoFailed] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [templates, setTemplates] = useState([]);
  const [status, setStatus] = useState('loading');
  const showHeroVideo = !reducedMotion && !heroVideoFailed;
  const activeSlideContent = HERO_SLIDE_CONTENT[activeSlideIndex] || HERO_SLIDE_CONTENT[0];

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
              <Badge variant="accent">{t('landing.badge')}</Badge>
              <h1 className="ch-display ch-hero__title">CardHub</h1>
              <RotatingHeadline as="p" className="ch-hero__subtitle" messages={HERO_MESSAGES[language] || HERO_MESSAGES.en} />
              <p className="ch-hero__description">{t('landing.heroDescription')}</p>
              <div className="ch-hero__actions">
                <Link to={ROUTES.TEMPLATES} className="ch-btn ch-btn--primary ch-btn--lg">
                  {t('landing.createYourCard')}
                  <FiArrowRight aria-hidden="true" />
                </Link>
                <Link to={ROUTES.TRY} className="ch-btn ch-btn--secondary ch-btn--lg">
                  {t('landing.tryOurService')}
                </Link>
              </div>
            </div>

            <div className="ch-hero__visual ch-animate-scale-in">
              <div className={`ch-hero__photo ${heroPhotoFailed ? 'ch-hero__photo--fallback' : ''}`}>
                <HeroSlideshow
                  alt="A couple celebrating their wedding — CardHub turns moments like this into a shareable digital card"
                  onAllFailed={() => setHeroPhotoFailed(true)}
                  onActiveIndexChange={setActiveSlideIndex}
                />
              </div>
              {!heroPhotoFailed && (
                <div className="ch-hero-selector" key={activeSlideIndex}>
                  <span className="ch-hero-selector__icon">
                    <activeSlideContent.icon aria-hidden="true" />
                  </span>
                  <div className="ch-hero-selector__text">
                    <p className="ch-hero-selector__title">{t(`${activeSlideContent.key}.title`)}</p>
                    <p className="ch-hero-selector__description">{t(`${activeSlideContent.key}.description`)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* A separate, foreground element below the text/image — never a
                background, never sits behind or under anything. Its own grid
                item (see pages.css .ch-hero__grid) so mobile can place it
                after the image without it ever being nested inside the text
                block, which is what caused it to appear before the image. */}
            <div className="ch-hero__video-wrap">
              {showHeroVideo ? (
                <video
                  className="ch-hero__video"
                  src={HERO_VIDEO_SRC}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                  aria-hidden="true"
                  onError={() => setHeroVideoFailed(true)}
                />
              ) : (
                <div className="ch-hero__video-placeholder" role="img" aria-label="CardHub video coming soon">
                  <FiFilm aria-hidden="true" />
                </div>
              )}
            </div>
          </div>
        </Container>
      </section>

      <section className="ch-section" id="catalogue">
        <Container>
          <SectionHeader
            eyebrow={t('catalogue.eyebrow')}
            title={t('landing.catalogueTitle')}
            description={t('landing.catalogueDescription')}
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
                      <p className="ch-caption">{t(`category.${template.category}`)}</p>
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
              {t('landing.browseFullCatalogue')}
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>

      <section className="ch-section ch-section--alt" id="how-it-works">
        <Container>
          <SectionHeader eyebrow={t('landing.howItWorksEyebrow')} title={t('landing.howItWorksTitle')} align="center" />
          <div className="ch-journey-grid">
            {JOURNEY_STEPS.map(({ step, key }) => (
              <div key={step} className="ch-journey-card">
                <span className="ch-journey-card__step">{step}</span>
                <h3 className="ch-h4">{t(`${key}.title`)}</h3>
                <p className="ch-body-sm">{t(`${key}.description`)}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="ch-section" id="why-cardhub">
        <Container>
          <SectionHeader
            eyebrow={t('landing.whyEyebrow')}
            title={t('landing.whyTitle')}
            description={t('landing.whyDescription')}
            align="center"
          />
          <div className="ch-value-grid">
            {VALUE_PROPS.map(({ icon: Icon, tone, key }) => (
              <div key={key} className="ch-value-card">
                <div className={`ch-value-card__icon ch-value-card__icon--${tone}`}>
                  <Icon aria-hidden="true" />
                </div>
                <h3 className="ch-h4">{t(`${key}.title`)}</h3>
                <p className="ch-body-sm">{t(`${key}.description`)}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="ch-section ch-section--alt" id="pricing">
        <Container>
          <SectionHeader
            eyebrow={t('landing.pricingEyebrow')}
            title={t('landing.pricingTitle')}
            description={t('landing.pricingDescription')}
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
              {t('landing.seeFullPricing')}
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>

      <section className="ch-section ch-cta" id="try">
        <Container>
          <GlassCard className="ch-cta__card">
            <FiCheck className="ch-cta__icon" aria-hidden="true" />
            <h2 className="ch-h2">{t('landing.ctaTryTitle')}</h2>
            <p className="ch-body-lg">{t('landing.ctaTryDescription')}</p>
            <Link to={ROUTES.TRY} className="ch-btn ch-btn--primary ch-btn--lg">
              {t('landing.tryOurService')}
              <FiArrowRight aria-hidden="true" />
            </Link>
          </GlassCard>
        </Container>
      </section>

      <section className="ch-section ch-cta">
        <Container>
          <GlassCard className="ch-cta__card">
            <h2 className="ch-h2">{t('landing.ctaCreateTitle')}</h2>
            <p className="ch-body-lg">{t('landing.ctaCreateDescription')}</p>
            <Link to={ROUTES.TEMPLATES} className="ch-btn ch-btn--primary ch-btn--lg">
              {t('landing.createYourCard')}
              <FiArrowRight aria-hidden="true" />
            </Link>
          </GlassCard>
        </Container>
      </section>
    </>
  );
}
