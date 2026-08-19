import { NavLink } from 'react-router-dom';
import {
  FiBarChart2,
  FiCreditCard,
  FiGrid,
  FiImage,
  FiLayers,
  FiMessageSquare,
  FiSettings,
  FiShoppingBag,
  FiUsers,
} from 'react-icons/fi';
import { ROUTES } from '../../constants/routes';
import { useLanguage } from '../../hooks/useLanguage';

const NAV_ITEMS = [
  { key: 'sidebar.dashboard', to: ROUTES.DASHBOARD, icon: FiGrid, enabled: true, end: true },
  { key: 'sidebar.myCards', to: ROUTES.DASHBOARD_EVENTS, icon: FiImage, enabled: true },
  { key: 'nav.templates', to: ROUTES.TEMPLATES, icon: FiLayers, enabled: true },
  { key: 'sidebar.orders', to: ROUTES.DASHBOARD_ORDERS, icon: FiShoppingBag, enabled: true },
  { key: 'sidebar.guests', icon: FiUsers, enabled: false },
  { key: 'sidebar.messages', icon: FiMessageSquare, enabled: false },
  { key: 'sidebar.analytics', icon: FiBarChart2, enabled: false },
  { key: 'sidebar.billing', to: ROUTES.DASHBOARD_BILLING, icon: FiCreditCard, enabled: true },
  { key: 'sidebar.settings', to: ROUTES.DASHBOARD_SETTINGS, icon: FiSettings, enabled: true },
];

export function Sidebar({ isMobileOpen = false, onClose }) {
  const { t } = useLanguage();

  return (
    <>
      {isMobileOpen && (
        <div className="ch-sidebar-overlay" onClick={onClose} aria-hidden="true" />
      )}
      <aside className={`ch-sidebar ${isMobileOpen ? 'ch-sidebar--open' : ''}`}>
        <div className="ch-sidebar__brand">CardHub</div>
        <nav className="ch-sidebar__nav" aria-label="Dashboard">
          {NAV_ITEMS.map(({ key, to, icon: Icon, enabled, end }) =>
            enabled ? (
              <NavLink
                key={key}
                to={to}
                end={end}
                onClick={onClose}
                className={({ isActive }) => `ch-sidebar__link ${isActive ? 'ch-sidebar__link--active' : ''}`}
              >
                <Icon className="ch-sidebar__icon" aria-hidden="true" />
                <span>{t(key)}</span>
              </NavLink>
            ) : (
              <span key={key} className="ch-sidebar__link ch-sidebar__link--disabled" aria-disabled="true">
                <Icon className="ch-sidebar__icon" aria-hidden="true" />
                <span>{t(key)}</span>
                <span className="ch-sidebar__soon">{t('sidebar.soon')}</span>
              </span>
            )
          )}
        </nav>
      </aside>
    </>
  );
}
