import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiArrowRight,
  FiCheck,
  FiClock,
  FiCreditCard,
  FiDownload,
  FiEye,
  FiFilm,
  FiHeart,
  FiPhone,
  FiSend,
  FiShare2,
  FiShield,
  FiStar,
  FiTag,
  FiUsers,
} from 'react-icons/fi';
import { Container, SectionHeader, Seo, HeroSlideshow } from '../components/common';
import { Button, GlassCard, Skeleton } from '../components/ui';
import { CardLightbox, TemplateThumb } from '../components/templates';
import { ROUTES } from '../constants/routes';
import { templatesService } from '../services/templatesService';
import { formatCardPrice, PRICING_TIER_LIST } from '../constants/pricingTiers';
import { useLanguage } from '../hooks/useLanguage';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useCardActions } from '../hooks/useCardActions';

const HERO_VIDEO_SRC = '/videos/cardhub-main-v2.mp4';

const SUPPORT_PHONE_DISPLAY = '0794 987 520';
const SUPPORT_PHONE_TEL = '+255794987520';

const HERO_CATEGORIES = ['hero.cat.weddings', 'hero.cat.birthdays', 'hero.cat.sendoffs', 'hero.cat.parties', 'hero.cat.corporate'];

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
  const { t } = useLanguage();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const { share, download } = useCardActions();
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [heroVideoFailed, setHeroVideoFailed] = useState(false);
  const [heroPhotoFailed, setHeroPhotoFailed] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [templates, setTemplates] = useState([]);
  const [status, setStatus] = useState('loading');
  const showHeroVideo = !reducedMotion && !heroVideoFailed;
  const activeSlideContent = HERO_SLIDE_CONTENT[activeSlideIndex] || HERO_SLIDE_CONTENT[0];
  // Same title/description text as the desktop floating selector below,
  // handed to HeroSlideshow so it can render an in-image caption for
  // mobile (a true DOM child of the photo box, not a sibling) — see
  // HeroSlideshow.jsx and .ch-hero-slideshow__caption in pages.css.
  const slideCaptions = HERO_SLIDE_CONTENT.map(({ key }) => ({
    title: t(`${key}.title`),
    description: t(`${key}.description`),
  }));

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
      <Seo description="CardHub by Clix Digital Works: digital invitations, event tickets and guest management for weddings, birthdays, send-offs, parties and corporate events in Tanzania." />

      <section className="ch-hero">
        <Container>
          <div className="ch-hero__grid">
            <div className="ch-hero__content ch-animate-slide-up">
              <p className="ch-hero__eyebrow">{t('hero.eyebrow')}</p>
              <h1 className="ch-display ch-hero__title ch-hero__headline">
                <span>{t('hero.headline.line1')}</span>{' '}
                <span className="ch-hero__headline-accent">{t('hero.headline.line2')}</span>
              </h1>
              <p className="ch-hero__description">{t('hero.supporting')}</p>
              <ul className="ch-hero__categories" aria-label={t('tix.filters.category')}>
                {HERO_CATEGORIES.map((key) => (
                  <li key={key}>{t(key)}</li>
                ))}
              </ul>
              <div className="ch-hero__actions">
                <Link to={ROUTES.TEMPLATES} className="ch-btn ch-btn--brand ch-btn--lg">
                  {t('hero.ctaCreate')}
                  <FiArrowRight aria-hidden="true" />
                </Link>
                <Link to={ROUTES.TICKETS} className="ch-btn ch-btn--secondary ch-btn--lg">
                  <FiTag aria-hidden="true" />
                  {t('hero.ctaTickets')}
                </Link>
              </div>
              <a className="ch-hero__support" href={`tel:${SUPPORT_PHONE_TEL}`}>
                <FiPhone aria-hidden="true" />
                <span>
                  {t('hero.support')}: <strong>{SUPPORT_PHONE_DISPLAY}</strong>
                </span>
              </a>
            </div>

            <div className="ch-hero__visual ch-animate-scale-in">
              <div className={`ch-hero__photo ${heroPhotoFailed ? 'ch-hero__photo--fallback' : ''}`}>
                <HeroSlideshow
                  alt="A couple celebrating their wedding — CardHub turns moments like this into a shareable digital card"
                  onAllFailed={() => setHeroPhotoFailed(true)}
                  onActiveIndexChange={setActiveSlideIndex}
                  captions={slideCaptions}
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
              {templates.map((template) => (
                <GlassCard key={template.id} className="ch-template-teaser-card ch-template-teaser-card--gallery ch-animate-fade-in">
                  <button
                    type="button"
                    className="ch-template-teaser-card__media"
                    onClick={() => setPreviewTemplate(template)}
                    aria-label={`${t('catalogue.view')}: ${template.name}`}
                  >
                    <TemplateThumb template={template} className="ch-template-teaser-card__swatch" />
                  </button>
                  <div className="ch-template-teaser-card__text">
                    <p className="ch-caption">{t(`category.${template.category}`)}</p>
                    <h3 className="ch-h4">{template.name}</h3>
                    <p className="ch-template-card__price">{formatCardPrice(template.priceTzs)}</p>
                  </div>
                  <div className="ch-card-tools">
                    <button type="button" className="ch-card-tool" onClick={() => setPreviewTemplate(template)}>
                      <FiEye aria-hidden="true" />
                      <span>{t('catalogue.view')}</span>
                    </button>
                    <button type="button" className="ch-card-tool" onClick={() => share(template)}>
                      <FiShare2 aria-hidden="true" />
                      <span>{t('catalogue.share')}</span>
                    </button>
                    <button type="button" className="ch-card-tool" onClick={() => download(template)}>
                      <FiDownload aria-hidden="true" />
                      <span>{t('catalogue.download')}</span>
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          <CardLightbox
            template={previewTemplate}
            onClose={() => setPreviewTemplate(null)}
            onShare={share}
            onDownload={download}
            actions={
              previewTemplate && (
                <>
                  <Button variant="secondary" size="sm" onClick={() => navigate(`${ROUTES.TRY}?templateId=${previewTemplate.id}`)}>
                    {t('catalogue.useThisCard')}
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => navigate(`${ROUTES.CHECKOUT}?templateId=${previewTemplate.id}`)}>
                    {t('catalogue.buyNow')}
                  </Button>
                </>
              )
            }
          />

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
