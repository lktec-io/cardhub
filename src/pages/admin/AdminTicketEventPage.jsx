import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiAlertCircle, FiArrowLeft, FiCamera, FiExternalLink, FiImage, FiSearch } from 'react-icons/fi';
import { Pagination, Seo } from '../../components/common';
import { Badge, Button, EmptyState, Input, Select, Skeleton } from '../../components/ui';
import { adminService } from '../../services/adminService';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/mapValidationErrors';
import { ROUTES } from '../../constants/routes';
import { TicketsManager } from '../dashboard/events/tickets/EventTicketsPage';
import { StatusBadge } from './AdminTicketEventsPage';
import { EventDetailsFields } from './content/EventDetailsFields';
import { FilePickField } from './content/FilePickField';
import { fieldErrors, formatEventDate, formatTzs, toDetailsForm, validateEventDetails } from './content/adminContent';
import './content/admin-content.css';

const TABS = [
  { id: 'details', label: 'Details & poster' },
  { id: 'tickets', label: 'Ticket types' },
  { id: 'orders', label: 'Orders' },
  { id: 'issued', label: 'Issued tickets' },
];

/** Admin → one event: details, poster, publication, ticket types, orders and issued tickets. */
export function AdminTicketEventPage() {
  const { id } = useParams();
  const toast = useToast();
  const [event, setEvent] = useState(null);
  const [loadState, setLoadState] = useState('loading');
  const [tab, setTab] = useState('details');
  const [publishing, setPublishing] = useState(false);
  // Remounts the ticket editor after details change elsewhere so it never saves stale contact/end time.
  const [ticketsVersion, setTicketsVersion] = useState(0);

  const fetchEvent = useCallback(() => {
    adminService
      .getTicketEvent(id)
      .then((res) => {
        setEvent(res.data.data.event);
        setLoadState('success');
      })
      .catch((error) => setLoadState(error.response?.status === 404 ? 'missing' : 'error'));
  }, [id]);

  useEffect(fetchEvent, [fetchEvent]);

  const ticketsApi = useMemo(
    () => ({
      load: (eventId) => adminService.getTicketEvent(eventId).then((res) => res.data.data.tickets),
      save: (eventId, payload) => adminService.saveTicketEventTickets(eventId, payload).then((res) => res.data.data),
      publish: (eventId) => adminService.setTicketEventPublished(eventId, true),
    }),
    []
  );

  async function setPublished(published) {
    setPublishing(true);
    try {
      const res = await adminService.setTicketEventPublished(event.id, published);
      setEvent(res.data.data.event);
      setTicketsVersion((v) => v + 1);
      toast.success(published ? 'Event published.' : 'Event unpublished. It is no longer on the marketplace.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not change the publication status.'));
    } finally {
      setPublishing(false);
    }
  }

  if (loadState === 'loading') return <Skeleton height="420px" radius="var(--radius-surface)" />;
  if (loadState !== 'success') {
    return (
      <EmptyState
        icon={<FiAlertCircle />}
        title={loadState === 'missing' ? 'Event not found' : 'Couldn’t load this event'}
        action={
          loadState === 'missing' ? (
            <Link to={ROUTES.ADMIN_TICKET_EVENTS} className="ch-btn ch-btn--primary ch-btn--md">
              Back to events
            </Link>
          ) : (
            <Button variant="primary" onClick={() => { setLoadState('loading'); fetchEvent(); }}>
              Retry
            </Button>
          )
        }
      />
    );
  }

  const published = event.status === 'published';
  const live = published && event.ticketSalesEnabled;

  return (
    <div className="ch-admin-page ch-ae-detail">
      <Seo title={`Admin — ${event.title}`} noIndex />
      <Link to={ROUTES.ADMIN_TICKET_EVENTS} className="ch-ae-back">
        <FiArrowLeft aria-hidden="true" /> All events
      </Link>

      <header className="ch-ae-head">
        <div className="ch-ae-head__poster">{event.coverImageUrl ? <img src={event.coverImageUrl} alt="" /> : <FiImage aria-hidden="true" />}</div>
        <div className="ch-ae-head__main">
          <h1 className="ch-ae-head__title">{event.title}</h1>
          <p className="ch-ae-head__meta">
            {formatEventDate(event.eventDate)}
            {event.eventTime ? ` · ${event.eventTime}` : ''} · {event.venueName}
          </p>
          <div className="ch-ae-row__badges">
            <StatusBadge event={{ ...event, isLive: live }} />
          </div>
        </div>
        <div className="ch-ae-head__actions">
          <Link to={ROUTES.adminScan(event.id)} className="ch-btn ch-btn--brand ch-btn--sm">
            <FiCamera aria-hidden="true" /> Scan tickets
          </Link>
          {live && (
            <Link to={ROUTES.ticketEvent(event.slug)} target="_blank" rel="noopener" className="ch-btn ch-btn--secondary ch-btn--sm">
              <FiExternalLink aria-hidden="true" /> View on /ticket
            </Link>
          )}
          <Button variant={published ? 'ghost' : 'primary'} size="sm" onClick={() => setPublished(!published)} isLoading={publishing}>
            {published ? 'Unpublish' : 'Publish event'}
          </Button>
        </div>
      </header>

      <div className="ch-ae-tabs" role="tablist" aria-label="Event sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`ch-ae-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`ch-ae-panel-${t.id}`}
            className={`ch-ae-tabs__tab ${tab === t.id ? 'ch-ae-tabs__tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Details and ticket editors stay mounted so unsaved edits survive a tab switch. */}
      <section role="tabpanel" id="ch-ae-panel-details" aria-labelledby="ch-ae-tab-details" hidden={tab !== 'details'}>
        <DetailsPanel
          event={event}
          onSaved={(next) => {
            setEvent(next);
            setTicketsVersion((v) => v + 1);
          }}
        />
      </section>
      <section role="tabpanel" id="ch-ae-panel-tickets" aria-labelledby="ch-ae-tab-tickets" hidden={tab !== 'tickets'}>
        <TicketsManager key={ticketsVersion} event={event} reload={fetchEvent} api={ticketsApi} showCover={false} />
      </section>
      {tab === 'orders' && (
        <section role="tabpanel" id="ch-ae-panel-orders" aria-labelledby="ch-ae-tab-orders">
          <OrdersPanel eventId={event.id} />
        </section>
      )}
      {tab === 'issued' && (
        <section role="tabpanel" id="ch-ae-panel-issued" aria-labelledby="ch-ae-tab-issued">
          <IssuedTicketsPanel eventId={event.id} />
        </section>
      )}
    </div>
  );
}

function DetailsPanel({ event, onSaved }) {
  const toast = useToast();
  const [details, setDetails] = useState(() => toDetailsForm(event));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [poster, setPoster] = useState(null);
  const [uploading, setUploading] = useState(false);

  async function save(e) {
    e.preventDefault();
    const clientErrors = validateEventDetails(details);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;
    setSaving(true);
    try {
      const res = await adminService.updateTicketEvent(event.id, details);
      onSaved(res.data.data.event);
      toast.success('Event details saved.');
    } catch (error) {
      setErrors(fieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save the event details.'));
    } finally {
      setSaving(false);
    }
  }

  async function uploadPoster() {
    setUploading(true);
    try {
      const res = await adminService.uploadTicketEventPoster(event.id, poster);
      onSaved(res.data.data.event);
      setPoster(null);
      toast.success('Poster updated.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'The poster upload didn’t go through.'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="ch-ae-split">
      <form className="ch-tm-panel" onSubmit={save} noValidate>
        <h2 className="ch-tm-panel__title">Event details</h2>
        <EventDetailsFields details={details} onChange={setDetails} errors={errors} disabled={saving} />
        <div className="ch-ae-formfoot">
          <Button type="submit" variant="primary" isLoading={saving}>
            Save details
          </Button>
        </div>
      </form>
      <div className="ch-tm-panel">
        <h2 className="ch-tm-panel__title">Poster</h2>
        <p className="ch-tm-panel__lead">Shown on the marketplace card, the event page and checkout. Landscape 16:10 works best.</p>
        <FilePickField kind="image" file={poster} onChange={setPoster} currentUrl={event.coverImageUrl} disabled={uploading} />
        {poster && (
          <Button variant="primary" onClick={uploadPoster} isLoading={uploading} fullWidth>
            Upload poster
          </Button>
        )}
      </div>
    </div>
  );
}

const ORDER_STATUS_OPTIONS = [
  { value: '', label: 'All orders' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Awaiting payment' },
  { value: 'processing', label: 'Processing' },
  { value: 'expired', label: 'Expired' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];
const ORDER_TONE = { paid: 'success', pending: 'warning', processing: 'warning',failed: 'danger', expired: 'default', cancelled: 'default' };

function OrdersPanel({ eventId }) {
  const [state, setState] = useState({ status: 'loading', orders: [], pagination: null });
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    let active = true;
    adminService
      .listTicketEventOrders(eventId, { page, limit: 20, status: filter || undefined })
      .then((res) => active && setState({ status: 'success', ...res.data.data }))
      .catch(() => active && setState((prev) => ({ ...prev, status: 'error' })));
    return () => {
      active = false;
    };
  }, [eventId, page, filter]);

  return (
    <div className="ch-tm-panel">
      <div className="ch-ae-panelhead">
        <h2 className="ch-tm-panel__title">Orders</h2>
        <Select
          value={filter}
          onChange={(e) => {
            setPage(1);
            setFilter(e.target.value);
          }}
          options={ORDER_STATUS_OPTIONS}
          aria-label="Filter orders"
        />
      </div>
      {state.status === 'loading' && <Skeleton height="200px" radius="var(--radius-surface)" />}
      {state.status === 'error' && <EmptyState icon={<FiAlertCircle />} title="Couldn’t load orders" />}
      {state.status === 'success' && state.orders.length === 0 && <EmptyState title="No orders yet" />}
      {state.status === 'success' && state.orders.length > 0 && (
        <>
          <div className="ch-table-wrap">
            <table className="ch-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Buyer</th>
                  <th>Ticket</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Placed</th>
                </tr>
              </thead>
              <tbody>
                {state.orders.map((order) => (
                  <tr key={order.id}>
                    <td className="ch-table__name">{order.reference}</td>
                    <td>
                      {order.buyerName}
                      <span className="ch-ae-sub">{order.buyerPhone}</span>
                    </td>
                    <td>
                      {order.quantity} × {order.ticketType}
                    </td>
                    <td>{formatTzs(order.totalTzs)}</td>
                    <td>
                      <span className="ch-ae-badges">
                        <Badge variant={ORDER_TONE[order.status] || 'default'}>{order.status}</Badge>
                        {order.isDemo && <Badge variant="warning">Demo</Badge>}
                      </span>
                    </td>
                    <td>{formatDateTime(order.paidAt || order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={state.pagination?.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}

const TICKET_TONE = { valid: 'success', used: 'accent', cancelled: 'default' };

function IssuedTicketsPanel({ eventId }) {
  const [state, setState] = useState({ status: 'loading', tickets: [], pagination: null });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    adminService
      .listTicketEventTickets(eventId, { page, limit: 25, search: search || undefined })
      .then((res) => active && setState({ status: 'success', ...res.data.data }))
      .catch(() => active && setState((prev) => ({ ...prev, status: 'error' })));
    return () => {
      active = false;
    };
  }, [eventId, page, search]);

  const checkedIn = state.tickets.filter((t) => t.checkedInAt).length;

  return (
    <div className="ch-tm-panel">
      <div className="ch-ae-panelhead">
        <h2 className="ch-tm-panel__title">Issued tickets</h2>
        <form
          className="ch-ae-inlinesearch"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(searchInput.trim());
          }}
        >
          <Input icon={<FiSearch aria-hidden="true" />} placeholder="Ticket ID or holder" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} aria-label="Search tickets" />
        </form>
      </div>
      <p className="ch-tm-panel__lead">Entry is decided by the server when a ticket QR is scanned; a ticket shown on a phone is not proof by itself.</p>
      {state.status === 'loading' && <Skeleton height="200px" radius="var(--radius-surface)" />}
      {state.status === 'error' && <EmptyState icon={<FiAlertCircle />} title="Couldn’t load tickets" />}
      {state.status === 'success' && state.tickets.length === 0 && <EmptyState title={search ? 'No tickets match' : 'No tickets issued yet'} />}
      {state.status === 'success' && state.tickets.length > 0 && (
        <>
          <p className="ch-ae-sub">
            {state.pagination?.total ?? state.tickets.length} tickets · {checkedIn} checked in on this page
          </p>
          <div className="ch-table-wrap">
            <table className="ch-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Holder</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Checked in</th>
                </tr>
              </thead>
              <tbody>
                {state.tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td className="ch-table__name ch-ae-mono">{ticket.ticketId}</td>
                    <td>
                      {ticket.holderName}
                      <span className="ch-ae-sub">{ticket.holderPhone}</span>
                    </td>
                    <td>
                      {ticket.ticketType} · {formatTzs(ticket.priceTzs)}
                    </td>
                    <td>
                      <span className="ch-ae-badges">
                        <Badge variant={TICKET_TONE[ticket.status] || 'default'}>{ticket.status}</Badge>
                        {ticket.isDemo && <Badge variant="warning">Demo</Badge>}
                      </span>
                    </td>
                    <td>{ticket.checkedInAt ? formatDateTime(ticket.checkedInAt) : 'Not yet'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={state.pagination?.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
