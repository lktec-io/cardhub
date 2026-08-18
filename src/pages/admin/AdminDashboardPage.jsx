import { useEffect, useState } from 'react';
import { FiAlertCircle, FiClock, FiCreditCard, FiDollarSign, FiShoppingBag, FiUsers } from 'react-icons/fi';
import { PageHeader, Seo } from '../../components/common';
import { Button, EmptyState, Skeleton } from '../../components/ui';
import { adminService } from '../../services/adminService';

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
      <PageHeader eyebrow="CardHub Admin" title="Platform overview" description="Real, live figures from the database — never estimated." />

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
          title="Couldn't load platform statistics"
          action={
            <Button variant="primary" onClick={load}>
              Retry
            </Button>
          }
        />
      )}

      {status === 'success' && stats && (
        <div className="ch-admin-stats-grid">
          <StatTile icon={FiUsers} label="Total Customers" value={stats.totalCustomers} />
          <StatTile icon={FiShoppingBag} label="Total Orders" value={stats.totalOrders} />
          <StatTile icon={FiClock} label="Pending Orders" value={stats.pendingOrders} />
          <StatTile icon={FiCreditCard} label="Cards Sold" value={stats.cardsSold} />
          <StatTile
            icon={FiDollarSign}
            label="Revenue (TZS)"
            value={stats.revenueTzs === 0 ? '0 (no paid orders yet)' : new Intl.NumberFormat('en-TZ').format(stats.revenueTzs)}
          />
        </div>
      )}
    </div>
  );
}
