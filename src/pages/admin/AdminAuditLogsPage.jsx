import { useEffect, useState } from 'react';
import { FiAlertCircle, FiTrash2 } from 'react-icons/fi';
import { PageHeader, Seo, Pagination } from '../../components/common';
import { Button, EmptyState, Select, Skeleton } from '../../components/ui';
import { adminService } from '../../services/adminService';
import { useLanguage } from '../../hooks/useLanguage';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/mapValidationErrors';
import { DangerDialog } from './content/DangerDialog';
import './content/admin-content.css';

const PAGE_SIZE = 30;
const PURGE_OPTIONS = [30, 90, 180, 365].map((d) => ({ value: String(d), label: `Older than ${d} days` }));

export function AdminAuditLogsPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [status, setStatus] = useState('loading');
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [toDelete, setToDelete] = useState(null);
  const [purgeDays, setPurgeDays] = useState('365');
  const [purge, setPurge] = useState(null); // preview { count, cutoff, confirmPhrase }
  const [checking, setChecking] = useState(false);

  const [lastKey, setLastKey] = useState(`${page}|${reload}`);
  if (lastKey !== `${page}|${reload}`) {
    setLastKey(`${page}|${reload}`);
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

  useEffect(fetchLogs, [page, reload]);

  async function checkPurge() {
    setChecking(true);
    try {
      setPurge((await adminService.auditPurgePreview(Number(purgeDays))).data.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not check how many entries would be deleted.'));
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="ch-admin-page">
      <Seo title="Admin — Audit Logs" noIndex />
      <PageHeader eyebrow={t('admin.eyebrow')} title={t('admin.auditLogs.title')} description={t('admin.auditLogs.description')} />

      <section className="ch-tm-panel ch-audit-purge" aria-labelledby="ch-audit-purge">
        <div>
          <h2 className="ch-tm-panel__title" id="ch-audit-purge">
            Clean up old entries
          </h2>
          <p className="ch-tm-panel__lead">Permanently deletes audit entries older than the chosen age. The last 30 days are always kept, and every deletion is recorded in the deletion log below.</p>
        </div>
        <div className="ch-audit-purge__controls">
          <Select aria-label="Delete entries older than" value={purgeDays} onChange={(e) => setPurgeDays(e.target.value)} options={PURGE_OPTIONS} />
          <Button variant="danger" leftIcon={<FiTrash2 aria-hidden="true" />} onClick={checkPurge} isLoading={checking}>
            Delete old entries…
          </Button>
        </div>
      </section>

      {status === 'loading' && <Skeleton height="400px" radius="var(--radius-lg)" />}
      {status === 'error' && (
        <EmptyState icon={<FiAlertCircle />} title={t('admin.auditLogs.loadFailed')} action={<Button variant="primary" onClick={() => setReload((n) => n + 1)}>{t('dashboardHome.retry')}</Button>} />
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
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="ch-table__name">{log.action}</td>
                    <td>{log.entityType ? `${log.entityType} #${log.entityId}` : '—'}</td>
                    <td>{log.userId ?? '—'}</td>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>
                      <button type="button" className="ch-tm-icon-btn ch-tm-icon-btn--danger" onClick={() => setToDelete(log)} aria-label={`Delete audit entry ${log.id}`} title="Delete entry permanently">
                        <FiTrash2 aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={pagination?.totalPages} onChange={setPage} />
        </>
      )}

      <DeletionLog reload={reload} />

      <DangerDialog
        isOpen={Boolean(toDelete)}
        title="Delete this audit entry?"
        subject={toDelete ? `#${toDelete.id} · ${toDelete.action}${toDelete.entityType ? ` · ${toDelete.entityType} #${toDelete.entityId}` : ''}` : ''}
        warning="Audit entries can be needed for fraud, payment disputes or security investigations. The deletion itself is recorded in the deletion log."
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          await adminService.deleteAuditLog(toDelete.id);
          toast.success('Audit entry deleted.');
          setReload((n) => n + 1);
        }}
      />
      <DangerDialog
        isOpen={Boolean(purge)}
        title="Delete old audit entries?"
        subject={purge ? `${purge.count} entr${purge.count === 1 ? 'y' : 'ies'} older than ${purge.olderThanDays} days (before ${new Date(purge.cutoff).toLocaleDateString()})` : ''}
        blockedReason={purge && purge.count === 0 ? 'There are no entries that old. Nothing to delete.' : null}
        warning="This permanently removes them. Entries from the last 30 days are never touched."
        confirmPhrase={purge?.confirmPhrase}
        onClose={() => setPurge(null)}
        onConfirm={async (confirm) => {
          const res = await adminService.purgeAuditLogs(purge.olderThanDays, confirm);
          toast.success(`${res.data.data.deleted} audit entries deleted.`);
          setReload((n) => n + 1);
        }}
      />
    </div>
  );
}

/** Append-only record of hard deletes (survives audit-log deletion). Read-only by design. */
function DeletionLog({ reload }) {
  const [state, setState] = useState({ status: 'loading', events: [], pagination: null });
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    adminService
      .listSecurityEvents({ page, limit: 20 })
      .then((res) => active && setState({ status: 'success', ...res.data.data }))
      .catch(() => active && setState((s) => ({ ...s, status: 'error' })));
    return () => {
      active = false;
    };
  }, [page, reload]);

  return (
    <section className="ch-tm-panel ch-audit-deletions" aria-labelledby="ch-audit-deletions">
      <h2 className="ch-tm-panel__title" id="ch-audit-deletions">
        Deletion log
      </h2>
      <p className="ch-tm-panel__lead">Every permanent delete, who did it and when. This log cannot be deleted from the admin portal.</p>
      {state.status === 'loading' && <Skeleton height="120px" radius="var(--radius-surface)" />}
      {state.status === 'error' && <EmptyState icon={<FiAlertCircle />} title="Couldn’t load the deletion log" />}
      {state.status === 'success' && state.events.length === 0 && <EmptyState title="No deletions yet" />}
      {state.status === 'success' && state.events.length > 0 && (
        <>
          <div className="ch-table-wrap">
            <table className="ch-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>What</th>
                  <th>By</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {state.events.map((ev) => (
                  <tr key={ev.id}>
                    <td className="ch-table__name">{ev.action}</td>
                    <td>{ev.summary || `${ev.entityType} #${ev.entityId}`}</td>
                    <td>{ev.actorEmail || '—'}</td>
                    <td>{new Date(ev.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={state.pagination?.totalPages} onChange={setPage} />
        </>
      )}
    </section>
  );
}
