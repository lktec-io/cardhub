import { NavLink } from 'react-router-dom';
import {
  FiBarChart2,
  FiFileText,
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
  { label: 'Dashboard', to: ROUTES.ADMIN, icon: FiGrid, enabled: true, end: true },
  { label: 'Customers', to: ROUTES.ADMIN_CUSTOMERS, icon: FiUsers, enabled: true },
  { label: 'Cards / Templates', to: ROUTES.ADMIN_TEMPLATES, icon: FiLayers, enabled: true },
  { label: 'Orders', to: ROUTES.ADMIN_ORDERS, icon: FiShoppingBag, enabled: true },
  { label: 'Events', to: ROUTES.ADMIN_EVENTS, icon: FiImage, enabled: true },
  { label: 'Messages', icon: FiMessageSquare, enabled: false },
  { label: 'Analytics', icon: FiBarChart2, enabled: false },
  { label: 'Audit Logs', to: ROUTES.ADMIN_AUDIT_LOGS, icon: FiFileText, enabled: true },
  { label: 'Settings', icon: FiSettings, enabled: false },
];

export function AdminSidebar({ isMobileOpen = false, onClose }) {
  return (
    <>
      {isMobileOpen && <div className="ch-sidebar-overlay" onClick={onClose} aria-hidden="true" />}
      <aside className={`ch-sidebar ${isMobileOpen ? 'ch-sidebar--open' : ''}`}>
        <div className="ch-sidebar__brand">
          CardHub <span className="ch-sidebar__admin-tag">Admin</span>
        </div>
        <nav className="ch-sidebar__nav" aria-label="Admin">
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
        <NavLink to={ROUTES.DASHBOARD} className="ch-sidebar__link ch-sidebar__back-link">
          &larr; Back to CardHub
        </NavLink>
      </aside>
    </>
  );
}
