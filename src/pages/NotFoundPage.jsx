import { Link } from 'react-router-dom';
import { FiCompass } from 'react-icons/fi';
import { EmptyState, Button } from '../components/ui';
import { ROUTES } from '../constants/routes';

export function NotFoundPage() {
  return (
    <div className="ch-not-found">
      <EmptyState
        icon={<FiCompass />}
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={
          <Link to={ROUTES.HOME}>
            <Button variant="primary">Back to home</Button>
          </Link>
        }
      />
    </div>
  );
}
