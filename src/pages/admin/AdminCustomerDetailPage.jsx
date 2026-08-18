import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiAlertCircle, FiArrowLeft } from 'react-icons/fi';
import { PageHeader, Seo } from '../../components/common';
import { Button, Badge, EmptyState, Skeleton } from '../../components/ui';
import { adminService } from '../../services/adminService';
import { ORDER_STATUS_BADGE, PAYMENT_STATUS_BADGE } from '../../constants/orderStatus';
import { ROUTES } from '../../constants/routes';

const STATUS_BADGE = { active: 'success', inactive: 'default', suspended: 'danger' };

function formatTzs(amount) {
  return new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 }).format(amount);
}

export function AdminCustomerDetailPage() {
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
        <FiArrowLeft aria-hidden="true" /> Back to Customers
      </Link>

      {status === 'loading' && <Skeleton height="320px" radius="var(--radius-lg)" />}

      {status === 'error' && (
        <EmptyState icon={<FiAlertCircle />} title="Couldn't load this customer" action={<Button variant="primary" onClick={load}>Retry</Button>} />
      )}

      {status === 'success' && customer && (
        <>
          <PageHeader
            eyebrow="CardHub Admin"
            title={customer.name}
            description={customer.email}
          />

          <div className="ch-admin-customer__summary">
            <div>
              <p className="ch-label">Phone</p>
              <p className="ch-body">{customer.phone || '—'}</p>
            </div>
            <div>
              <p className="ch-label">Status</p>
              <Badge variant={STATUS_BADGE[customer.status] || 'default'}>{customer.status}</Badge>
            </div>
            <div>
              <p className="ch-label">Joined</p>
              <p className="ch-body">{new Date(customer.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="ch-label">Orders</p>
              <p className="ch-body">{customer.orders?.length ?? 0}</p>
            </div>
          </div>

          <h3 className="ch-h4 ch-admin-page__section-title">Orders</h3>
          {!customer.orders?.length ? (
            <EmptyState title="No orders yet" description="Orders this customer places will appear here." />
          ) : (
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
                    <th>Placed</th>
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
                        <Badge variant={ORDER_STATUS_BADGE[order.status] || 'default'}>{order.status}</Badge>
                      </td>
                      <td>
                        <Badge variant={PAYMENT_STATUS_BADGE[order.paymentStatus] || 'default'}>{order.paymentStatus}</Badge>
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
