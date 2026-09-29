import { FiArrowDown, FiArrowUp, FiTrash2 } from 'react-icons/fi';
import { Input, Switch } from '../../../../components/ui';

const formatNumber = (value) => new Intl.NumberFormat('en-TZ').format(value);

/**
 * One editable ticket tier. A tier that already has orders can be paused
 * (taken off sale) but not removed, because its sold tickets must stay valid.
 */
export function TicketTierCard({ tier, index, total, errors, onChange, onRemove, onMove, disabled }) {
  const err = (field) => errors[`tiers.${index}.${field}`];
  const set = (field) => (e) => onChange({ ...tier, [field]: e.target.value });
  const committed = tier.quantitySold + tier.quantityReserved;
  const quantity = Number(String(tier.quantityAvailable).replace(/[^\d]/g, '')) || 0;
  const remaining = Math.max(quantity - committed, 0);
  const soldPct = quantity ? Math.min(100, Math.round((tier.quantitySold / quantity) * 100)) : 0;
  const onSale = tier.status === 'active';

  return (
    <article className={`ch-tm-tier ${onSale ? '' : 'ch-tm-tier--paused'}`} aria-label={tier.name || `Ticket tier ${index + 1}`}>
      <header className="ch-tm-tier__head">
        <span className="ch-tm-tier__index">{String(index + 1).padStart(2, '0')}</span>
        <div className="ch-tm-tier__heading">
          <p className="ch-tm-tier__name">{tier.name.trim() || 'New tier'}</p>
          <span className={`ch-tm-tag ${onSale ? 'ch-tm-tag--live' : 'ch-tm-tag--muted'}`}>{onSale ? 'On sale' : 'Paused'}</span>
          {tier.id === null && <span className="ch-tm-tag ch-tm-tag--new">New</span>}
        </div>
        <div className="ch-tm-tier__tools">
          <button type="button" className="ch-tm-icon-btn" onClick={() => onMove(-1)} disabled={disabled || index === 0} aria-label="Move up">
            <FiArrowUp aria-hidden="true" />
          </button>
          <button type="button" className="ch-tm-icon-btn" onClick={() => onMove(1)} disabled={disabled || index === total - 1} aria-label="Move down">
            <FiArrowDown aria-hidden="true" />
          </button>
          {!tier.hasOrders && (
            <button type="button" className="ch-tm-icon-btn ch-tm-icon-btn--danger" onClick={onRemove} disabled={disabled} aria-label={`Remove ${tier.name || 'tier'}`}>
              <FiTrash2 aria-hidden="true" />
            </button>
          )}
        </div>
      </header>

      <div className="ch-tm-tier__fields">
        <Input className="ch-tm-tier__field--name" label="Category name" placeholder="e.g. VIP" value={tier.name} onChange={set('name')} error={err('name')} maxLength={80} disabled={disabled} />
        <Input
          label="Price (TSh)"
          placeholder="20,000"
          value={tier.priceTzs}
          onChange={(e) => onChange({ ...tier, priceTzs: e.target.value.replace(/[^\d,]/g, '') })}
          error={err('priceTzs')}
          inputMode="numeric"
          disabled={disabled}
        />
        <Input
          label="Available quantity"
          placeholder="100"
          value={tier.quantityAvailable}
          onChange={(e) => onChange({ ...tier, quantityAvailable: e.target.value.replace(/[^\d]/g, '') })}
          error={err('quantityAvailable')}
          inputMode="numeric"
          disabled={disabled}
        />
        <Input
          label="Max per order"
          value={tier.maxPerOrder}
          onChange={(e) => onChange({ ...tier, maxPerOrder: e.target.value.replace(/[^\d]/g, '') })}
          error={err('maxPerOrder')}
          inputMode="numeric"
          disabled={disabled}
        />
        <Input
          className="ch-tm-tier__field--wide"
          label="Description (optional)"
          placeholder="What this ticket includes"
          value={tier.description}
          onChange={set('description')}
          error={err('description')}
          maxLength={255}
          disabled={disabled}
        />
      </div>

      <footer className="ch-tm-tier__foot">
        <div className="ch-tm-tier__usage">
          <div className="ch-tm-meter" role="img" aria-label={`${tier.quantitySold} of ${quantity} sold`}>
            <span className="ch-tm-meter__fill" style={{ width: `${soldPct}%` }} />
          </div>
          <p className="ch-tm-tier__usage-text">
            <strong>{formatNumber(tier.quantitySold)}</strong> sold · {formatNumber(tier.quantityReserved)} held · {formatNumber(remaining)} left
          </p>
        </div>
        <Switch
          className="ch-tm-tier__switch"
          label={onSale ? 'On sale' : 'Paused'}
          checked={onSale}
          onChange={(checked) => onChange({ ...tier, status: checked ? 'active' : 'inactive' })}
          disabled={disabled}
        />
      </footer>
      {tier.hasOrders && <p className="ch-tm-tier__note">This tier has orders, so it can be paused but not removed.</p>}
    </article>
  );
}
