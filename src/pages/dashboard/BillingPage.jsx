import { useEffect, useState } from 'react';
import { FiAlertCircle, FiCheck } from 'react-icons/fi';
import { PageHeader, Seo } from '../../components/common';
import { Button, Badge, EmptyState, Skeleton, Alert } from '../../components/ui';
import { billingService } from '../../services/billingService';
import { useToast } from '../../hooks/useToast';
import { useLanguage } from '../../hooks/useLanguage';
import { formatLimit } from '../../constants/plans';
import { getErrorMessage } from '../../utils/mapValidationErrors';

function formatTzs(amount) {
  return new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 }).format(amount);
}

function UsageBar({ label, used, limit }) {
  const isUnlimited = limit === -1;
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));

  return (
    <div className="ch-usage-bar">
      <div className="ch-usage-bar__labels">
        <span>{label}</span>
        <span>
          {used} / {formatLimit(limit)}
        </span>
      </div>
      {!isUnlimited && (
        <div className="ch-usage-bar__track">
          <div className="ch-usage-bar__fill" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

export function BillingPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState('loading');
  const [upgradingPlan, setUpgradingPlan] = useState(null);

  function fetchSummary() {
    billingService
      .getSummary()
      .then((res) => {
        setSummary(res.data.data);
        setStatus('success');
      })
      .catch(() => setStatus('error'));
  }

  function load() {
    setStatus('loading');
    fetchSummary();
  }

  useEffect(fetchSummary, []);

  async function handleUpgrade(planId) {
    setUpgradingPlan(planId);
    try {
      await billingService.startUpgrade(planId);
      toast.success(t('billing.upgradeStarted'));
    } catch (error) {
      toast.error(getErrorMessage(error, t('billing.upgradeUnavailable')));
    } finally {
      setUpgradingPlan(null);
    }
  }

  return (
    <div className="ch-billing-page">
      <Seo title="Billing" />
      <PageHeader eyebrow={t('sidebar.dashboard')} title={t('billing.title')} description={t('billing.description')} />

      {status === 'loading' && (
        <div className="ch-billing-page__loading">
          <Skeleton height="120px" radius="var(--radius-lg)" />
          <Skeleton height="280px" radius="var(--radius-lg)" />
        </div>
      )}

      {status === 'error' && (
        <EmptyState
          icon={<FiAlertCircle />}
          title={t('billing.loadFailed')}
          action={
            <Button variant="primary" onClick={load}>
              {t('dashboardHome.retry')}
            </Button>
          }
        />
      )}

      {status === 'success' && summary && (
        <>
          <div className="ch-billing-current">
            <div>
              <p className="ch-label">{t('billing.currentPlan')}</p>
              <h2 className="ch-h3">{summary.plan.name}</h2>
              <p className="ch-body-sm">
                {summary.plan.priceTzs === 0 ? t('billing.free') : `TZS ${formatTzs(summary.plan.priceTzs)} ${t('billing.perEvent')}`}
              </p>
            </div>
            <div className="ch-billing-current__usage">
              <UsageBar label={t('billing.events')} used={summary.usage.events} limit={summary.plan.limits.maxEvents} />
              <UsageBar label={t('billing.publishedInvitations')} used={summary.usage.publishedInvitations} limit={summary.plan.limits.maxPublishedInvitations} />
            </div>
          </div>

          <h3 className="ch-h4 ch-billing-page__section-title">{t('billing.availablePlans')}</h3>
          <div className="ch-billing-plans">
            {summary.availablePlans.map((plan) => {
              const isCurrent = plan.id === summary.plan.id;
              return (
                <div key={plan.id} className={`ch-card ch-billing-plan ${isCurrent ? 'ch-billing-plan--current' : ''}`}>
                  {isCurrent && <Badge variant="accent">{t('billing.currentPlan')}</Badge>}
                  <h4 className="ch-h4">{plan.name}</h4>
                  <p className="ch-billing-plan__price">
                    {plan.priceTzs === 0 ? t('billing.free') : `TZS ${formatTzs(plan.priceTzs)}`}
                    {plan.priceTzs > 0 && <span>{t('billing.perEvent')}</span>}
                  </p>
                  <ul className="ch-billing-plan__limits">
                    <li>
                      <FiCheck aria-hidden="true" /> {formatLimit(plan.limits.maxEvents)} {t('billing.maxEventsSuffix')}
                    </li>
                    <li>
                      <FiCheck aria-hidden="true" /> {formatLimit(plan.limits.maxPublishedInvitations)} {t('billing.maxPublishedSuffix')}
                    </li>
                    <li>
                      <FiCheck aria-hidden="true" /> {formatLimit(plan.limits.maxGuestsPerEvent)} {t('billing.maxGuestsSuffix')}
                    </li>
                  </ul>
                  {!isCurrent && (
                    <Button variant="secondary" fullWidth isLoading={upgradingPlan === plan.id} onClick={() => handleUpgrade(plan.id)}>
                      {t('billing.upgradeTo', { plan: plan.name })}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          <Alert variant="info" className="ch-billing-page__note">
            {t('billing.notConnectedNote')}
          </Alert>

          <h3 className="ch-h4 ch-billing-page__section-title">{t('billing.paymentHistory')}</h3>
          {summary.paymentHistory.length === 0 ? (
            <EmptyState title={t('billing.noPayments')} description={t('billing.noPaymentsDescription')} />
          ) : (
            <div className="ch-table-wrap">
              <table className="ch-table">
                <thead>
                  <tr>
                    <th>{t('billing.date')}</th>
                    <th>{t('billing.amount')}</th>
                    <th>{t('admin.orders.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.paymentHistory.map((payment) => (
                    <tr key={payment.id}>
                      <td>{new Date(payment.createdAt).toLocaleDateString()}</td>
                      <td>
                        {payment.currency} {formatTzs(payment.amount)}
                      </td>
                      <td>{t(`status.${payment.status}`)}</td>
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
