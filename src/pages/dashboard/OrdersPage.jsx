import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertCircle, FiShoppingBag } from 'react-icons/fi';
import { PageHeader, Seo, Pagination } from '../../components/common';
import { Button, Badge, EmptyState, Skeleton } from '../../components/ui';
import { ordersService } from '../../services/ordersService';
import { ORDER_STATUS_BADGE, PAYMENT_STATUS_BADGE, DELIVERY_STATUS_BADGE } from '../../constants/orderStatus';
import { ROUTES } from '../../constants/routes';
import { useLanguage } from '../../hooks/useLanguage';

const PAGE_SIZE = 12;

function formatTzs(amount) {
  return new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 }).format(amount);
}

export function OrdersPage() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [status, setStatus] = useState('loading');
  const [page, setPage] = useState(1);

  function fetchOrders() {
    ordersService
      .list({ page, limit: PAGE_SIZE })
      .then((res) => {
        const data = res.data.data;
        setOrders(data.orders);
        setPagination(data.pagination);
        setStatus(data.orders.length === 0 ? 'empty' : 'success');
      })
      .catch(() => setStatus('error'));
  }

  function load() {
    setStatus('loading');
    fetchOrders();
  }

  const [lastPage, setLastPage] = useState(page);
  if (lastPage !== page) {
    setLastPage(page);
    if (status !== 'loading') setStatus('loading');
  }

  useEffect(fetchOrders, [page]);

  return (
    <div className="ch-orders-page">
      <Seo title="My Orders" />
      <PageHeader eyebrow={t('sidebar.dashboard')} title={t('dashOrders.title')} description={t('dashOrders.description')} />

      {status === 'loading' && <Skeleton height="280px" radius="var(--radius-lg)" />}

      {status === 'error' && (
        <EmptyState icon={<FiAlertCircle />} title={t('dashOrders.loadFailed')} action={<Button variant="primary" onClick={load}>{t('dashboardHome.retry')}</Button>} />
      )}

      {status === 'empty' && (
        <EmptyState
          icon={<FiShoppingBag />}
          title={t('dashOrders.emptyTitle')}
          description={t('dashOrders.emptyDescription')}
          action={
            <Link to={ROUTES.TEMPLATES} className="ch-btn ch-btn--primary">
              {t('dashOrders.browseCards')}
            </Link>
          }
        />
      )}

      {status === 'success' && (
        <>
          <div className="ch-table-wrap">
            <table className="ch-table">
              <thead>
                <tr>
                  <th>{t('admin.orders.card')}</th>
                  <th>{t('admin.orders.tier')}</th>
                  <th>{t('admin.orders.qty')}</th>
                  <th>{t('admin.orders.subtotal')}</th>
                  <th>{t('admin.orders.status')}</th>
                  <th>{t('admin.orders.payment')}</th>
                  <th>{t('admin.orders.delivery')}</th>
                  <th>{t('admin.orders.placed')}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="ch-table__name">{order.template?.name || '—'}</td>
                    <td>{order.pricingTier}</td>
                    <td>{order.quantity}</td>
                    <td>TSh {formatTzs(order.subtotalTzs)}</td>
                    <td>
                      <Badge variant={ORDER_STATUS_BADGE[order.status] || 'default'}>{t(`status.${order.status}`)}</Badge>
                    </td>
                    <td>
                      <Badge variant={PAYMENT_STATUS_BADGE[order.paymentStatus] || 'default'}>{t(`status.${order.paymentStatus}`)}</Badge>
                    </td>
                    <td>
                      <Badge variant={DELIVERY_STATUS_BADGE[order.deliveryStatus] || 'default'}>{t(`status.${order.deliveryStatus}`)}</Badge>
                    </td>
                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
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
