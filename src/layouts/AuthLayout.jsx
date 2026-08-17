import { Link, Outlet } from 'react-router-dom';
import { ROUTES } from '../constants/routes';

export function AuthLayout() {
  return (
    <div className="ch-auth-layout">
      <Link to={ROUTES.HOME} className="ch-auth-layout__brand">
        CardHub
      </Link>
      <div className="ch-auth-layout__panel ch-animate-scale-in">
        <Outlet />
      </div>
      <p className="ch-auth-layout__footnote">Clix Digital Works &middot; cardhub.co.tz</p>
    </div>
  );
}
