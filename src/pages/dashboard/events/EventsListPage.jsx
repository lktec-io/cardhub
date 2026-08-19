import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiPlus, FiSearch } from 'react-icons/fi';
import { PageHeader, Seo, Pagination } from '../../../components/common';
import { Button, EmptyState, Skeleton, Input } from '../../../components/ui';
import { EventCard, DeleteEventModal } from '../../../components/events';
import { eventsService } from '../../../services/eventsService';
import { useToast } from '../../../hooks/useToast';
import { useLanguage } from '../../../hooks/useLanguage';
import { getErrorMessage } from '../../../utils/mapValidationErrors';
import { ROUTES } from '../../../constants/routes';

const PAGE_SIZE = 9;

export function EventsListPage() {
  const { t } = useLanguage();
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
    <div className="ch-events-page">
      <Seo title="My Events" />
      <PageHeader
        eyebrow={t('events.eyebrow')}
        title={t('events.title')}
        description={t('events.description')}
        actions={
          <Button variant="primary" onClick={() => navigate(ROUTES.DASHBOARD_CREATE_EVENT)}>
            <FiPlus aria-hidden="true" /> {t('dashboardHome.createInvitation')}
          </Button>
        }
      />

      {status !== 'empty' || search ? (
        <Input
          icon={<FiSearch aria-hidden="true" />}
          placeholder={t('events.searchPlaceholder')}
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          aria-label={t('events.searchPlaceholder')}
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
          title={t('events.loadFailed')}
          description={t('dashboardHome.loadFailedDescription')}
          action={
            <Button variant="primary" onClick={load}>
              {t('dashboardHome.retry')}
            </Button>
          }
        />
      )}

      {status === 'empty' && !search && (
        <EmptyState
          icon={<FiPlus />}
          title={t('events.emptyTitle')}
          description={t('events.emptyDescription')}
          action={
            <Button variant="primary" onClick={() => navigate(ROUTES.DASHBOARD_CREATE_EVENT)}>
              {t('dashboardHome.createYourInvitation')}
            </Button>
          }
        />
      )}

      {status === 'empty' && search && (
        <EmptyState icon={<FiSearch />} title={t('events.noSearchResults')} description={t('events.tryDifferentSearch')} />
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
