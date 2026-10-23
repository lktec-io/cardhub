import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowRight, FiCheck, FiFilm, FiLink, FiPhone, FiPlay, FiTag } from 'react-icons/fi';
import { Container, Seo } from '../components/common';
import { Button, Skeleton } from '../components/ui';
import { CardLightbox, TemplateCard } from '../components/templates';
import { TicketEventCard } from '../components/tickets';
import { ROUTES } from '../constants/routes';
import { templatesService } from '../services/templatesService';
import { ticketsService } from '../services/ticketsService';
import { publicService } from '../services/publicService';
import { PRICING_TIER_LIST } from '../constants/pricingTiers';
import { useLanguage } from '../hooks/useLanguage';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useCardActions } from '../hooks/useCardActions';
import './landing.css';

// Real CardHub photography and card samples shipped in /public (VPS-deployed with the build).
const HERO_PHOTO = '/hero/hero-3.jpg';
const HERO_PHOTO_2 = '/hero/hero-1.jpg';
const FINAL_PHOTO = '/images/hero-couple4.jpg';
const FALLBACK_CARD = '/cards/midnight-romance.jpg';
const BUILT_IN_FILM = '/videos/cardhub-main-v2.mp4';

const SUPPORT_PHONE_DISPLAY = '0794 987 520';
const SUPPORT_PHONE_TEL = '+255794987520';

const CATEGORIES = ['hero.cat.weddings', 'hero.cat.birthdays', 'hero.cat.sendoffs', 'hero.cat.parties', 'hero.cat.corporate'];
const STEPS = ['landing.journey.1', 'landing.journey.2', 'landing.journey.3', 'landing.journey.4'];
const TICKET_POINTS = ['landing.tickets.point1', 'landing.tickets.point2', 'landing.tickets.point3'];

const PRICE_FORMAT = new Intl.NumberFormat('en-TZ');
const LOWEST_CARD_PRICE = Math.min(...PRICING_TIER_LIST.map((tier) => tier.priceTzs));

function SectionHead({ eyebrow, title, lead, action }) {
  return (
    <div className="ch-lx-head">
      <div>
        <p className="ch-lx-eyebrow">{eyebrow}</p>
        <h2 className="ch-lx-title">{title}</h2>
        {lead && <p className="ch-lx-lead">{lead}</p>}
      </div>
      {action && <div className="ch-lx-head__action">{action}</div>}
    </div>
  );
}

export function LandingPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const { share, download } = useCardActions();
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [status, setStatus] = useState('loading');
  const [events, setEvents] = useState([]);
  const [eventsStatus, setEventsStatus] = useState('loading');
  // Admin-published event videos; the built-in CardHub film is the fallback.
  const [videos, setVideos] = useState([]);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [filmFailed, setFilmFailed] = useState(false);

  useEffect(() => {
    templatesService
      .list({ limit: 8 })
      .then((res) => {
        const list = res.data.data.templates;
        setTemplates(list);
        setStatus(list.length === 0 ? 'empty' : 'success');
      })
      .catch(() => setStatus('error'));
  }, []);

  useEffect(() => {
    publicService
      .listVideos()
      .then((res) => setVideos(res.data.data.videos))
      .catch(() => setVideos([]));
  }, []);

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

  const activeVideo = videos[activeVideoIndex] || videos[0] || null;
  const heroCard = templates.find((tpl) => tpl.previewImage)?.previewImage || FALLBACK_CARD;
  const tryWith = (card) => navigate(`${ROUTES.TRY}?templateId=${card.id}`);

  return (
    <div className="ch-lx">
      <Seo description="CardHub by Clix Digital Works: digital invitations, event tickets and guest management for weddings, birthdays, send-offs, parties and corporate events in Tanzania." />

      {/* ---------- Hero ---------- */}
      <section className="ch-lx-hero">
        <div className="ch-lx-hero__backdrop" aria-hidden="true">
          <img src={HERO_PHOTO} alt="" />
        </div>
        <Container className="ch-lx-hero__grid">
          <div className="ch-lx-hero__copy">
            <p className="ch-lx-eyebrow ch-lx-hero__eyebrow">{t('lx.hero.eyebrow')}</p>
            <h1 className="ch-lx-hero__title">
              <span>{t('lx.hero.title1')}</span> <span className="ch-lx-hero__title-accent">{t('lx.hero.title2')}</span>
            </h1>
            <p className="ch-lx-hero__lead">{t('lx.hero.lead')}</p>
            <div className="ch-lx-hero__actions">
              <Link to={ROUTES.TRY} className="ch-btn ch-btn--conversion ch-btn--lg">
                {t('landing.tryOurService')}
                <FiArrowRight aria-hidden="true" />
              </Link>
              <Link to={ROUTES.TEMPLATES} className="ch-btn ch-btn--secondary ch-btn--lg">
                {t('lx.hero.ctaCards')}
              </Link>
            </div>
            <Link to={ROUTES.TICKETS} className="ch-lx-hero__ticketlink">
              <FiTag aria-hidden="true" /> {t('hero.ctaTickets')} <FiArrowRight aria-hidden="true" />
            </Link>
            <ul className="ch-lx-hero__proof">
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

          <div className="ch-lx-hero__visual">
            <figure className="ch-lx-photo ch-lx-photo--main">
              <img src={HERO_PHOTO} alt="A bride and groom laughing together on their wedding day" fetchPriority="high" />
            </figure>
            <figure className="ch-lx-photo ch-lx-photo--side" aria-hidden="true">
              <img src={HERO_PHOTO_2} alt="" loading="lazy" />
            </figure>
            <figure className="ch-lx-floatcard">
              <img src={heroCard} alt={t('lx.hero.chipCard')} />
              <figcaption>{t('lx.hero.chipCard')}</figcaption>
            </figure>
            <p className="ch-lx-chip ch-glass">
              <FiLink aria-hidden="true" /> {t('lx.hero.chipLink')}
            </p>
          </div>
        </Container>
      </section>

      {/* ---------- Built-for strip ---------- */}
      <section className="ch-lx-strip" aria-label={t('hero.builtFor')}>
        <Container className="ch-lx-strip__inner">
          <p className="ch-lx-strip__label">{t('hero.builtFor')}</p>
          <ul className="ch-lx-strip__list">
            {CATEGORIES.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
          <a className="ch-lx-strip__support" href={`tel:${SUPPORT_PHONE_TEL}`}>
            <FiPhone aria-hidden="true" />
            {t('hero.support')} <strong>{SUPPORT_PHONE_DISPLAY}</strong>
          </a>
        </Container>
      </section>

      {/* ---------- Card collection ---------- */}
      <section className="ch-lx-section" id="catalogue">
        <Container>
          <SectionHead
            eyebrow={t('lx.cards.eyebrow')}
            title={t('lx.cards.title')}
            lead={t('lx.cards.lead')}
            action={
              <Link to={ROUTES.TEMPLATES} className="ch-btn ch-btn--secondary ch-btn--md">
                {t('landing.browseFullCatalogue')}
                <FiArrowRight aria-hidden="true" />
              </Link>
            }
          />
          {status === 'loading' && (
            <div className="ch-lx-gallery">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} height="420px" radius="var(--radius-surface)" />
              ))}
            </div>
          )}
          {status === 'success' && (
            <div className="ch-lx-gallery">
              {templates.map((template) => (
                <TemplateCard key={template.id} template={template} onPreview={setPreviewTemplate} onUse={tryWith} onShare={share} onDownload={download} />
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
                  <Button variant="secondary" size="sm" onClick={() => tryWith(previewTemplate)}>
                    {t('catalogue.tryThisCard')}
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

      {/* ---------- Video showcase ---------- */}
      <section className="ch-lx-section ch-lx-cinema" id="videos">
        <Container>
          <SectionHead eyebrow={t('lx.video.eyebrow')} title={t('lx.video.title')} lead={t('lx.video.lead')} />
          <div className={`ch-lx-cinema__grid ${videos.length > 1 ? 'ch-lx-cinema__grid--list' : ''}`}>
            <figure className="ch-lx-cinema__screen ch-glass">
              {activeVideo ? (
                <video
                  key={activeVideo.id}
                  className="ch-lx-cinema__video"
                  src={activeVideo.url}
                  poster={activeVideo.posterUrl || undefined}
                  autoPlay={!reducedMotion}
                  muted
                  loop
                  playsInline
                  controls
                  preload="metadata"
                  aria-label={activeVideo.title}
                />
              ) : !filmFailed ? (
                <video
                  className="ch-lx-cinema__video"
                  src={BUILT_IN_FILM}
                  poster={HERO_PHOTO}
                  autoPlay={!reducedMotion}
                  muted
                  loop
                  playsInline
                  controls
                  preload="metadata"
                  aria-label={t('landing.film.label')}
                  onError={() => setFilmFailed(true)}
                />
              ) : (
                <div className="ch-lx-cinema__placeholder">
                  <FiFilm aria-hidden="true" />
                </div>
              )}
              <figcaption className="ch-lx-cinema__caption">
                <span>{activeVideo ? activeVideo.title : t('landing.film.label')}</span>
                {activeVideo?.description && <small>{activeVideo.description}</small>}
              </figcaption>
            </figure>
            {videos.length > 1 && (
              <ol className="ch-lx-cinema__list" aria-label={t('landing.film.pick')}>
                {videos.map((video, index) => (
                  <li key={video.id}>
                    <button
                      type="button"
                      className={`ch-lx-cinema__pick ${index === activeVideoIndex ? 'ch-lx-cinema__pick--active' : ''}`}
                      aria-pressed={index === activeVideoIndex}
                      onClick={() => setActiveVideoIndex(index)}
                    >
                      <span className="ch-lx-cinema__thumb">
                        {video.posterUrl ? <img src={video.posterUrl} alt="" loading="lazy" /> : <FiPlay aria-hidden="true" />}
                      </span>
                      <span className="ch-lx-cinema__pick-text">
                        <strong>{video.title}</strong>
                        {video.category && <small>{t(`category.${video.category}`)}</small>}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Container>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="ch-lx-section" id="how-it-works">
        <Container>
          <SectionHead eyebrow={t('landing.howItWorksEyebrow')} title={t('landing.howItWorksTitle')} />
          <ol className="ch-lx-steps">
            {STEPS.map((key, index) => (
              <li key={key} className="ch-lx-step ch-glass">
                <span className="ch-lx-step__num">{String(index + 1).padStart(2, '0')}</span>
                <h3 className="ch-lx-step__title">{t(`${key}.title`)}</h3>
                <p className="ch-lx-step__text">{t(`${key}.description`)}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* ---------- Tickets ---------- */}
      <section className="ch-lx-section ch-lx-tickets" id="tickets">
        <Container className="ch-lx-tickets__grid">
          <div className="ch-lx-tickets__copy">
            <p className="ch-lx-eyebrow">{t('landing.tickets.eyebrow')}</p>
            <h2 className="ch-lx-title">{t('landing.tickets.title')}</h2>
            <p className="ch-lx-lead">{t('landing.tickets.description')}</p>
            <ul className="ch-lx-checks">
              {TICKET_POINTS.map((key) => (
                <li key={key}>
                  <FiCheck aria-hidden="true" />
                  {t(key)}
                </li>
              ))}
            </ul>
            <Link to={ROUTES.TICKETS} className="ch-btn ch-btn--conversion ch-btn--lg">
              {t('lx.tix.cta')}
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>
          <div className="ch-lx-tickets__events ch-tix">
            {eventsStatus === 'loading' && <Skeleton height="420px" radius="var(--radius-surface)" />}
            {eventsStatus === 'success' && (
              <div className={`ch-lx-tickets__cards ch-lx-tickets__cards--${Math.min(events.length, 2)}`}>
                {events.slice(0, 2).map((event) => (
                  <TicketEventCard key={event.slug} event={event} />
                ))}
              </div>
            )}
            {(eventsStatus === 'empty' || eventsStatus === 'error') && (
              <div className="ch-lx-tickets__empty ch-glass">
                <FiTag aria-hidden="true" />
                <p>{t('landing.tickets.empty')}</p>
              </div>
            )}
          </div>
        </Container>
      </section>

      {/* ---------- Pricing ---------- */}
      <section className="ch-lx-section" id="pricing">
        <Container>
          <SectionHead
            eyebrow={t('landing.pricingEyebrow')}
            title={t('landing.pricingTitle')}
            lead={t('landing.pricingDescription')}
            action={
              <Link to={ROUTES.PRICING} className="ch-btn ch-btn--secondary ch-btn--md">
                {t('landing.seeFullPricing')}
                <FiArrowRight aria-hidden="true" />
              </Link>
            }
          />
          <ul className="ch-lx-tiers">
            {PRICING_TIER_LIST.map((tier, index) => (
              <li key={tier.id} className={`ch-lx-tier ch-glass ${index === 1 ? 'ch-lx-tier--featured' : ''}`}>
                <span className="ch-lx-tier__name">{tier.name}</span>
                <span className="ch-lx-tier__price">TSh {PRICE_FORMAT.format(tier.priceTzs)}</span>
                <span className="ch-lx-tier__unit">{t('landing.pricing.perCard')}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* ---------- Closing ---------- */}
      <section className="ch-lx-final">
        <div className="ch-lx-final__photo" aria-hidden="true">
          <img src={FINAL_PHOTO} alt="" loading="lazy" />
        </div>
        <Container className="ch-lx-final__inner">
          <h2 className="ch-lx-final__title">{t('lx.final.title')}</h2>
          <p className="ch-lx-lead">{t('landing.ctaCreateDescription')}</p>
          <div className="ch-lx-hero__actions">
            <Link to={ROUTES.TRY} className="ch-btn ch-btn--conversion ch-btn--lg">
              {t('landing.tryOurService')}
              <FiArrowRight aria-hidden="true" />
            </Link>
            <Link to={ROUTES.TEMPLATES} className="ch-btn ch-btn--secondary ch-btn--lg">
              {t('landing.browseFullCatalogue')}
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}
