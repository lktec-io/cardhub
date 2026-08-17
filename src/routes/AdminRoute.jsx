import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '../components/ui';
import { ROUTES } from '../constants/routes';

/**
 * UX-only gate — hides/redirects non-admins so they don't see a flash of
 * admin UI. The real authorization boundary is server-side
 * (authenticate + authorize('admin') on every /api/v1/admin/* route);
 * this component enforces nothing on its own.
 */
export function AdminRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="ch-route-loading">
        <Spinner size="lg" label="Checking session" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return <Outlet />;
}
