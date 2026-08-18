import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertCircle, FiShoppingBag } from 'react-icons/fi';
import { PageHeader, Seo, Pagination } from '../../components/common';
import { Button, Badge, EmptyState, Skeleton } from '../../components/ui';
import { ordersService } from '../../services/ordersService';
import { ORDER_STATUS_BADGE, PAYMENT_STATUS_BADGE, DELIVERY_STATUS_BADGE } from '../../constants/orderStatus';
import { ROUTES } from '../../constants/routes';

const PAGE_SIZE = 12;

function formatTzs(amount) {
  return new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 }).format(amount);
}

export function OrdersPage() {
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
      <PageHeader eyebrow="Dashboard" title="Orders" description="Card orders you've placed through CardHub." />

      {status === 'loading' && <Skeleton height="280px" radius="var(--radius-lg)" />}

      {status === 'error' && (
        <EmptyState icon={<FiAlertCircle />} title="Couldn't load your orders" action={<Button variant="primary" onClick={load}>Retry</Button>} />
      )}

      {status === 'empty' && (
        <EmptyState
          icon={<FiShoppingBag />}
          title="No orders yet"
          description="Browse the card catalogue to place your first order."
          action={
            <Link to={ROUTES.TEMPLATES} className="ch-btn ch-btn--primary">
              Browse cards
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
                  <th>Card</th>
                  <th>Tier</th>
                  <th>Qty</th>
                  <th>Subtotal</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Delivery</th>
                  <th>Placed</th>
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
                      <Badge variant={ORDER_STATUS_BADGE[order.status] || 'default'}>{order.status}</Badge>
                    </td>
                    <td>
                      <Badge variant={PAYMENT_STATUS_BADGE[order.paymentStatus] || 'default'}>{order.paymentStatus}</Badge>
                    </td>
                    <td>
                      <Badge variant={DELIVERY_STATUS_BADGE[order.deliveryStatus] || 'default'}>{order.deliveryStatus}</Badge>
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
