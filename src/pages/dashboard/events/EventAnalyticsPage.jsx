import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FiAlertCircle, FiEye, FiUsers } from 'react-icons/fi';
import { EmptyState, Skeleton, Button } from '../../../components/ui';
import { eventsService } from '../../../services/eventsService';

function RsvpBar({ label, value, total, tone }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="ch-analytics-bar">
      <div className="ch-analytics-bar__labels">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="ch-analytics-bar__track">
        <div className={`ch-analytics-bar__fill ch-analytics-bar__fill--${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function EventAnalyticsPage() {
  const { event } = useOutletContext();
  const [analytics, setAnalytics] = useState(null);
  const [status, setStatus] = useState('loading');

  const [lastEventId, setLastEventId] = useState(event.id);
  if (lastEventId !== event.id) {
    setLastEventId(event.id);
    if (status !== 'loading') setStatus('loading');
  }

  function fetchAnalytics() {
    eventsService
      .analytics(event.id)
      .then((res) => {
        setAnalytics(res.data.data.analytics);
        setStatus('success');
      })
      .catch(() => setStatus('error'));
  }

  function load() {
    setStatus('loading');
    fetchAnalytics();
  }

  useEffect(fetchAnalytics, [event.id]);

  if (status === 'loading') {
    return (
      <div className="ch-analytics-page">
        <Skeleton height="100px" radius="var(--radius-lg)" />
        <Skeleton height="200px" radius="var(--radius-lg)" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <EmptyState
        icon={<FiAlertCircle />}
        title="Couldn't load analytics"
        action={
          <Button variant="primary" onClick={load}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <div className="ch-analytics-page">
      <div className="ch-analytics-tiles">
        <div className="ch-analytics-tile">
          <FiEye aria-hidden="true" />
          <span className="ch-analytics-tile__value">{analytics.views}</span>
          <span className="ch-analytics-tile__label">Invitation views</span>
        </div>
        <div className="ch-analytics-tile">
          <FiUsers aria-hidden="true" />
          <span className="ch-analytics-tile__value">{analytics.rsvp.total}</span>
          <span className="ch-analytics-tile__label">Guests</span>
        </div>
        <div className="ch-analytics-tile">
          <span className="ch-analytics-tile__value">{analytics.responseRate}%</span>
          <span className="ch-analytics-tile__label">Response rate</span>
        </div>
      </div>

      {analytics.rsvp.total === 0 ? (
        <EmptyState title="No RSVP responses yet" description="Once guests respond, their answers will show up here." />
      ) : (
        <div className="ch-analytics-breakdown">
          <h3 className="ch-h4">RSVP breakdown</h3>
          <RsvpBar label="Attending" value={analytics.rsvp.attending} total={analytics.rsvp.total} tone="success" />
          <RsvpBar label="Declined" value={analytics.rsvp.declined} total={analytics.rsvp.total} tone="danger" />
          <RsvpBar label="Pending" value={analytics.rsvp.pending} total={analytics.rsvp.total} tone="default" />
        </div>
      )}
    </div>
  );
}
