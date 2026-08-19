import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus } from 'react-icons/fi';
import { PageHeader, Seo } from '../../components/common';
import { EmptyState, Button, Skeleton } from '../../components/ui';
import { EventCard, DeleteEventModal } from '../../components/events';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useLanguage } from '../../hooks/useLanguage';
import { eventsService } from '../../services/eventsService';
import { getErrorMessage } from '../../utils/mapValidationErrors';
import { ROUTES } from '../../constants/routes';

const RECENT_LIMIT = 3;

export function DashboardHomePage() {
  const { t } = useLanguage();
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
      toast.success(t('dashboardHome.eventDuplicated'));
      navigate(ROUTES.eventDetail(res.data.data.event.id));
    } catch (error) {
      toast.error(getErrorMessage(error, t('dashboardHome.duplicateFailed')));
    } finally {
      setDuplicatingId(null);
    }
  }

  async function handleConfirmDelete() {
    setIsDeleting(true);
    try {
      await eventsService.remove(deleteTarget.id);
      toast.success(t('dashboardHome.eventDeleted'));
      setDeleteTarget(null);
      load();
    } catch (error) {
      toast.error(getErrorMessage(error, t('dashboardHome.deleteFailed')));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="ch-dashboard-home">
      <Seo title="Dashboard" />
      <PageHeader
        eyebrow={t('dashboardHome.eyebrow')}
        title={firstName ? t('dashboardHome.welcomeBack', { name: firstName }) : t('dashboardHome.welcomeBackNoName')}
        description={
          status === 'success'
            ? t('dashboardHome.eventCount', { count: total })
            : t('dashboardHome.getStarted')
        }
        actions={
          <Button variant="primary" onClick={() => navigate(ROUTES.DASHBOARD_CREATE_EVENT)}>
            <FiPlus aria-hidden="true" /> {t('dashboardHome.createInvitation')}
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
          title={t('dashboardHome.loadFailed')}
          description={t('dashboardHome.loadFailedDescription')}
          action={
            <Button variant="primary" onClick={load}>
              {t('dashboardHome.retry')}
            </Button>
          }
        />
      )}

      {status === 'empty' && (
        <EmptyState
          icon={<FiPlus />}
          title={t('dashboardHome.emptyTitle')}
          description={t('dashboardHome.emptyDescription')}
          action={
            <Button variant="primary" onClick={() => navigate(ROUTES.DASHBOARD_CREATE_EVENT)}>
              {t('dashboardHome.createYourInvitation')}
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
                {t('dashboardHome.viewAll')}
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
