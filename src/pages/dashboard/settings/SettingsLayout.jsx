import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader, Seo } from '../../../components/common';
import { ROUTES } from '../../../constants/routes';
import { useLanguage } from '../../../hooks/useLanguage';

const TABS = [
  { key: 'settings.tab.profile', to: ROUTES.DASHBOARD_SETTINGS_PROFILE },
  { key: 'settings.tab.security', to: ROUTES.DASHBOARD_SETTINGS_SECURITY },
  { key: 'settings.tab.notifications', to: ROUTES.DASHBOARD_SETTINGS_NOTIFICATIONS },
  { key: 'settings.tab.language', to: ROUTES.DASHBOARD_SETTINGS_LANGUAGE },
];

export function SettingsLayout() {
  const { t } = useLanguage();

  return (
    <div className="ch-settings-page">
      <Seo title="Account settings" />
      <PageHeader eyebrow={t('settings.eyebrow')} title={t('settings.title')} description={t('settings.description')} />

      <div className="ch-settings-page__layout">
        <nav className="ch-settings-page__tabs" aria-label="Settings sections">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) => `ch-settings-page__tab ${isActive ? 'ch-settings-page__tab--active' : ''}`}
            >
              {t(tab.key)}
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
