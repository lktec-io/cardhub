import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiPlus, FiSearch } from 'react-icons/fi';
import { PageHeader, Seo, Pagination } from '../../../components/common';
import { Button, EmptyState, Skeleton, Input } from '../../../components/ui';
import { EventCard, DeleteEventModal } from '../../../components/events';
import { eventsService } from '../../../services/eventsService';
import { useToast } from '../../../hooks/useToast';
import { getErrorMessage } from '../../../utils/mapValidationErrors';
import { ROUTES } from '../../../constants/routes';

const PAGE_SIZE = 9;

export function EventsListPage() {
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [status, setStatus] = useState('loading');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState(null);

  const navigate = useNavigate();
  const toast = useToast();

  const load = useCallback(() => {
    setStatus('loading');
    eventsService
      .list({ page, limit: PAGE_SIZE, search: search || undefined })
      .then((res) => {
        const data = res.data.data;
        setEvents(data.events);
        setPagination(data.pagination);
        setStatus(data.events.length === 0 ? 'empty' : 'success');
      })
      .catch(() => setStatus('error'));
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

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
    <div className="ch-events-page">
      <Seo title="My Events" />
      <PageHeader
        eyebrow="Events"
        title="My Events"
        description="Manage your CardHub invitations."
        actions={
          <Button variant="primary" onClick={() => navigate(ROUTES.DASHBOARD_CREATE_EVENT)}>
            <FiPlus aria-hidden="true" /> Create Invitation
          </Button>
        }
      />

      {status !== 'empty' || search ? (
        <Input
          icon={<FiSearch aria-hidden="true" />}
          placeholder="Search your events..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          aria-label="Search events"
          className="ch-events-page__search"
        />
      ) : null}

      {status === 'loading' && (
        <div className="ch-events-grid">
          {Array.from({ length: 3 }).map((_, i) => (
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
          icon={<FiAlertCircle />}
          title="Couldn't load your events"
          description="Something went wrong. Please try again."
          action={
            <Button variant="primary" onClick={load}>
              Retry
            </Button>
          }
        />
      )}

      {status === 'empty' && !search && (
        <EmptyState
          icon={<FiPlus />}
          title="Your events will appear here"
          description="Ready to create something beautiful? Start your first CardHub invitation."
          action={
            <Button variant="primary" onClick={() => navigate(ROUTES.DASHBOARD_CREATE_EVENT)}>
              Create your invitation
            </Button>
          }
        />
      )}

      {status === 'empty' && search && (
        <EmptyState icon={<FiSearch />} title="No events match your search" description="Try a different search term." />
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
          <Pagination page={page} totalPages={pagination?.totalPages} onChange={setPage} />
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
