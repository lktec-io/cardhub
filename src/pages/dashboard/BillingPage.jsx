import { useEffect, useState } from 'react';
import { FiAlertCircle, FiCheck } from 'react-icons/fi';
import { PageHeader, Seo } from '../../components/common';
import { Button, Badge, EmptyState, Skeleton, Alert } from '../../components/ui';
import { billingService } from '../../services/billingService';
import { useToast } from '../../hooks/useToast';
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
      toast.success('Upgrade started');
    } catch (error) {
      toast.error(getErrorMessage(error, "Payment processing isn't connected yet. Please check back soon."));
    } finally {
      setUpgradingPlan(null);
    }
  }

  return (
    <div className="ch-billing-page">
      <Seo title="Billing" />
      <PageHeader eyebrow="Dashboard" title="Billing" description="Your plan, usage, and payment history." />

      {status === 'loading' && (
        <div className="ch-billing-page__loading">
          <Skeleton height="120px" radius="var(--radius-lg)" />
          <Skeleton height="280px" radius="var(--radius-lg)" />
        </div>
      )}

      {status === 'error' && (
        <EmptyState
          icon={<FiAlertCircle />}
          title="Couldn't load billing information"
          action={
            <Button variant="primary" onClick={load}>
              Retry
            </Button>
          }
        />
      )}

      {status === 'success' && summary && (
        <>
          <div className="ch-billing-current">
            <div>
              <p className="ch-label">Current plan</p>
              <h2 className="ch-h3">{summary.plan.name}</h2>
              <p className="ch-body-sm">
                {summary.plan.priceTzs === 0 ? 'Free' : `TZS ${formatTzs(summary.plan.priceTzs)} / event`}
              </p>
            </div>
            <div className="ch-billing-current__usage">
              <UsageBar label="Events" used={summary.usage.events} limit={summary.plan.limits.maxEvents} />
              <UsageBar label="Published invitations" used={summary.usage.publishedInvitations} limit={summary.plan.limits.maxPublishedInvitations} />
            </div>
          </div>

          <h3 className="ch-h4 ch-billing-page__section-title">Available plans</h3>
          <div className="ch-billing-plans">
            {summary.availablePlans.map((plan) => {
              const isCurrent = plan.id === summary.plan.id;
              return (
                <div key={plan.id} className={`ch-card ch-billing-plan ${isCurrent ? 'ch-billing-plan--current' : ''}`}>
                  {isCurrent && <Badge variant="accent">Current plan</Badge>}
                  <h4 className="ch-h4">{plan.name}</h4>
                  <p className="ch-billing-plan__price">
                    {plan.priceTzs === 0 ? 'Free' : `TZS ${formatTzs(plan.priceTzs)}`}
                    {plan.priceTzs > 0 && <span>/event</span>}
                  </p>
                  <ul className="ch-billing-plan__limits">
                    <li>
                      <FiCheck aria-hidden="true" /> {formatLimit(plan.limits.maxEvents)} events
                    </li>
                    <li>
                      <FiCheck aria-hidden="true" /> {formatLimit(plan.limits.maxPublishedInvitations)} published invitations
                    </li>
                    <li>
                      <FiCheck aria-hidden="true" /> {formatLimit(plan.limits.maxGuestsPerEvent)} guests per event
                    </li>
                  </ul>
                  {!isCurrent && (
                    <Button variant="secondary" fullWidth isLoading={upgradingPlan === plan.id} onClick={() => handleUpgrade(plan.id)}>
                      Upgrade to {plan.name}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          <Alert variant="info" className="ch-billing-page__note">
            Payment processing isn&rsquo;t connected yet — upgrades aren&rsquo;t available for purchase in this
            environment. Pricing and limits shown here are configurable, not final.
          </Alert>

          <h3 className="ch-h4 ch-billing-page__section-title">Payment history</h3>
          {summary.paymentHistory.length === 0 ? (
            <EmptyState title="No payments yet" description="Your payment history will appear here once billing is connected." />
          ) : (
            <div className="ch-table-wrap">
              <table className="ch-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.paymentHistory.map((payment) => (
                    <tr key={payment.id}>
                      <td>{new Date(payment.createdAt).toLocaleDateString()}</td>
                      <td>
                        {payment.currency} {formatTzs(payment.amount)}
                      </td>
                      <td>{payment.status}</td>
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
