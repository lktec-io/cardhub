import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiAlertCircle, FiArrowLeft } from 'react-icons/fi';
import { PageHeader, Seo } from '../../components/common';
import { Button, Badge, EmptyState, Skeleton } from '../../components/ui';
import { adminService } from '../../services/adminService';
import { ORDER_STATUS_BADGE, PAYMENT_STATUS_BADGE } from '../../constants/orderStatus';
import { ROUTES } from '../../constants/routes';
import { useLanguage } from '../../hooks/useLanguage';

const STATUS_BADGE = { active: 'success', inactive: 'default', suspended: 'danger' };

function formatTzs(amount) {
  return new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 }).format(amount);
}

export function AdminCustomerDetailPage() {
  const { t } = useLanguage();
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [status, setStatus] = useState('loading');

  function fetchCustomer() {
    adminService
      .getUser(id)
      .then((res) => {
        setCustomer(res.data.data.user);
        setStatus('success');
      })
      .catch(() => setStatus('error'));
  }

  function load() {
    setStatus('loading');
    fetchCustomer();
  }

  const [lastId, setLastId] = useState(id);
  if (lastId !== id) {
    setLastId(id);
    if (status !== 'loading') setStatus('loading');
  }

  useEffect(fetchCustomer, [id]);

  return (
    <div className="ch-admin-page">
      <Seo title="Admin — Customer" />
      <Link to={ROUTES.ADMIN_CUSTOMERS} className="ch-admin-page__back-link">
        <FiArrowLeft aria-hidden="true" /> {t('admin.customerDetail.back')}
      </Link>

      {status === 'loading' && <Skeleton height="320px" radius="var(--radius-lg)" />}

      {status === 'error' && (
        <EmptyState icon={<FiAlertCircle />} title={t('admin.customerDetail.loadFailed')} action={<Button variant="primary" onClick={load}>{t('dashboardHome.retry')}</Button>} />
      )}

      {status === 'success' && customer && (
        <>
          <PageHeader
            eyebrow={t('admin.eyebrow')}
            title={customer.name}
            description={customer.email}
          />

          <div className="ch-admin-customer__summary">
            <div>
              <p className="ch-label">{t('admin.phone')}</p>
              <p className="ch-body">{customer.phone || '—'}</p>
            </div>
            <div>
              <p className="ch-label">{t('admin.customers.status')}</p>
              <Badge variant={STATUS_BADGE[customer.status] || 'default'}>{t(`status.${customer.status}`)}</Badge>
            </div>
            <div>
              <p className="ch-label">{t('admin.joined')}</p>
              <p className="ch-body">{new Date(customer.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="ch-label">{t('admin.customers.orders')}</p>
              <p className="ch-body">{customer.orders?.length ?? 0}</p>
            </div>
          </div>

          <h3 className="ch-h4 ch-admin-page__section-title">{t('admin.customerDetail.ordersTitle')}</h3>
          {!customer.orders?.length ? (
            <EmptyState title={t('admin.customerDetail.noOrders')} description={t('admin.customerDetail.noOrdersDescription')} />
          ) : (
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
                    <th>{t('admin.orders.placed')}</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.map((order) => (
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
                      <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
