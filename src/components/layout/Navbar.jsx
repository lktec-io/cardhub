import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { FiMenu, FiX } from 'react-icons/fi';
import { ROUTES } from '../../constants/routes';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { LanguageToggle } from './LanguageToggle';

const NAV_LINKS = [
  { key: 'nav.home', to: ROUTES.HOME },
  { key: 'nav.templates', to: ROUTES.TEMPLATES },
  { key: 'nav.pricing', to: ROUTES.PRICING },
  { key: 'nav.howItWorks', to: ROUTES.HOW_IT_WORKS },
  { key: 'nav.about', to: ROUTES.ABOUT },
  { key: 'nav.faq', to: ROUTES.FAQ },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  const [lastPathname, setLastPathname] = useState(location.pathname);
  if (location.pathname !== lastPathname) {
    setLastPathname(location.pathname);
    setIsOpen(false);
  }

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const ctaTarget = isAuthenticated ? ROUTES.DASHBOARD : ROUTES.TEMPLATES;
  const ctaLabel = isAuthenticated ? t('nav.goToDashboard') : t('nav.createYourCard');

  return (
    <>
      <header className="ch-navbar">
        <div className="ch-navbar__inner">
          <Link to={ROUTES.HOME} className="ch-navbar__brand">
            CardHub
          </Link>

          <nav className="ch-navbar__links ch-navbar__links--desktop" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.to === ROUTES.HOME}>
                {t(link.key)}
              </NavLink>
            ))}
          </nav>

          <div className="ch-navbar__actions ch-navbar__actions--desktop">
            <LanguageToggle />
            {!isAuthenticated && (
              <NavLink to={ROUTES.LOGIN} className="ch-navbar__login">
                {t('nav.login')}
              </NavLink>
            )}
            <Link to={ctaTarget} className="ch-btn ch-btn--primary ch-btn--sm">
              {ctaLabel}
            </Link>
          </div>

          <div className="ch-navbar__mobile-bar">
            <LanguageToggle className="ch-navbar__mobile-lang" />
            <button
              type="button"
              className="ch-navbar__toggle"
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isOpen}
              aria-controls="ch-navbar-sidebar"
              onClick={() => setIsOpen((prev) => !prev)}
            >
              <span className={`ch-navbar__toggle-icon ${isOpen ? 'ch-navbar__toggle-icon--open' : ''}`}>
                <FiMenu className="ch-navbar__toggle-icon-menu" aria-hidden="true" />
                <FiX className="ch-navbar__toggle-icon-close" aria-hidden="true" />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Deliberately rendered outside <header> — .ch-navbar has a
          backdrop-filter, which (per spec) makes it a containing block for
          position:fixed descendants, trapping them inside the navbar's own
          ~68px-tall box instead of the viewport. Keeping these as siblings
          of <header> avoids that entirely.
          Always mounted (not `{isOpen && ...}`) so the opacity transition
          below can animate on both open AND close — a conditionally
          mounted element disappears instantly on close, which is exactly
          the "jump/flicker" this is avoiding. */}
      <div
        className={`ch-navbar-overlay ${isOpen ? 'ch-navbar-overlay--visible' : ''}`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      <aside id="ch-navbar-sidebar" className={`ch-navbar__sidebar ${isOpen ? 'ch-navbar__sidebar--open' : ''}`}>
        <nav aria-label="Mobile" className="ch-navbar__sidebar-nav">
          {NAV_LINKS.map((link) => (
            <Link key={link.to} to={link.to}>
              {t(link.key)}
            </Link>
          ))}
        </nav>
        <div className="ch-navbar__sidebar-actions">
          {!isAuthenticated && <Link to={ROUTES.LOGIN}>{t('nav.login')}</Link>}
          <Link to={ctaTarget} className="ch-btn ch-btn--primary ch-btn--full">
            {ctaLabel}
          </Link>
        </div>
      </aside>
    </>
  );
}
