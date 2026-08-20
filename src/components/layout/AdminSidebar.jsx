import { NavLink } from 'react-router-dom';
import {
  FiBarChart2,
  FiCreditCard,
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
import { useLanguage } from '../../hooks/useLanguage';

const NAV_ITEMS = [
  { key: 'sidebar.dashboard', to: ROUTES.ADMIN, icon: FiGrid, enabled: true, end: true },
  { key: 'sidebar.admin.customers', to: ROUTES.ADMIN_CUSTOMERS, icon: FiUsers, enabled: true },
  { key: 'sidebar.admin.templates', to: ROUTES.ADMIN_TEMPLATES, icon: FiLayers, enabled: true },
  { key: 'sidebar.orders', to: ROUTES.ADMIN_ORDERS, icon: FiShoppingBag, enabled: true },
  { key: 'sidebar.admin.payments', to: ROUTES.ADMIN_PAYMENTS, icon: FiCreditCard, enabled: true },
  { key: 'sidebar.admin.events', to: ROUTES.ADMIN_EVENTS, icon: FiImage, enabled: true },
  { key: 'sidebar.messages', icon: FiMessageSquare, enabled: false },
  { key: 'sidebar.analytics', icon: FiBarChart2, enabled: false },
  { key: 'sidebar.admin.auditLogs', to: ROUTES.ADMIN_AUDIT_LOGS, icon: FiFileText, enabled: true },
  { key: 'sidebar.settings', icon: FiSettings, enabled: false },
];

export function AdminSidebar({ isMobileOpen = false, onClose }) {
  const { t } = useLanguage();

  return (
    <>
      {isMobileOpen && <div className="ch-sidebar-overlay" onClick={onClose} aria-hidden="true" />}
      <aside className={`ch-sidebar ${isMobileOpen ? 'ch-sidebar--open' : ''}`}>
        <div className="ch-sidebar__brand">
          CardHub <span className="ch-sidebar__admin-tag">Admin</span>
        </div>
        <nav className="ch-sidebar__nav" aria-label="Admin">
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
        <NavLink to={ROUTES.DASHBOARD} className="ch-sidebar__link ch-sidebar__back-link">
          &larr; {t('sidebar.admin.backToCardHub')}
        </NavLink>
      </aside>
    </>
  );
}
