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

const NAV_ITEMS = [
  { label: 'Dashboard', to: ROUTES.DASHBOARD, icon: FiGrid, enabled: true, end: true },
  { label: 'My Cards', to: ROUTES.DASHBOARD_EVENTS, icon: FiImage, enabled: true },
  { label: 'Templates', to: ROUTES.TEMPLATES, icon: FiLayers, enabled: true },
  { label: 'Orders', to: ROUTES.DASHBOARD_ORDERS, icon: FiShoppingBag, enabled: true },
  { label: 'Guests', icon: FiUsers, enabled: false },
  { label: 'Messages', icon: FiMessageSquare, enabled: false },
  { label: 'Analytics', icon: FiBarChart2, enabled: false },
  { label: 'Billing', to: ROUTES.DASHBOARD_BILLING, icon: FiCreditCard, enabled: true },
  { label: 'Settings', to: ROUTES.DASHBOARD_SETTINGS, icon: FiSettings, enabled: true },
];

export function Sidebar({ isMobileOpen = false, onClose }) {
  return (
    <>
      {isMobileOpen && (
        <div className="ch-sidebar-overlay" onClick={onClose} aria-hidden="true" />
      )}
      <aside className={`ch-sidebar ${isMobileOpen ? 'ch-sidebar--open' : ''}`}>
        <div className="ch-sidebar__brand">CardHub</div>
        <nav className="ch-sidebar__nav" aria-label="Dashboard">
          {NAV_ITEMS.map(({ label, to, icon: Icon, enabled, end }) =>
            enabled ? (
              <NavLink
                key={label}
                to={to}
                end={end}
                onClick={onClose}
                className={({ isActive }) => `ch-sidebar__link ${isActive ? 'ch-sidebar__link--active' : ''}`}
              >
                <Icon className="ch-sidebar__icon" aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ) : (
              <span key={label} className="ch-sidebar__link ch-sidebar__link--disabled" aria-disabled="true">
                <Icon className="ch-sidebar__icon" aria-hidden="true" />
                <span>{label}</span>
                <span className="ch-sidebar__soon">Soon</span>
              </span>
            )
          )}
        </nav>
      </aside>
    </>
  );
}
