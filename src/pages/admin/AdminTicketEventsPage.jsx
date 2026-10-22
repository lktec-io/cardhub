import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiCalendar, FiPlus, FiSearch } from 'react-icons/fi';
import { PageHeader, Pagination, Seo } from '../../components/common';
import { Badge, Button, EmptyState, Input, Modal, Select, Skeleton } from '../../components/ui';
import { adminService } from '../../services/adminService';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/mapValidationErrors';
import { ROUTES } from '../../constants/routes';
import { EventDetailsFields } from './content/EventDetailsFields';
import { EMPTY_EVENT_DETAILS, fieldErrors, formatEventDate, formatTzs, validateEventDetails } from './content/adminContent';
import './content/admin-content.css';

const PAGE_SIZE = 20;
const SCOPE_OPTIONS = [
  { value: 'ticketing', label: 'Ticketed events' },
  { value: 'all', label: 'All events' },
];

/** Admin → Events & tickets: every ticketed event on the marketplace, with live sales figures. */
export function AdminTicketEventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [status, setStatus] = useState('loading');
  const [page, setPage] = useState(1);
  const [scope, setScope] = useState('ticketing');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  const query = `${page}|${scope}|${search}`;
  const [lastQuery, setLastQuery] = useState(query);
  if (lastQuery !== query) {
    setLastQuery(query);
    if (status !== 'loading') setStatus('loading');
  }

  function fetchEvents() {
    adminService
      .listTicketEvents({ page, limit: PAGE_SIZE, scope, search: search || undefined })
      .then((res) => {
        setEvents(res.data.data.events);
        setPagination(res.data.data.pagination);
        setStatus('success');
      })
      .catch(() => setStatus('error'));
  }

  useEffect(fetchEvents, [page, scope, search]);

  function retry() {
    setStatus('loading');
    fetchEvents();
  }

  return (
    <div className="ch-admin-page">
      <Seo title="Admin — Events & tickets" noIndex />
      <PageHeader
        eyebrow="Ticket marketplace"
        title="Events & tickets"
        description="Create events, set ticket types and prices, publish them to /ticket and follow sales and check-ins."
        actions={
          <Button variant="primary" leftIcon={<FiPlus aria-hidden="true" />} onClick={() => setCreating(true)}>
            New event
          </Button>
        }
      />

      <form
        className="ch-ac-filters"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(searchInput.trim());
        }}
      >
        <Input
          className="ch-ac-filters__search"
          icon={<FiSearch aria-hidden="true" />}
          placeholder="Search by event or venue"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label="Search events"
        />
        <Select
          value={scope}
          onChange={(e) => {
            setPage(1);
            setScope(e.target.value);
          }}
          options={SCOPE_OPTIONS}
          aria-label="Which events"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {status === 'loading' && <Skeleton height="320px" radius="var(--radius-surface)" />}
      {status === 'error' && <EmptyState icon={<FiAlertCircle />} title="Couldn’t load events" action={<Button variant="primary" onClick={retry}>Retry</Button>} />}
      {status === 'success' && events.length === 0 && (
        <EmptyState
          icon={<FiCalendar />}
          title={search ? 'No events match your search' : 'No ticketed events yet'}
          description={search ? undefined : 'Create an event, add ticket types and publish it to the marketplace.'}
          action={!search && <Button variant="primary" onClick={() => setCreating(true)}>New event</Button>}
        />
      )}

      {status === 'success' && events.length > 0 && (
        <>
          <ul className="ch-ae-list">
            {events.map((event) => (
              <li key={event.id}>
                <Link to={ROUTES.adminTicketEvent(event.id)} className="ch-ae-row">
                  <span className="ch-ae-row__poster">{event.coverImageUrl ? <img src={event.coverImageUrl} alt="" loading="lazy" /> : <FiCalendar aria-hidden="true" />}</span>
                  <span className="ch-ae-row__main">
                    <span className="ch-ae-row__title">{event.title}</span>
                    <span className="ch-ae-row__meta">
                      {formatEventDate(event.eventDate)}
                      {event.eventTime ? ` · ${event.eventTime}` : ''}
                      {event.venueName ? ` · ${event.venueName}` : ''}
                    </span>
                    <span className="ch-ae-row__badges">
                      <StatusBadge event={event} />
                      {event.tierCount > 0 && <Badge>{event.tierCount} ticket type{event.tierCount === 1 ? '' : 's'}</Badge>}
                    </span>
                  </span>
                  <span className="ch-ae-row__figures">
                    <span>
                      <strong>{event.sold}</strong> / {event.allocated} sold
                    </span>
                    <span>{formatTzs(event.revenueTzs)}</span>
                    {event.demoRevenueTzs > 0 && <span className="ch-ae-row__demo">+ {formatTzs(event.demoRevenueTzs)} demo</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={pagination?.totalPages} onChange={setPage} />
        </>
      )}

      {creating && <CreateEventDialog onClose={() => setCreating(false)} onCreated={(event) => navigate(ROUTES.adminTicketEvent(event.id))} />}
    </div>
  );
}

export function StatusBadge({ event }) {
  if (event.isLive) return <Badge variant="success">On sale</Badge>;
  if (event.status === 'published') return <Badge variant="accent">Published · sales off</Badge>;
  return <Badge>Draft</Badge>;
}

function CreateEventDialog({ onClose, onCreated }) {
  const toast = useToast();
  const [details, setDetails] = useState(EMPTY_EVENT_DETAILS);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  async function create(e) {
    e.preventDefault();
    const clientErrors = validateEventDetails(details);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;
    setSaving(true);
    try {
      const res = await adminService.createTicketEvent(details);
      toast.success('Event created as a draft. Add a poster and ticket types next.');
      onCreated(res.data.data.event);
    } catch (error) {
      setErrors(fieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not create the event.'));
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={saving ? undefined : onClose}
      title="New event"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="ch-create-event" isLoading={saving}>
            Create draft
          </Button>
        </>
      }
    >
      <form id="ch-create-event" onSubmit={create} noValidate>
        <EventDetailsFields details={details} onChange={setDetails} errors={errors} disabled={saving} />
      </form>
    </Modal>
  );
}
