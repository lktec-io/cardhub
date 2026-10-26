import { NavLink } from 'react-router-dom';
import { FiCalendar, FiCamera, FiCreditCard, FiFileText, FiGrid, FiImage, FiLayers, FiShoppingBag, FiUsers, FiVideo } from 'react-icons/fi';
import { ROUTES } from '../../constants/routes';
import { useLanguage } from '../../hooks/useLanguage';

/** Only working modules, grouped by job; event-day tools first. */
const NAV_GROUPS = [
  {
    label: 'Operations',
    items: [
      { key: 'sidebar.dashboard', to: ROUTES.ADMIN, icon: FiGrid, end: true },
      { key: 'sidebar.admin.scan', to: ROUTES.ADMIN_SCAN, icon: FiCamera },
      { key: 'sidebar.admin.ticketEvents', to: ROUTES.ADMIN_TICKET_EVENTS, icon: FiCalendar },
    ],
  },
  {
    label: 'Content',
    items: [
      { key: 'sidebar.admin.cards', to: ROUTES.ADMIN_CARDS, icon: FiLayers },
      { key: 'sidebar.admin.videos', to: ROUTES.ADMIN_MEDIA, icon: FiVideo },
    ],
  },
  {
    label: 'Sales',
    items: [
      { key: 'sidebar.orders', to: ROUTES.ADMIN_ORDERS, icon: FiShoppingBag },
      { key: 'sidebar.admin.payments', to: ROUTES.ADMIN_PAYMENTS, icon: FiCreditCard },
      { key: 'sidebar.admin.customers', to: ROUTES.ADMIN_CUSTOMERS, icon: FiUsers },
      { key: 'sidebar.admin.invitationEvents', to: ROUTES.ADMIN_EVENTS, icon: FiImage },
    ],
  },
  {
    label: 'System',
    items: [{ key: 'sidebar.admin.auditLogs', to: ROUTES.ADMIN_AUDIT_LOGS, icon: FiFileText }],
  },
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
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="ch-sidebar__group">
              <p className="ch-sidebar__group-label">{group.label}</p>
              {group.items.map(({ key, to, icon: Icon, end }) => (
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
              ))}
            </div>
          ))}
        </nav>
        <NavLink to={ROUTES.HOME} className="ch-sidebar__link ch-sidebar__back-link">
          &larr; {t('sidebar.admin.viewSite')}
        </NavLink>
      </aside>
    </>
  );
}
