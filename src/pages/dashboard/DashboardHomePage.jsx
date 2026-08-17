import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus } from 'react-icons/fi';
import { PageHeader, Seo } from '../../components/common';
import { EmptyState, Button, Skeleton } from '../../components/ui';
import { EventCard, DeleteEventModal } from '../../components/events';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { eventsService } from '../../services/eventsService';
import { getErrorMessage } from '../../utils/mapValidationErrors';
import { ROUTES } from '../../constants/routes';

const RECENT_LIMIT = 3;

export function DashboardHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const firstName = user?.name?.split(' ')[0];

  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('loading');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState(null);

  function fetchEvents() {
    eventsService
      .list({ page: 1, limit: RECENT_LIMIT, sort: 'recent' })
      .then((res) => {
        const data = res.data.data;
        setEvents(data.events);
        setTotal(data.pagination.total);
        setStatus(data.events.length === 0 ? 'empty' : 'success');
      })
      .catch(() => setStatus('error'));
  }

  function load() {
    setStatus('loading');
    fetchEvents();
  }

  // Initial state is already 'loading' — the mount effect only needs to
  // kick off the fetch, not call setState synchronously itself.
  useEffect(fetchEvents, []);

  async function handleDuplicate(event) {
    setDuplicatingId(event.id);
    try {
      const res = await eventsService.duplicate(event.id);
      toast.success('Event duplicated');
      navigate(ROUTES.eventDetail(res.data.data.event.id));
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not duplicate this event'));
    } finally {
      setDuplicatingId(null);
    }
  }

  async function handleConfirmDelete() {
    setIsDeleting(true);
    try {
      await eventsService.remove(deleteTarget.id);
      toast.success('Event deleted');
      setDeleteTarget(null);
      load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not delete this event'));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="ch-dashboard-home">
      <Seo title="Dashboard" />
      <PageHeader
        eyebrow="Dashboard"
        title={firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
        description={
          status === 'success'
            ? `You have ${total} event${total === 1 ? '' : 's'} in CardHub.`
            : 'Create your first invitation to get started with CardHub.'
        }
        actions={
          <Button variant="primary" onClick={() => navigate(ROUTES.DASHBOARD_CREATE_EVENT)}>
            <FiPlus aria-hidden="true" /> Create Invitation
          </Button>
        }
      />

      {status === 'loading' && (
        <div className="ch-events-grid">
          {Array.from({ length: RECENT_LIMIT }).map((_, i) => (
            <div key={i} className="ch-template-card-skeleton">
              <Skeleton height="120px" radius="var(--radius-md)" />
              <Skeleton height="20px" width="70%" />
              <Skeleton height="14px" width="50%" />
            </div>
          ))}
        </div>
      )}

      {status === 'error' && (
        <EmptyState
          title="Couldn't load your events"
          description="Something went wrong. Please try again."
          action={
            <Button variant="primary" onClick={load}>
              Retry
            </Button>
          }
        />
      )}

      {status === 'empty' && (
        <EmptyState
          icon={<FiPlus />}
          title="Your events will appear here"
          description="Ready to create something beautiful? Your CardHub invitations and events will show up on this page."
          action={
            <Button variant="primary" onClick={() => navigate(ROUTES.DASHBOARD_CREATE_EVENT)}>
              Create your invitation
            </Button>
          }
        />
      )}

      {status === 'success' && (
        <>
          <div className="ch-events-grid">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isDuplicating={duplicatingId === event.id}
                onDuplicate={handleDuplicate}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
          {total > RECENT_LIMIT && (
            <div className="ch-dashboard-home__view-all">
              <Button variant="ghost" onClick={() => navigate(ROUTES.DASHBOARD_EVENTS)}>
                View all events
              </Button>
            </div>
          )}
        </>
      )}

      <DeleteEventModal
        event={deleteTarget}
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
