import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiBell, FiMenu } from 'react-icons/fi';
import { Avatar, Dropdown } from '../ui';
import { useAuth } from '../../hooks/useAuth';
import { notificationsService } from '../../services/notificationsService';
import { ROUTES } from '../../constants/routes';

export function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    notificationsService
      .unreadCount()
      .then((res) => setUnreadCount(res.data.data.count))
      .catch(() => {});
    // Re-check whenever the customer navigates back from the notifications page.
  }, [location.pathname]);

  return (
    <header className="ch-topbar">
      <button
        type="button"
        className="ch-topbar__menu-btn"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
      >
        <FiMenu />
      </button>

      <div className="ch-topbar__spacer" />

      <Link to={ROUTES.DASHBOARD_NOTIFICATIONS} className="ch-topbar__bell" aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}>
        <FiBell />
        {unreadCount > 0 && <span className="ch-topbar__bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </Link>

      <Dropdown
        align="right"
        trigger={
          <button type="button" className="ch-topbar__user" aria-label="Account menu">
            <Avatar name={user?.name || 'Guest'} size="sm" />
          </button>
        }
      >
        <button type="button" className="ch-dropdown__item" onClick={logout}>
          Log out
        </button>
      </Dropdown>
    </header>
  );
}
