import { useCallback, useEffect, useState } from 'react';
import { FiAlertCircle, FiSearch } from 'react-icons/fi';
import { PageHeader, Seo, Pagination } from '../../components/common';
import { Button, Input, EmptyState, Skeleton } from '../../components/ui';
import { EventStatusBadge } from '../../components/events';
import { adminService } from '../../services/adminService';
import { getEventTypeLabel } from '../../constants/eventTypes';

const PAGE_SIZE = 20;

export function AdminEventsPage() {
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
      <PageHeader eyebrow="CardHub Admin" title="Events" description="Read-only — event management stays with the event owner." />

      <Input
        icon={<FiSearch aria-hidden="true" />}
        placeholder="Search by title or owner email..."
        value={search}
        onChange={(e) => {
          setPage(1);
          setSearch(e.target.value);
        }}
        className="ch-admin-page__search"
      />

      {status === 'loading' && <Skeleton height="320px" radius="var(--radius-lg)" />}

      {status === 'error' && (
        <EmptyState icon={<FiAlertCircle />} title="Couldn't load events" action={<Button variant="primary" onClick={load}>Retry</Button>} />
      )}

      {status === 'empty' && <EmptyState title="No events found" />}

      {status === 'success' && (
        <>
          <div className="ch-table-wrap">
            <table className="ch-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="ch-table__name">{event.title}</td>
                    <td>{getEventTypeLabel(event.eventType)}</td>
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
