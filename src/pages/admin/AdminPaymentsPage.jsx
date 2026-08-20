import { useCallback, useEffect, useState } from 'react';
import { FiAlertCircle, FiEye } from 'react-icons/fi';
import { PageHeader, Seo, Pagination } from '../../components/common';
import { Button, Input, Select, Badge, EmptyState, Skeleton, Modal } from '../../components/ui';
import { adminService } from '../../services/adminService';
import { useLanguage } from '../../hooks/useLanguage';
import { PAYMENT_ATTEMPT_STATUS_VALUES, PAYMENT_ATTEMPT_STATUS_BADGE, PAYMENT_METHOD_VALUES } from '../../constants/paymentStatus';

const PAGE_SIZE = 20;

function formatTzs(amount) {
  return new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 }).format(amount);
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

export function AdminPaymentsPage() {
  const { t } = useLanguage();

  const STATUS_OPTIONS = PAYMENT_ATTEMPT_STATUS_VALUES.map((v) => ({ value: v, label: t(`status.${v}`) }));
  const METHOD_OPTIONS = PAYMENT_METHOD_VALUES.map((v) => ({ value: v, label: t('checkout.mobileMoney') }));

  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [status, setStatus] = useState('loading');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [selectedPayment, setSelectedPayment] = useState(null);
  const [detailStatus, setDetailStatus] = useState('idle');

  const load = useCallback(() => {
    adminService
      .listPayments({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        status: statusFilter || undefined,
        method: methodFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })
      .then((res) => {
        const data = res.data.data;
        setPayments(data.payments);
        setPagination(data.pagination);
        setStatus(data.payments.length === 0 ? 'empty' : 'success');
      })
      .catch(() => setStatus('error'));
  }, [page, search, statusFilter, methodFilter, dateFrom, dateTo]);

  const filterKey = `${page}|${search}|${statusFilter}|${methodFilter}|${dateFrom}|${dateTo}`;
  const [lastKey, setLastKey] = useState(filterKey);
  if (filterKey !== lastKey) {
    setLastKey(filterKey);
    setStatus('loading');
  }

  useEffect(() => {
    const timer = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  function openDetails(payment) {
    setSelectedPayment(payment);
    setDetailStatus('loading');
    adminService
      .getPayment(payment.id)
      .then((res) => {
        setSelectedPayment(res.data.data.payment);
        setDetailStatus('success');
      })
      .catch(() => setDetailStatus('error'));
  }

  function closeDetails() {
    setSelectedPayment(null);
    setDetailStatus('idle');
  }

  return (
    <div className="ch-admin-page">
      <Seo title="Admin — Payments" />
      <PageHeader eyebrow={t('admin.eyebrow')} title={t('admin.payments.title')} description={t('admin.payments.description')} />

      <div className="ch-admin-payments__filters">
        <Input
          placeholder={t('admin.payments.searchPlaceholder')}
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="ch-admin-payments__search"
        />
        <Select
          placeholder={t('admin.payments.filterStatus')}
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
        />
        <Select
          placeholder={t('admin.payments.filterMethod')}
          value={methodFilter}
          options={METHOD_OPTIONS}
          onChange={(e) => {
            setPage(1);
            setMethodFilter(e.target.value);
          }}
        />
        <Input
          type="date"
          label={t('admin.payments.dateFrom')}
          value={dateFrom}
          onChange={(e) => {
            setPage(1);
            setDateFrom(e.target.value);
          }}
        />
        <Input
          type="date"
          label={t('admin.payments.dateTo')}
          value={dateTo}
          onChange={(e) => {
            setPage(1);
            setDateTo(e.target.value);
          }}
        />
      </div>

      {status === 'loading' && <Skeleton height="320px" radius="var(--radius-lg)" />}

      {status === 'error' && (
        <EmptyState
          icon={<FiAlertCircle />}
          title={t('admin.payments.loadFailed')}
          action={<Button variant="primary" onClick={load}>{t('catalogue.retry')}</Button>}
        />
      )}

      {status === 'empty' && <EmptyState title={t('admin.payments.empty')} description={t('admin.payments.emptyDescription')} />}

      {status === 'success' && (
        <>
          <div className="ch-table-wrap">
            <table className="ch-table">
              <thead>
                <tr>
                  <th>{t('admin.payments.orderNumber')}</th>
                  <th>{t('admin.payments.customer')}</th>
                  <th>{t('admin.payments.amount')}</th>
                  <th>{t('admin.payments.method')}</th>
                  <th>{t('admin.payments.status')}</th>
                  <th>{t('admin.payments.providerReference')}</th>
                  <th>{t('admin.payments.created')}</th>
                  <th aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="ch-table__name">
                      {payment.orderNumber ? `#${payment.orderNumber}` : '—'}
                      {payment.template?.name && <span className="ch-admin-orders__phone">{payment.template.name}</span>}
                    </td>
                    <td>
                      {payment.customer?.name || '—'}
                      <span className="ch-admin-orders__phone">{payment.customer?.phone || payment.customer?.email || ''}</span>
                    </td>
                    <td>
                      TSh {formatTzs(payment.amount)}
                      <span className="ch-admin-orders__phone">{payment.currency}</span>
                    </td>
                    <td>{payment.method ? t('checkout.mobileMoney') : '—'}</td>
                    <td>
                      <Badge variant={PAYMENT_ATTEMPT_STATUS_BADGE[payment.status] || 'default'}>{t(`status.${payment.status}`)}</Badge>
                    </td>
                    <td>
                      {payment.providerReference || '—'}
                      {payment.provider && <span className="ch-admin-orders__phone">{payment.provider}</span>}
                    </td>
                    <td>{formatDateTime(payment.createdAt)}</td>
                    <td>
                      <button type="button" className="ch-table__icon-btn" onClick={() => openDetails(payment)} aria-label={t('admin.payments.viewDetails')}>
                        <FiEye aria-hidden="true" />
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

      <Modal isOpen={Boolean(selectedPayment)} onClose={closeDetails} title={t('admin.payments.detailsTitle')}>
        {detailStatus === 'loading' && <Skeleton height="200px" radius="var(--radius-md)" />}
        {detailStatus === 'error' && <EmptyState icon={<FiAlertCircle />} title={t('admin.payments.loadFailed')} />}
        {detailStatus === 'success' && selectedPayment && (
          <dl className="ch-admin-payments__detail">
            <div>
              <dt>{t('admin.payments.orderNumber')}</dt>
              <dd>{selectedPayment.orderNumber ? `#${selectedPayment.orderNumber}` : '—'}</dd>
            </div>
            <div>
              <dt>{t('admin.payments.customer')}</dt>
              <dd>{selectedPayment.customer?.name || '—'}</dd>
            </div>
            <div>
              <dt>{t('admin.phone')}</dt>
              <dd>{selectedPayment.customer?.phone || '—'}</dd>
            </div>
            {selectedPayment.customer?.email && (
              <div>
                <dt>{t('admin.email')}</dt>
                <dd>{selectedPayment.customer.email}</dd>
              </div>
            )}
            <div>
              <dt>{t('admin.payments.card')}</dt>
              <dd>{selectedPayment.template?.name || '—'}</dd>
            </div>
            <div>
              <dt>{t('admin.payments.amount')}</dt>
              <dd>TSh {formatTzs(selectedPayment.amount)} {selectedPayment.currency}</dd>
            </div>
            <div>
              <dt>{t('admin.payments.method')}</dt>
              <dd>{selectedPayment.method ? t('checkout.mobileMoney') : '—'}</dd>
            </div>
            <div>
              <dt>{t('admin.payments.provider')}</dt>
              <dd>{selectedPayment.provider || t('admin.payments.notAvailable')}</dd>
            </div>
            <div>
              <dt>{t('admin.payments.providerReference')}</dt>
              <dd>{selectedPayment.providerReference || t('admin.payments.notAvailable')}</dd>
            </div>
            <div>
              <dt>{t('admin.payments.status')}</dt>
              <dd>
                <Badge variant={PAYMENT_ATTEMPT_STATUS_BADGE[selectedPayment.status] || 'default'}>
                  {t(`status.${selectedPayment.status}`)}
                </Badge>
              </dd>
            </div>
            <div>
              <dt>{t('admin.payments.created')}</dt>
              <dd>{formatDateTime(selectedPayment.createdAt)}</dd>
            </div>
            <div>
              <dt>{t('admin.payments.paidAt')}</dt>
              <dd>{selectedPayment.paidAt ? formatDateTime(selectedPayment.paidAt) : '—'}</dd>
            </div>
            {selectedPayment.failureReason && (
              <div>
                <dt>{t('admin.payments.failureReason')}</dt>
                <dd>{selectedPayment.failureReason}</dd>
              </div>
            )}
          </dl>
        )}
      </Modal>
    </div>
  );
}
