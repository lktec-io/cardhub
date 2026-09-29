import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { FiAlertCircle, FiCheckCircle, FiCopy, FiExternalLink, FiPlus, FiTag } from 'react-icons/fi';
import { Alert, Button, EmptyState, Input, Skeleton, Switch } from '../../../../components/ui';
import { eventsService } from '../../../../services/eventsService';
import { ROUTES } from '../../../../constants/routes';
import { useToast } from '../../../../hooks/useToast';
import { getErrorMessage } from '../../../../utils/mapValidationErrors';
import { absoluteUrl, copyText } from '../../../../utils/share';
import { TicketTierCard } from './TicketTierCard';
import { CoverDropzone } from './CoverDropzone';
import { TIER_LIMITS, TIER_PRESETS, blankTier, serverErrors, snapshot, toForm, toPayload, validateForm } from './ticketForm';
import './tickets-manager.css';

const formatTzs = (value) => `TSh ${new Intl.NumberFormat('en-TZ').format(value)}`;
const formatNumber = (value) => new Intl.NumberFormat('en-TZ').format(value);

/**
 * Event Workspace → Tickets. The organizer switches ticket sales on,
 * manages ticket tiers and prices, and sets the event cover. Everything is
 * saved together (PUT /events/:id/tickets) and applied by the server in
 * one transaction; what's already sold is protected server-side.
 */
export function EventTicketsPage() {
  const { event, reload } = useOutletContext();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState('');
  const [loadState, setLoadState] = useState('loading');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const apply = useCallback((next) => {
    const nextForm = toForm(next);
    setData(next);
    setForm(nextForm);
    setBaseline(snapshot(nextForm));
  }, []);

  const fetchTickets = useCallback(() => {
    eventsService
      .getTickets(event.id)
      .then((res) => {
        apply(res.data.data);
        setLoadState('success');
      })
      .catch(() => setLoadState('error'));
  }, [event.id, apply]);

  function load() {
    setLoadState('loading');
    fetchTickets();
  }

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const dirty = form ? snapshot(form) !== baseline : false;

  // Warn before leaving the page with unsaved ticket changes.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const preview = useMemo(() => {
    if (!form) return null;
    const payload = toPayload(form);
    const allocated = payload.tiers.reduce((sum, tier) => sum + (tier.quantityAvailable || 0), 0);
    const onSale = payload.tiers.filter((tier) => tier.status === 'active');
    const prices = onSale.map((tier) => tier.priceTzs).filter(Boolean);
    return { allocated, onSaleCount: onSale.length, fromPrice: prices.length ? Math.min(...prices) : null };
  }, [form]);

  function update(changes) {
    setForm((prev) => ({ ...prev, ...changes }));
    setFormError('');
  }

  function updateTier(index, tier) {
    setForm((prev) => ({ ...prev, tiers: prev.tiers.map((t, i) => (i === index ? tier : t)) }));
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => key.startsWith(`tiers.${index}.`) && delete next[key]);
      return next;
    });
  }

  function addTier(name = '') {
    if (form.tiers.length >= TIER_LIMITS.maxTiers) return;
    setForm((prev) => ({ ...prev, tiers: [...prev.tiers, blankTier(name)] }));
    setErrors((prev) => ({ ...prev, tiers: undefined }));
  }

  function removeTier(index) {
    setForm((prev) => ({ ...prev, tiers: prev.tiers.filter((_, i) => i !== index) }));
    setErrors({});
  }

  function moveTier(index, direction) {
    setForm((prev) => {
      const tiers = [...prev.tiers];
      const target = index + direction;
      if (target < 0 || target >= tiers.length) return prev;
      [tiers[index], tiers[target]] = [tiers[target], tiers[index]];
      return { ...prev, tiers };
    });
    setErrors({});
  }

  async function handleSave() {
    const clientErrors = validateForm(form);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) {
      setFormError('Please fix the highlighted fields.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const res = await eventsService.saveTickets(event.id, toPayload(form));
      apply(res.data.data);
      setErrors({});
      toast.success('Ticket settings saved.');
    } catch (error) {
      const fieldErrors = serverErrors(error);
      setErrors(fieldErrors);
      setFormError(getErrorMessage(error, 'Couldn’t save ticket settings. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      await eventsService.publish(event.id);
      toast.success('Event published.');
      reload();
    } catch (error) {
      toast.error(getErrorMessage(error, 'This event isn’t ready to publish yet. Check the Overview tab.'));
    } finally {
      setPublishing(false);
    }
  }

  async function copyPublicLink() {
    const ok = await copyText(absoluteUrl(ROUTES.ticketEvent(data.event.slug)));
    if (ok) toast.success('Ticket page link copied.');
    else toast.error('Couldn’t copy the link.');
  }

  if (loadState === 'loading') {
    return (
      <div className="ch-tm__layout">
        <div className="ch-tm__main">
          <Skeleton height="140px" radius="var(--radius-surface)" />
          <Skeleton height="360px" radius="var(--radius-surface)" />
        </div>
        <Skeleton height="300px" radius="var(--radius-surface)" />
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <EmptyState
        icon={<FiAlertCircle />}
        title="Couldn’t load ticket settings"
        action={
          <Button variant="primary" onClick={load}>
            Retry
          </Button>
        }
      />
    );
  }

  const isDraft = event.status !== 'published';
  const live = data.event.isLive;
  const { stats } = data;
  const soldPct = stats.allocated ? Math.round((stats.sold / stats.allocated) * 100) : 0;
  const salesTag = live ? { label: 'Active sales', tone: 'live' } : form.ticketSalesEnabled && isDraft ? { label: 'Waiting for publish', tone: 'warn' } : { label: 'Sales off', tone: 'muted' };

  return (
    <div className="ch-tm">
      {isDraft && (
        <div className="ch-tm-banner">
          <div>
            <p className="ch-tm-banner__title">This event is still a draft</p>
            <p className="ch-tm-banner__text">Buyers can only find your ticket page once the event is published.</p>
          </div>
          <Button variant="primary" onClick={handlePublish} isLoading={publishing}>
            Publish Event
          </Button>
        </div>
      )}

      <div className="ch-tm__layout">
        <div className="ch-tm__main">
          {/* ---------- Sales switch ---------- */}
          <section className="ch-tm-panel" aria-labelledby="ch-tm-sales">
            <div className="ch-tm-panel__head">
              <div>
                <h2 className="ch-tm-panel__title" id="ch-tm-sales">
                  Ticket sales
                </h2>
                <p className="ch-tm-panel__lead">When sales are on and the event is published, buyers can purchase tickets on your public ticket page.</p>
              </div>
              <span className={`ch-tm-tag ch-tm-tag--${salesTag.tone}`}>{salesTag.label}</span>
            </div>
            <Switch
              className="ch-tm-sales-switch"
              label="Switch on ticket sales"
              description={form.ticketSalesEnabled ? 'Sales are on. Save to apply your changes.' : 'Sales are off. Nobody can buy tickets for this event.'}
              checked={form.ticketSalesEnabled}
              onChange={(checked) => update({ ticketSalesEnabled: checked })}
              disabled={saving}
            />
            {(errors.ticketSalesEnabled || errors.tiers) && <Alert variant="warning">{errors.ticketSalesEnabled || errors.tiers}</Alert>}
            <div className="ch-tm-grid-2">
              <Input
                label="Public contact (optional)"
                placeholder="0712 345 678 or events@example.com"
                value={form.organizerContact}
                onChange={(e) => update({ organizerContact: e.target.value })}
                error={errors.organizerContact}
                hint={!errors.organizerContact ? 'Shown on the ticket page for buyer questions.' : undefined}
                maxLength={190}
                disabled={saving}
              />
              <Input
                label="End time (optional)"
                type="time"
                value={form.endTime}
                onChange={(e) => update({ endTime: e.target.value })}
                error={errors.endTime}
                hint={!errors.endTime ? 'Date and start time come from the event Settings.' : undefined}
                disabled={saving}
              />
            </div>
          </section>

          {/* ---------- Tiers ---------- */}
          <section className="ch-tm-panel" aria-labelledby="ch-tm-tiers">
            <div className="ch-tm-panel__head">
              <div>
                <h2 className="ch-tm-panel__title" id="ch-tm-tiers">
                  Ticket types & prices
                </h2>
                <p className="ch-tm-panel__lead">Add a tier for each kind of ticket. Buyers see them in this order.</p>
              </div>
              <span className="ch-tm-count">
                {form.tiers.length}/{TIER_LIMITS.maxTiers}
              </span>
            </div>

            {form.tiers.length === 0 ? (
              <div className="ch-tm-empty">
                <FiTag aria-hidden="true" />
                <p className="ch-tm-empty__title">No ticket tiers yet</p>
                <p className="ch-tm-empty__text">Start with a preset or add your own tier.</p>
              </div>
            ) : (
              <div className="ch-tm-tiers">
                {form.tiers.map((tier, index) => (
                  <TicketTierCard
                    key={tier.key}
                    tier={tier}
                    index={index}
                    total={form.tiers.length}
                    errors={errors}
                    onChange={(next) => updateTier(index, next)}
                    onRemove={() => removeTier(index)}
                    onMove={(direction) => moveTier(index, direction)}
                    disabled={saving}
                  />
                ))}
              </div>
            )}

            <div className="ch-tm-add">
              <Button variant="primary" leftIcon={<FiPlus aria-hidden="true" />} onClick={() => addTier()} disabled={saving || form.tiers.length >= TIER_LIMITS.maxTiers}>
                Add Ticket Tier
              </Button>
              <div className="ch-tm-presets" role="group" aria-label="Quick add a tier">
                <span className="ch-tm-presets__label">Quick add</span>
                {TIER_PRESETS.filter((name) => !form.tiers.some((t) => t.name.trim().toLowerCase() === name.toLowerCase())).map((name) => (
                  <button key={name} type="button" className="ch-chip" onClick={() => addTier(name)} disabled={saving || form.tiers.length >= TIER_LIMITS.maxTiers}>
                    + {name}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ---------- Cover ---------- */}
          <section className="ch-tm-panel" aria-labelledby="ch-tm-cover">
            <div className="ch-tm-panel__head">
              <div>
                <h2 className="ch-tm-panel__title" id="ch-tm-cover">
                  Event cover image
                </h2>
                <p className="ch-tm-panel__lead">Shown on the marketplace card, the event page and the checkout summary.</p>
              </div>
            </div>
            <CoverDropzone
              value={form.coverImage}
              onChange={(url) => {
                update({ coverImage: url });
                setErrors((prev) => ({ ...prev, coverImage: undefined }));
              }}
              uploadsAvailable={data.imageUploadsAvailable}
              error={errors.coverImage}
              disabled={saving}
            />
          </section>
        </div>

        {/* ---------- Overview ---------- */}
        <aside className="ch-tm__aside">
          <section className="ch-tm-panel ch-tm-stats" aria-labelledby="ch-tm-overview">
            <h2 className="ch-tm-panel__title" id="ch-tm-overview">
              Sales overview
            </h2>
            <dl className="ch-tm-stats__grid">
              <div>
                <dt>Allocated</dt>
                <dd>{formatNumber(stats.allocated)}</dd>
              </div>
              <div>
                <dt>Sold</dt>
                <dd>{formatNumber(stats.sold)}</dd>
              </div>
              <div>
                <dt>Being paid</dt>
                <dd>{formatNumber(stats.reserved)}</dd>
              </div>
              <div>
                <dt>Remaining</dt>
                <dd>{formatNumber(stats.remaining)}</dd>
              </div>
            </dl>
            <div className="ch-tm-meter ch-tm-meter--lg" role="img" aria-label={`${soldPct}% sold`}>
              <span className="ch-tm-meter__fill" style={{ width: `${soldPct}%` }} />
            </div>
            <p className="ch-tm-stats__caption">{soldPct}% of allocated tickets sold · {formatNumber(stats.paidOrders)} paid orders</p>
            <div className="ch-tm-stats__revenue">
              <span>Revenue</span>
              <strong>{formatTzs(stats.revenueTzs)}</strong>
            </div>
            {stats.demoRevenueTzs > 0 && <p className="ch-tm-stats__demo">Plus {formatTzs(stats.demoRevenueTzs)} in demo-mode test sales (no real money).</p>}
          </section>

          <section className="ch-tm-panel ch-tm-publicpage">
            <h2 className="ch-tm-panel__title">Public ticket page</h2>
            {live ? (
              <>
                <p className="ch-tm-publicpage__status">
                  <FiCheckCircle aria-hidden="true" /> Live — buyers can purchase now
                </p>
                <div className="ch-tm-publicpage__actions">
                  <Link to={ROUTES.ticketEvent(data.event.slug)} target="_blank" rel="noopener" className="ch-btn ch-btn--brand ch-btn--sm">
                    <FiExternalLink aria-hidden="true" /> Open page
                  </Link>
                  <Button variant="secondary" size="sm" leftIcon={<FiCopy aria-hidden="true" />} onClick={copyPublicLink}>
                    Copy link
                  </Button>
                </div>
              </>
            ) : (
              <p className="ch-tm-publicpage__text">
                {isDraft ? 'Publish the event and switch sales on to open your ticket page.' : 'Switch ticket sales on and save to open your ticket page.'}
              </p>
            )}
            {preview.onSaleCount > 0 && preview.fromPrice && (
              <p className="ch-tm-publicpage__summary">
                {preview.onSaleCount} tier{preview.onSaleCount === 1 ? '' : 's'} on sale · from {formatTzs(preview.fromPrice)} · {formatNumber(preview.allocated)} tickets
              </p>
            )}
          </section>
        </aside>
      </div>

      {/* ---------- Save bar ---------- */}
      <div className={`ch-tm-savebar ${dirty ? 'ch-tm-savebar--dirty' : ''}`} role="region" aria-label="Save ticket settings">
        <p className="ch-tm-savebar__text">{formError || (dirty ? 'You have unsaved changes.' : 'All changes saved.')}</p>
        <div className="ch-tm-savebar__actions">
          {dirty && (
            <Button variant="ghost" onClick={() => apply(data)} disabled={saving}>
              Discard
            </Button>
          )}
          <Button variant="primary" onClick={handleSave} isLoading={saving} disabled={!dirty}>
            Save Ticket Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
