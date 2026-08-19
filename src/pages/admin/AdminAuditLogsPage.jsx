import { useEffect, useState } from 'react';
import { FiAlertCircle } from 'react-icons/fi';
import { PageHeader, Seo, Pagination } from '../../components/common';
import { Button, EmptyState, Skeleton } from '../../components/ui';
import { adminService } from '../../services/adminService';
import { useLanguage } from '../../hooks/useLanguage';

const PAGE_SIZE = 30;

export function AdminAuditLogsPage() {
  const { t } = useLanguage();
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
      <PageHeader eyebrow={t('admin.eyebrow')} title={t('admin.auditLogs.title')} description={t('admin.auditLogs.description')} />

      {status === 'loading' && <Skeleton height="400px" radius="var(--radius-lg)" />}

      {status === 'error' && (
        <EmptyState icon={<FiAlertCircle />} title={t('admin.auditLogs.loadFailed')} action={<Button variant="primary" onClick={load}>{t('dashboardHome.retry')}</Button>} />
      )}

      {status === 'empty' && <EmptyState title={t('admin.auditLogs.empty')} />}

      {status === 'success' && (
        <>
          <div className="ch-table-wrap">
            <table className="ch-table">
              <thead>
                <tr>
                  <th>{t('admin.auditLogs.action')}</th>
                  <th>{t('admin.auditLogs.entity')}</th>
                  <th>{t('admin.auditLogs.userId')}</th>
                  <th>{t('admin.auditLogs.when')}</th>
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
