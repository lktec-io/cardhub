import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiArrowRight,
  FiCheck,
  FiClock,
  FiCreditCard,
  FiFilm,
  FiHeart,
  FiPhone,
  FiSend,
  FiShield,
  FiStar,
  FiTag,
  FiUsers,
} from 'react-icons/fi';
import { Container, Seo, HeroSlideshow } from '../components/common';
import { Button, Skeleton } from '../components/ui';
import { CardLightbox, TemplateCard } from '../components/templates';
import { TicketEventCard } from '../components/tickets';
import { ROUTES } from '../constants/routes';
import { templatesService } from '../services/templatesService';
import { ticketsService } from '../services/ticketsService';
import { PRICING_TIER_LIST } from '../constants/pricingTiers';
import { useLanguage } from '../hooks/useLanguage';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useCardActions } from '../hooks/useCardActions';
import './landing.css';

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
  { icon: FiStar, key: 'landing.value.1' },
  { icon: FiCreditCard, key: 'landing.value.2' },
  { icon: FiSend, key: 'landing.value.3' },
  { icon: FiClock, key: 'landing.value.4' },
  { icon: FiShield, key: 'landing.value.5' },
];

const JOURNEY_STEPS = [
  { step: '01', key: 'landing.journey.1' },
  { step: '02', key: 'landing.journey.2' },
  { step: '03', key: 'landing.journey.3' },
  { step: '04', key: 'landing.journey.4' },
];

const TICKET_POINTS = ['landing.tickets.point1', 'landing.tickets.point2', 'landing.tickets.point3'];

const PRICE_FORMAT = new Intl.NumberFormat('en-TZ');
const LOWEST_CARD_PRICE = Math.min(...PRICING_TIER_LIST.map((tier) => tier.priceTzs));

/** Split section header: eyebrow + title + lead on the left, an optional action on the right. */
function SplitHeader({ eyebrow, title, description, action }) {
  return (
    <div className="ch-landing-head">
      <div className="ch-landing-head__copy">
        <p className="ch-landing-eyebrow">{eyebrow}</p>
        <h2 className="ch-landing-head__title">{title}</h2>
        {description && <p className="ch-landing-head__lead">{description}</p>}
      </div>
      {action && <div className="ch-landing-head__action">{action}</div>}
    </div>
  );
}

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
  const [events, setEvents] = useState([]);
  const [eventsStatus, setEventsStatus] = useState('loading');
  const showHeroVideo = !reducedMotion && !heroVideoFailed;
  const activeSlideContent = HERO_SLIDE_CONTENT[activeSlideIndex] || HERO_SLIDE_CONTENT[0];
  // Same title/description text as the desktop floating selector below,
  // handed to HeroSlideshow so it can render an in-image caption for
  // mobile (a true DOM child of the photo box, not a sibling).
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

  // Read-only showcase of what's on sale. Hidden entirely when there's nothing to show.
  useEffect(() => {
    ticketsService
      .listEvents({ limit: 3 })
      .then((res) => {
        const list = res.data.data.events;
        setEvents(list);
        setEventsStatus(list.length ? 'success' : 'empty');
      })
      .catch(() => setEventsStatus('error'));
  }, []);

  return (
    <div className="ch-landing">
      <Seo description="CardHub by Clix Digital Works: digital invitations, event tickets and guest management for weddings, birthdays, send-offs, parties and corporate events in Tanzania." />

      {/* ---------- Hero ---------- */}
      <section className="ch-landing-hero">
        <Container className="ch-landing-hero__grid">
          <div className="ch-landing-hero__copy">
            <p className="ch-landing-hero__eyebrow">
              <span className="ch-landing-hero__pulse" aria-hidden="true" />
              {t('hero.eyebrow')}
            </p>
            <h1 className="ch-landing-hero__title">
              <span>{t('hero.headline.line1')}</span>{' '}
              <span className="ch-landing-hero__title-accent">{t('hero.headline.line2')}</span>
            </h1>
            <p className="ch-landing-hero__lead">{t('hero.supporting')}</p>

            <div className="ch-landing-hero__actions">
              <Link to={ROUTES.TEMPLATES} className="ch-btn ch-btn--conversion ch-btn--lg">
                {t('hero.ctaCreate')}
                <FiArrowRight aria-hidden="true" />
              </Link>
              <Link to={ROUTES.TICKETS} className="ch-btn ch-btn--secondary ch-btn--lg">
                <FiTag aria-hidden="true" />
                {t('hero.ctaTickets')}
              </Link>
            </div>

            <ul className="ch-landing-hero__proof">
              <li>
                <FiCheck aria-hidden="true" />
                {t('hero.proof.price', { price: `TSh ${PRICE_FORMAT.format(LOWEST_CARD_PRICE)}` })}
              </li>
              <li>
                <FiCheck aria-hidden="true" />
                {t('hero.proof.tickets')}
              </li>
              <li>
                <FiCheck aria-hidden="true" />
                {t('hero.proof.rsvp')}
              </li>
            </ul>
          </div>

          <div className="ch-landing-hero__visual">
            <div className={`ch-landing-hero__frame ${heroPhotoFailed ? 'ch-landing-hero__frame--fallback' : ''}`}>
              <HeroSlideshow
                alt="A couple celebrating their wedding — CardHub turns moments like this into a shareable digital card"
                onAllFailed={() => setHeroPhotoFailed(true)}
                onActiveIndexChange={setActiveSlideIndex}
                captions={slideCaptions}
              />
            </div>
            {!heroPhotoFailed && (
              <div className="ch-landing-hero__float" key={activeSlideIndex}>
                <span className="ch-landing-hero__float-icon">
                  <activeSlideContent.icon aria-hidden="true" />
                </span>
                <div className="ch-landing-hero__float-text">
                  <p className="ch-landing-hero__float-title">{t(`${activeSlideContent.key}.title`)}</p>
                  <p className="ch-landing-hero__float-description">{t(`${activeSlideContent.key}.description`)}</p>
                </div>
              </div>
            )}
          </div>
        </Container>
      </section>

      {/* ---------- Built-for strip ---------- */}
      <section className="ch-landing-strip" aria-label={t('hero.builtFor')}>
        <Container className="ch-landing-strip__inner">
          <p className="ch-landing-strip__label">{t('hero.builtFor')}</p>
          <ul className="ch-landing-strip__list">
            {HERO_CATEGORIES.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
          <a className="ch-landing-strip__support" href={`tel:${SUPPORT_PHONE_TEL}`}>
            <FiPhone aria-hidden="true" />
            <span>
              {t('hero.support')} <strong>{SUPPORT_PHONE_DISPLAY}</strong>
            </span>
          </a>
        </Container>
      </section>

      {/* ---------- Card catalogue showcase ---------- */}
      <section className="ch-landing-section" id="catalogue">
        <Container>
          <SplitHeader
            eyebrow={t('catalogue.eyebrow')}
            title={t('landing.catalogueTitle')}
            description={t('landing.catalogueDescription')}
            action={
              <Link to={ROUTES.TEMPLATES} className="ch-btn ch-btn--outline ch-btn--md">
                {t('landing.browseFullCatalogue')}
                <FiArrowRight aria-hidden="true" />
              </Link>
            }
          />

          {status === 'loading' && (
            <div className="ch-landing-gallery">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} height="360px" radius="var(--radius-surface)" />
              ))}
            </div>
          )}

          {status === 'success' && (
            <div className="ch-landing-gallery">
              {templates.map((template) => (
                <TemplateCard key={template.id} template={template} onPreview={setPreviewTemplate} onShare={share} onDownload={download} />
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
                  <Button variant="conversion" size="sm" onClick={() => navigate(`${ROUTES.CHECKOUT}?templateId=${previewTemplate.id}`)}>
                    {t('catalogue.buyNow')}
                  </Button>
                </>
              )
            }
          />
        </Container>
      </section>

      {/* ---------- Ticket showcase ---------- */}
      <section className="ch-landing-section ch-landing-section--band" id="tickets">
        <Container className="ch-landing-tickets">
          <div className="ch-landing-tickets__copy">
            <p className="ch-landing-eyebrow">{t('landing.tickets.eyebrow')}</p>
            <h2 className="ch-landing-head__title">{t('landing.tickets.title')}</h2>
            <p className="ch-landing-head__lead">{t('landing.tickets.description')}</p>
            <ul className="ch-landing-checklist">
              {TICKET_POINTS.map((key) => (
                <li key={key}>
                  <span className="ch-landing-checklist__mark" aria-hidden="true">
                    <FiCheck />
                  </span>
                  {t(key)}
                </li>
              ))}
            </ul>
            <Link to={ROUTES.TICKETS} className="ch-btn ch-btn--brand ch-btn--lg">
              {t('landing.tickets.cta')}
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>

          {/* .ch-tix scopes the ticket module tokens TicketEventCard reads. */}
          <div className="ch-landing-tickets__events ch-tix">
            {eventsStatus === 'loading' && <Skeleton height="420px" radius="var(--radius-surface)" />}
            {eventsStatus === 'success' && (
              <div className={`ch-landing-tickets__grid ch-landing-tickets__grid--${Math.min(events.length, 2)}`}>
                {events.slice(0, 2).map((event) => (
                  <TicketEventCard key={event.slug} event={event} />
                ))}
              </div>
            )}
            {(eventsStatus === 'empty' || eventsStatus === 'error') && (
              <div className="ch-landing-tickets__empty">
                <FiTag aria-hidden="true" />
                <p>{t('landing.tickets.empty')}</p>
              </div>
            )}
          </div>
        </Container>
      </section>

      {/* ---------- How it works + film ---------- */}
      <section className="ch-landing-section" id="how-it-works">
        <Container className="ch-landing-journey">
          <div className="ch-landing-journey__steps">
            <p className="ch-landing-eyebrow">{t('landing.howItWorksEyebrow')}</p>
            <h2 className="ch-landing-head__title">{t('landing.howItWorksTitle')}</h2>
            <ol className="ch-landing-steps">
              {JOURNEY_STEPS.map(({ step, key }) => (
                <li key={step} className="ch-landing-steps__item">
                  <span className="ch-landing-steps__number">{step}</span>
                  <div>
                    <h3 className="ch-landing-steps__title">{t(`${key}.title`)}</h3>
                    <p className="ch-landing-steps__text">{t(`${key}.description`)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <figure className="ch-landing-film">
            {showHeroVideo ? (
              <video
                className="ch-landing-film__video"
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
              <div className="ch-landing-film__placeholder" role="img" aria-label="CardHub video coming soon">
                <FiFilm aria-hidden="true" />
              </div>
            )}
            <figcaption className="ch-landing-film__caption">{t('landing.film.label')}</figcaption>
          </figure>
        </Container>
      </section>

      {/* ---------- Why CardHub ---------- */}
      <section className="ch-landing-section ch-landing-section--band" id="why-cardhub">
        <Container>
          <SplitHeader eyebrow={t('landing.whyEyebrow')} title={t('landing.whyTitle')} description={t('landing.whyDescription')} />
          <div className="ch-landing-bento">
            {VALUE_PROPS.map(({ icon: Icon, key }, index) => (
              <article key={key} className={`ch-landing-bento__item ${index === 0 ? 'ch-landing-bento__item--feature' : ''}`}>
                <span className="ch-landing-bento__icon">
                  <Icon aria-hidden="true" />
                </span>
                <h3 className="ch-landing-bento__title">{t(`${key}.title`)}</h3>
                <p className="ch-landing-bento__text">{t(`${key}.description`)}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      {/* ---------- Pricing ---------- */}
      <section className="ch-landing-section" id="pricing">
        <Container className="ch-landing-pricing">
          <div className="ch-landing-pricing__copy">
            <p className="ch-landing-eyebrow">{t('landing.pricingEyebrow')}</p>
            <h2 className="ch-landing-head__title">{t('landing.pricingTitle')}</h2>
            <p className="ch-landing-head__lead">{t('landing.pricingDescription')}</p>
            <Link to={ROUTES.PRICING} className="ch-btn ch-btn--outline ch-btn--md">
              {t('landing.seeFullPricing')}
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>
          <ul className="ch-landing-tiers">
            {PRICING_TIER_LIST.map((tier) => (
              <li key={tier.id} className="ch-landing-tiers__row">
                <span className="ch-landing-tiers__name">{tier.name}</span>
                <span className="ch-landing-tiers__price">
                  TSh {PRICE_FORMAT.format(tier.priceTzs)}
                  <small>{t('landing.pricing.perCard')}</small>
                </span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* ---------- Closing conversion band ---------- */}
      <section className="ch-landing-cta">
        <Container>
          <div className="ch-landing-cta__panel">
            <div className="ch-landing-cta__copy">
              <h2 className="ch-landing-cta__title">{t('landing.ctaCreateTitle')}</h2>
              <p className="ch-landing-cta__text">{t('landing.ctaCreateDescription')}</p>
            </div>
            <div className="ch-landing-cta__actions">
              <Link to={ROUTES.TEMPLATES} className="ch-btn ch-btn--conversion ch-btn--lg">
                {t('landing.createYourCard')}
                <FiArrowRight aria-hidden="true" />
              </Link>
              <Link to={ROUTES.TRY} className="ch-btn ch-btn--lg ch-landing-cta__secondary">
                {t('landing.tryOurService')}
              </Link>
              <p className="ch-landing-cta__note">{t('landing.ctaTryDescription')}</p>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
