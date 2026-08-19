import { useCallback, useEffect, useState } from 'react';
import { FiAlertCircle, FiSearch } from 'react-icons/fi';
import { PageHeader, Seo, Pagination } from '../../components/common';
import { Button, Input, Select, Badge, EmptyState, Skeleton } from '../../components/ui';
import { adminService } from '../../services/adminService';
import { useToast } from '../../hooks/useToast';
import { useLanguage } from '../../hooks/useLanguage';
import { getErrorMessage } from '../../utils/mapValidationErrors';
import {
  ORDER_STATUS_VALUES,
  PAYMENT_STATUS_VALUES,
  DELIVERY_STATUS_VALUES,
  CHANNEL_STATUS_BADGE,
} from '../../constants/orderStatus';

const PAGE_SIZE = 20;

function formatTzs(amount) {
  return new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 }).format(amount);
}

export function AdminOrdersPage() {
  const toast = useToast();
  const { t } = useLanguage();

  function toOptions(values) {
    return values.map((v) => ({ value: v, label: t(`status.${v}`) }));
  }
  const STATUS_OPTIONS = toOptions(ORDER_STATUS_VALUES);
  const PAYMENT_OPTIONS = toOptions(PAYMENT_STATUS_VALUES);
  const DELIVERY_OPTIONS = toOptions(DELIVERY_STATUS_VALUES);
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
      toast.success(t('admin.orders.updated'));
    } catch (error) {
      toast.error(getErrorMessage(error, t('admin.orders.updateFailed')));
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="ch-admin-page">
      <Seo title="Admin — Orders" />
      <PageHeader eyebrow="CardHub Admin" title={t('admin.orders.title')} description={t('admin.orders.description')} />

      <Input
        icon={<FiSearch aria-hidden="true" />}
        placeholder={t('admin.orders.searchPlaceholder')}
        value={search}
        onChange={(e) => {
          setPage(1);
          setSearch(e.target.value);
        }}
        className="ch-admin-page__search"
      />

      {status === 'loading' && <Skeleton height="320px" radius="var(--radius-lg)" />}

      {status === 'error' && (
        <EmptyState
          icon={<FiAlertCircle />}
          title={t('admin.orders.loadFailed')}
          action={<Button variant="primary" onClick={load}>{t('catalogue.retry')}</Button>}
        />
      )}

      {status === 'empty' && <EmptyState title={t('admin.orders.empty')} description={t('admin.orders.emptyDescription')} />}

      {status === 'success' && (
        <>
          <div className="ch-table-wrap">
            <table className="ch-table">
              <thead>
                <tr>
                  <th>{t('admin.orders.customer')}</th>
                  <th>{t('admin.orders.card')}</th>
                  <th>{t('admin.orders.tier')}</th>
                  <th>{t('admin.orders.qty')}</th>
                  <th>{t('admin.orders.subtotal')}</th>
                  <th>{t('admin.orders.status')}</th>
                  <th>{t('admin.orders.payment')}</th>
                  <th>{t('admin.orders.delivery')}</th>
                  <th>{t('channel.sms')}</th>
                  <th>{t('channel.whatsapp')}</th>
                  <th>{t('admin.orders.placed')}</th>
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
                      <td>
                        <Badge variant={CHANNEL_STATUS_BADGE[order.sms?.status] || 'default'}>
                          {t(`status.${order.sms?.status || 'not_requested'}`)}
                        </Badge>
                        {order.sms?.error && <span className="ch-admin-orders__phone">{order.sms.error}</span>}
                      </td>
                      <td>
                        <Badge variant={CHANNEL_STATUS_BADGE[order.whatsapp?.status] || 'default'}>
                          {t(`status.${order.whatsapp?.status || 'not_requested'}`)}
                        </Badge>
                        {order.whatsapp?.error && <span className="ch-admin-orders__phone">{order.whatsapp.error}</span>}
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
