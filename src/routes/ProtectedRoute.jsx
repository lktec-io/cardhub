import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '../components/ui';
import { ROUTES } from '../constants/routes';

/**
 * The organizer workspace (/dashboard: invitation builder, guests, event
 * tickets) is now staff-only: public customer accounts were retired in
 * favour of the guest Try/Checkout flow. The data and API stay intact;
 * the server still authorizes every call.
 */
export function ProtectedRoute() {
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
    return <Navigate to={ROUTES.ADMIN_LOGIN} state={{ from: location }} replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return <Outlet />;
}
