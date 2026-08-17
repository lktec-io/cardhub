import { useEffect, useState } from 'react';
import { FiAlertCircle } from 'react-icons/fi';
import { PageHeader, Seo, Pagination } from '../../components/common';
import { Button, EmptyState, Skeleton } from '../../components/ui';
import { adminService } from '../../services/adminService';

const PAGE_SIZE = 30;

export function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [status, setStatus] = useState('loading');
  const [page, setPage] = useState(1);

  const [lastPage, setLastPage] = useState(page);
  if (lastPage !== page) {
    setLastPage(page);
    if (status !== 'loading') setStatus('loading');
  }

  function fetchLogs() {
    adminService
      .listAuditLogs({ page, limit: PAGE_SIZE })
      .then((res) => {
        const data = res.data.data;
        setLogs(data.logs);
        setPagination(data.pagination);
        setStatus(data.logs.length === 0 ? 'empty' : 'success');
      })
      .catch(() => setStatus('error'));
  }

  function load() {
    setStatus('loading');
    fetchLogs();
  }

  useEffect(fetchLogs, [page]);

  return (
    <div className="ch-admin-page">
      <Seo title="Admin — Audit Logs" />
      <PageHeader eyebrow="CardHub Admin" title="Audit Logs" description="Read-only history of account and platform actions." />

      {status === 'loading' && <Skeleton height="400px" radius="var(--radius-lg)" />}

      {status === 'error' && (
        <EmptyState icon={<FiAlertCircle />} title="Couldn't load audit logs" action={<Button variant="primary" onClick={load}>Retry</Button>} />
      )}

      {status === 'empty' && <EmptyState title="No audit log entries yet" />}

      {status === 'success' && (
        <>
          <div className="ch-table-wrap">
            <table className="ch-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>User ID</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="ch-table__name">{log.action}</td>
                    <td>
                      {log.entityType ? `${log.entityType} #${log.entityId}` : '—'}
                    </td>
                    <td>{log.userId ?? '—'}</td>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
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
