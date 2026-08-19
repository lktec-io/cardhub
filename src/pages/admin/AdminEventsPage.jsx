import { useCallback, useEffect, useState } from 'react';
import { FiAlertCircle, FiSearch } from 'react-icons/fi';
import { PageHeader, Seo, Pagination } from '../../components/common';
import { Button, Input, EmptyState, Skeleton } from '../../components/ui';
import { EventStatusBadge } from '../../components/events';
import { adminService } from '../../services/adminService';
import { useLanguage } from '../../hooks/useLanguage';

const PAGE_SIZE = 20;

export function AdminEventsPage() {
  const { t } = useLanguage();
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [status, setStatus] = useState('loading');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    adminService
      .listEvents({ page, limit: PAGE_SIZE, search: search || undefined })
      .then((res) => {
        const data = res.data.data;
        setEvents(data.events);
        setPagination(data.pagination);
        setStatus(data.events.length === 0 ? 'empty' : 'success');
      })
      .catch(() => setStatus('error'));
  }, [page, search]);

  const [lastKey, setLastKey] = useState(`${page}|${search}`);
  const key = `${page}|${search}`;
  if (key !== lastKey) {
    setLastKey(key);
    setStatus('loading');
  }

  useEffect(() => {
    const timer = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  return (
    <div className="ch-admin-page">
      <Seo title="Admin — Events" />
      <PageHeader eyebrow={t('admin.eyebrow')} title={t('admin.events.title')} description={t('admin.events.description')} />

      <Input
        icon={<FiSearch aria-hidden="true" />}
        placeholder={t('admin.events.searchPlaceholder')}
        value={search}
        onChange={(e) => {
          setPage(1);
          setSearch(e.target.value);
        }}
        className="ch-admin-page__search"
      />

      {status === 'loading' && <Skeleton height="320px" radius="var(--radius-lg)" />}

      {status === 'error' && (
        <EmptyState icon={<FiAlertCircle />} title={t('admin.events.loadFailed')} action={<Button variant="primary" onClick={load}>{t('dashboardHome.retry')}</Button>} />
      )}

      {status === 'empty' && <EmptyState title={t('admin.events.empty')} />}

      {status === 'success' && (
        <>
          <div className="ch-table-wrap">
            <table className="ch-table">
              <thead>
                <tr>
                  <th>{t('admin.events.title.col')}</th>
                  <th>{t('admin.events.type')}</th>
                  <th>{t('admin.events.owner')}</th>
                  <th>{t('admin.customers.status')}</th>
                  <th>{t('admin.created')}</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="ch-table__name">{event.title}</td>
                    <td>{t(`category.${event.eventType}`)}</td>
                    <td>
                      {event.ownerName}
                      <br />
                      <span className="ch-caption">{event.ownerEmail}</span>
                    </td>
                    <td>
                      <EventStatusBadge status={event.status} />
                    </td>
                    <td>{new Date(event.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={pagination?.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
