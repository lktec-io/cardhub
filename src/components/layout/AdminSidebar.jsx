import { NavLink } from 'react-router-dom';
import { FiFileText, FiGrid, FiImage, FiLayers, FiUsers } from 'react-icons/fi';
import { ROUTES } from '../../constants/routes';

const NAV_ITEMS = [
  { label: 'Dashboard', to: ROUTES.ADMIN, icon: FiGrid, end: true },
  { label: 'Users', to: ROUTES.ADMIN_USERS, icon: FiUsers },
  { label: 'Events', to: ROUTES.ADMIN_EVENTS, icon: FiImage },
  { label: 'Templates', to: ROUTES.ADMIN_TEMPLATES, icon: FiLayers },
  { label: 'Audit Logs', to: ROUTES.ADMIN_AUDIT_LOGS, icon: FiFileText },
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
          {NAV_ITEMS.map(({ label, to, icon: Icon, end }) => (
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
          ))}
        </nav>
        <NavLink to={ROUTES.DASHBOARD} className="ch-sidebar__link ch-sidebar__back-link">
          &larr; Back to CardHub
        </NavLink>
      </aside>
    </>
  );
}
