import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader, Seo } from '../../../components/common';
import { ROUTES } from '../../../constants/routes';

const TABS = [
  { label: 'Profile', to: ROUTES.DASHBOARD_SETTINGS_PROFILE },
  { label: 'Security', to: ROUTES.DASHBOARD_SETTINGS_SECURITY },
  { label: 'Notifications', to: ROUTES.DASHBOARD_SETTINGS_NOTIFICATIONS },
  { label: 'Language', to: ROUTES.DASHBOARD_SETTINGS_LANGUAGE },
];

export function SettingsLayout() {
  return (
    <div className="ch-settings-page">
      <Seo title="Account settings" />
      <PageHeader eyebrow="Account" title="Settings" description="Manage your profile, security, and preferences." />

      <div className="ch-settings-page__layout">
        <nav className="ch-settings-page__tabs" aria-label="Settings sections">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) => `ch-settings-page__tab ${isActive ? 'ch-settings-page__tab--active' : ''}`}
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
        <div className="ch-settings-page__panel">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
