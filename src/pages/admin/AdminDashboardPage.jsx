import { useEffect, useState } from 'react';
import { FiAlertCircle, FiClock, FiCreditCard, FiDollarSign, FiShoppingBag, FiUsers, FiXCircle } from 'react-icons/fi';
import { PageHeader, Seo } from '../../components/common';
import { Button, EmptyState, Skeleton } from '../../components/ui';
import { adminService } from '../../services/adminService';
import { useLanguage } from '../../hooks/useLanguage';

function StatTile({ icon: Icon, label, value }) {
  return (
    <div className="ch-admin-stat-tile">
      <Icon aria-hidden="true" />
      <span className="ch-admin-stat-tile__value">{value}</span>
      <span className="ch-admin-stat-tile__label">{label}</span>
    </div>
  );
}

export function AdminDashboardPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState('loading');

  function fetchStats() {
    adminService
      .stats()
      .then((res) => {
        setStats(res.data.data.stats);
        setStatus('success');
      })
      .catch(() => setStatus('error'));
  }

  function load() {
    setStatus('loading');
    fetchStats();
  }

  // Initial state is already 'loading' — the mount effect only needs to
  // kick off the fetch, not call setState synchronously itself.
  useEffect(fetchStats, []);

  return (
    <div className="ch-admin-dashboard">
      <Seo title="Admin Dashboard" />
      <PageHeader eyebrow={t('admin.eyebrow')} title={t('admin.dashboard.title')} description={t('admin.dashboard.description')} />

      {status === 'loading' && (
        <div className="ch-admin-stats-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height="110px" radius="var(--radius-lg)" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <EmptyState
          icon={<FiAlertCircle />}
          title={t('admin.dashboard.loadFailed')}
          action={
            <Button variant="primary" onClick={load}>
              {t('dashboardHome.retry')}
            </Button>
          }
        />
      )}

      {status === 'success' && stats && (
        <div className="ch-admin-stats-grid">
          <StatTile icon={FiUsers} label={t('admin.dashboard.totalCustomers')} value={stats.totalCustomers} />
          <StatTile icon={FiShoppingBag} label={t('admin.dashboard.totalOrders')} value={stats.totalOrders} />
          <StatTile icon={FiClock} label={t('admin.dashboard.pendingOrders')} value={stats.pendingOrders} />
          <StatTile icon={FiCreditCard} label={t('admin.dashboard.cardsSold')} value={stats.cardsSold} />
          <StatTile
            icon={FiDollarSign}
            label={t('admin.dashboard.revenue')}
            value={stats.revenueTzs === 0 ? t('admin.dashboard.noPaidOrders') : new Intl.NumberFormat('en-TZ').format(stats.revenueTzs)}
          />
          <StatTile icon={FiClock} label={t('admin.dashboard.paymentsPending')} value={stats.payments.pending + stats.payments.processing} />
          <StatTile icon={FiXCircle} label={t('admin.dashboard.paymentsFailed')} value={stats.payments.failed} />
        </div>
      )}
    </div>
  );
}
