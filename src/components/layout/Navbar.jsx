import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { FiMenu, FiX } from 'react-icons/fi';
import { ROUTES } from '../../constants/routes';
import { useAuth } from '../../hooks/useAuth';

const NAV_LINKS = [
  { label: 'Templates', to: ROUTES.TEMPLATES },
  { label: 'Pricing', to: ROUTES.PRICING },
  { label: 'How It Works', to: ROUTES.HOW_IT_WORKS },
  { label: 'About', to: ROUTES.ABOUT },
  { label: 'FAQ', to: ROUTES.FAQ },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated } = useAuth();
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

  const ctaTarget = isAuthenticated ? ROUTES.DASHBOARD : ROUTES.REGISTER;
  const ctaLabel = isAuthenticated ? 'Go to dashboard' : 'Create Invitation';

  return (
    <header className="ch-navbar">
      <div className="ch-navbar__inner">
        <Link to={ROUTES.HOME} className="ch-navbar__brand">
          CardHub
        </Link>

        <nav className="ch-navbar__links ch-navbar__links--desktop" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="ch-navbar__actions ch-navbar__actions--desktop">
          {!isAuthenticated && (
            <NavLink to={ROUTES.LOGIN} className="ch-navbar__login">
              Log in
            </NavLink>
          )}
          <Link to={ctaTarget} className="ch-btn ch-btn--primary ch-btn--sm">
            {ctaLabel}
          </Link>
        </div>

        <button
          type="button"
          className="ch-navbar__toggle"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
        >
          {isOpen ? <FiX /> : <FiMenu />}
        </button>
      </div>

      {isOpen && (
        <div className="ch-navbar__mobile ch-animate-slide-down">
          <nav aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="ch-navbar__mobile-actions">
            {!isAuthenticated && <Link to={ROUTES.LOGIN}>Log in</Link>}
            <Link to={ctaTarget} className="ch-btn ch-btn--primary ch-btn--full">
              {ctaLabel}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
