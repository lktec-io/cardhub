import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { FiAlertCircle } from 'react-icons/fi';
import { PageHeader, Seo } from '../../../components/common';
import { Button, EmptyState, Spinner } from '../../../components/ui';
import { EventStatusBadge } from '../../../components/events';
import { eventsService } from '../../../services/eventsService';
import { ROUTES } from '../../../constants/routes';

const TABS = [
  { label: 'Overview', to: (id) => ROUTES.eventDetail(id), end: true, enabled: true },
  { label: 'Guests', to: (id) => ROUTES.eventGuests(id), enabled: true },
  { label: 'Messages', enabled: false },
  { label: 'Analytics', to: (id) => ROUTES.eventAnalytics(id), enabled: true },
  { label: 'Settings', to: (id) => ROUTES.eventSettings(id), enabled: true },
];

export function EventWorkspaceLayout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [status, setStatus] = useState('loading');

  // If the :id param changes while this layout stays mounted, show loading
  // immediately — adjusted during render (not in an effect, not via a ref).
  // See https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [lastId, setLastId] = useState(id);
  if (lastId !== id) {
    setLastId(id);
    if (status !== 'loading') setStatus('loading');
  }

  const fetchEvent = useCallback(() => {
    eventsService
      .getOne(id)
      .then((res) => {
        setEvent(res.data.data.event);
        setStatus('success');
      })
      .catch((error) => {
        setStatus(error.response?.status === 404 ? 'not-found' : 'error');
      });
  }, [id]);

  function load() {
    setStatus('loading');
    fetchEvent();
  }

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  if (status === 'loading') {
    return (
      <div className="ch-route-loading">
        <Spinner size="lg" label="Loading event" />
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <EmptyState
        icon={<FiAlertCircle />}
        title="Event not found"
        description="This event doesn't exist or you don't have access to it."
        action={
          <Button variant="primary" onClick={() => navigate(ROUTES.DASHBOARD_EVENTS)}>
            Back to My Events
          </Button>
        }
      />
    );
  }

  if (status === 'error') {
    return (
      <EmptyState
        icon={<FiAlertCircle />}
        title="Couldn't load this event"
        action={
          <Button variant="primary" onClick={load}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <div className="ch-event-workspace">
      <Seo title={event.title} />
      <PageHeader
        eyebrow="Event"
        title={
          <span className="ch-event-workspace__title">
            {event.title} <EventStatusBadge status={event.status} />
          </span>
        }
      />

      <nav className="ch-event-workspace__tabs" aria-label="Event sections">
        {TABS.map((tab) =>
          tab.enabled ? (
            <NavLink
              key={tab.label}
              to={tab.to(id)}
              end={tab.end}
              className={({ isActive }) => `ch-event-workspace__tab ${isActive ? 'ch-event-workspace__tab--active' : ''}`}
            >
              {tab.label}
            </NavLink>
          ) : (
            <span key={tab.label} className="ch-event-workspace__tab ch-event-workspace__tab--disabled" aria-disabled="true">
              {tab.label} <span className="ch-sidebar__soon">Soon</span>
            </span>
          )
        )}
      </nav>

      <Outlet context={{ event, reload: load }} />
    </div>
  );
}
