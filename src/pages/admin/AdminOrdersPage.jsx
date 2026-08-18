import { useCallback, useEffect, useState } from 'react';
import { FiAlertCircle, FiSearch } from 'react-icons/fi';
import { PageHeader, Seo, Pagination } from '../../components/common';
import { Button, Input, Select, Badge, EmptyState, Skeleton } from '../../components/ui';
import { adminService } from '../../services/adminService';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/mapValidationErrors';
import { ORDER_STATUS_VALUES, PAYMENT_STATUS_VALUES, DELIVERY_STATUS_VALUES } from '../../constants/orderStatus';

const PAGE_SIZE = 20;

function toOptions(values) {
  return values.map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));
}

const STATUS_OPTIONS = toOptions(ORDER_STATUS_VALUES);
const PAYMENT_OPTIONS = toOptions(PAYMENT_STATUS_VALUES);
const DELIVERY_OPTIONS = toOptions(DELIVERY_STATUS_VALUES);

function formatTzs(amount) {
  return new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 }).format(amount);
}

export function AdminOrdersPage() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [status, setStatus] = useState('loading');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(() => {
    adminService
      .listOrders({ page, limit: PAGE_SIZE, search: search || undefined })
      .then((res) => {
        const data = res.data.data;
        setOrders(data.orders);
        setPagination(data.pagination);
        setStatus(data.orders.length === 0 ? 'empty' : 'success');
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

  async function updateField(order, field, value) {
    setUpdatingId(order.id);
    try {
      const res = await adminService.updateOrderStatus(order.id, { [field]: value });
      const updated = res.data.data.order;
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      toast.success('Order updated');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update this order'));
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="ch-admin-page">
      <Seo title="Admin — Orders" />
      <PageHeader
        eyebrow="CardHub Admin"
        title="Orders"
        description="Card orders from the catalogue and the Try Our Service flow. Status changes here are real, manual reconciliation — no payment gateway is connected yet."
      />

      <Input
        icon={<FiSearch aria-hidden="true" />}
        placeholder="Search by customer name or phone..."
        value={search}
        onChange={(e) => {
          setPage(1);
          setSearch(e.target.value);
        }}
        className="ch-admin-page__search"
      />

      {status === 'loading' && <Skeleton height="320px" radius="var(--radius-lg)" />}

      {status === 'error' && (
        <EmptyState icon={<FiAlertCircle />} title="Couldn't load orders" action={<Button variant="primary" onClick={load}>Retry</Button>} />
      )}

      {status === 'empty' && <EmptyState title="No orders yet" description="Orders placed through the catalogue or Try Our Service will appear here." />}

      {status === 'success' && (
        <>
          <div className="ch-table-wrap">
            <table className="ch-table">
              <thead>
                <tr>
                  <th>Customer</th>
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
                {orders.map((order) => {
                  const isUpdating = updatingId === order.id;
                  return (
                    <tr key={order.id}>
                      <td className="ch-table__name">
                        {order.customer ? order.customer.name : order.guestName}
                        <span className="ch-admin-orders__phone">{order.customer?.email || order.guestPhone}</span>
                      </td>
                      <td>{order.template?.name || '—'}</td>
                      <td>
                        <Badge variant="default">{order.pricingTier}</Badge>
                      </td>
                      <td>{order.quantity}</td>
                      <td>TSh {formatTzs(order.subtotalTzs)}</td>
                      <td>
                        <Select
                          value={order.status}
                          disabled={isUpdating}
                          options={STATUS_OPTIONS}
                          onChange={(e) => updateField(order, 'status', e.target.value)}
                          className="ch-admin-orders__select"
                        />
                      </td>
                      <td>
                        <Select
                          value={order.paymentStatus}
                          disabled={isUpdating}
                          options={PAYMENT_OPTIONS}
                          onChange={(e) => updateField(order, 'paymentStatus', e.target.value)}
                          className="ch-admin-orders__select"
                        />
                      </td>
                      <td>
                        <Select
                          value={order.deliveryStatus}
                          disabled={isUpdating}
                          options={DELIVERY_OPTIONS}
                          onChange={(e) => updateField(order, 'deliveryStatus', e.target.value)}
                          className="ch-admin-orders__select"
                        />
                      </td>
                      <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={pagination?.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
