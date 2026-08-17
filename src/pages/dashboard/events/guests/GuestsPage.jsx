import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FiAlertCircle, FiEdit2, FiPlus, FiSearch, FiTrash2, FiUpload, FiUsers } from 'react-icons/fi';
import { Seo, Pagination } from '../../../../components/common';
import { Button, Input, EmptyState, Skeleton } from '../../../../components/ui';
import { GuestStatsBar, GuestStatusBadge, GuestFormModal, DeleteGuestsModal, BulkImportModal } from '../../../../components/guests';
import { guestsService } from '../../../../services/guestsService';
import { useToast } from '../../../../hooks/useToast';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { RSVP_STATUS_FILTERS } from '../../../../constants/rsvpStatus';
import { getErrorMessage } from '../../../../utils/mapValidationErrors';

const PAGE_SIZE = 20;

export function GuestsPage() {
  const { event } = useOutletContext();
  const toast = useToast();
  const isMobile = useMediaQuery('(max-width: 860px)');

  const [guests, setGuests] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState('loading');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const [formModal, setFormModal] = useState({ isOpen: false, guest: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, ids: [] });
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(() => {
    setStatus('loading');
    Promise.all([
      guestsService.list(event.id, { page, limit: PAGE_SIZE, search: search || undefined, status: statusFilter || undefined }),
      guestsService.stats(event.id),
    ])
      .then(([listRes, statsRes]) => {
        const data = listRes.data.data;
        setGuests(data.guests);
        setPagination(data.pagination);
        setStats(statsRes.data.data.stats);
        setStatus(data.guests.length === 0 ? 'empty' : 'success');
        setSelectedIds([]);
      })
      .catch(() => setStatus('error'));
  }, [event.id, page, search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  async function handleCreateOrUpdate(payload) {
    if (formModal.guest) {
      await guestsService.update(event.id, formModal.guest.id, payload);
      toast.success('Guest updated');
    } else {
      await guestsService.create(event.id, payload);
      toast.success('Guest added');
    }
    load();
  }

  async function handleConfirmDelete() {
    setIsDeleting(true);
    try {
      if (deleteModal.ids.length === 1) {
        await guestsService.remove(event.id, deleteModal.ids[0]);
      } else {
        await guestsService.bulkRemove(event.id, deleteModal.ids);
      }
      toast.success(deleteModal.ids.length > 1 ? 'Guests removed' : 'Guest removed');
      setDeleteModal({ isOpen: false, ids: [] });
      load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not remove guest(s)'));
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleImport(rows) {
    const res = await guestsService.bulkImport(event.id, rows);
    load();
    return res.data.data;
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="ch-guests-page">
      <Seo title={`Guests — ${event.title}`} />

      {stats && <GuestStatsBar stats={stats} />}

      <div className="ch-guests-toolbar">
        <Input
          className="ch-guests-toolbar__search"
          icon={<FiSearch aria-hidden="true" />}
          placeholder="Search guests..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        <div className="ch-guests-toolbar__filters">
          {RSVP_STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value || 'all'}
              type="button"
              className={`ch-chip ${statusFilter === filter.value ? 'ch-chip--active' : ''}`}
              onClick={() => {
                setPage(1);
                setStatusFilter(filter.value);
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="ch-guests-toolbar__actions">
          <Button variant="secondary" onClick={() => setIsImportOpen(true)}>
            <FiUpload aria-hidden="true" /> Import CSV
          </Button>
          <Button variant="primary" onClick={() => setFormModal({ isOpen: true, guest: null })}>
            <FiPlus aria-hidden="true" /> Add guest
          </Button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="ch-guests-bulk-bar">
          <span>{selectedIds.length} selected</span>
          <Button variant="danger" size="sm" onClick={() => setDeleteModal({ isOpen: true, ids: selectedIds })}>
            <FiTrash2 aria-hidden="true" /> Delete selected
          </Button>
        </div>
      )}

      {status === 'loading' && (
        <div className="ch-guest-cards">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height="80px" radius="var(--radius-lg)" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <EmptyState
          icon={<FiAlertCircle />}
          title="Couldn't load guests"
          action={
            <Button variant="primary" onClick={load}>
              Retry
            </Button>
          }
        />
      )}

      {status === 'empty' && (
        <EmptyState
          icon={<FiUsers />}
          title={search || statusFilter ? 'No guests match your filters' : 'No guests yet'}
          description={search || statusFilter ? 'Try a different search or filter.' : 'Add your first guest or import a list.'}
          action={
            !search && !statusFilter ? (
              <Button variant="primary" onClick={() => setFormModal({ isOpen: true, guest: null })}>
                Add guest
              </Button>
            ) : undefined
          }
        />
      )}

      {status === 'success' &&
        (isMobile ? (
          <div className="ch-guest-cards">
            {guests.map((guest) => {
              return (
                <div className="ch-guest-card" key={guest.id}>
                  <div className="ch-guest-card__top">
                    <div>
                      <p className="ch-guest-card__name">{guest.name}</p>
                      <p className="ch-guest-card__meta">
                        {guest.phone || guest.email || 'No contact info'} &middot; Party of {guest.partySize}
                      </p>
                    </div>
                    <GuestStatusBadge status={guest.status} />
                  </div>
                  <div className="ch-guest-card__actions">
                    <Button variant="ghost" size="sm" onClick={() => setFormModal({ isOpen: true, guest })}>
                      <FiEdit2 aria-hidden="true" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteModal({ isOpen: true, ids: [guest.id] })}>
                      <FiTrash2 aria-hidden="true" /> Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="ch-table-wrap">
            <table className="ch-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedIds.length === guests.length && guests.length > 0}
                      onChange={(e) => setSelectedIds(e.target.checked ? guests.map((g) => g.id) : [])}
                      aria-label="Select all guests"
                    />
                  </th>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Party</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {guests.map((guest) => (
                  <tr key={guest.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(guest.id)}
                        onChange={() => toggleSelect(guest.id)}
                        aria-label={`Select ${guest.name}`}
                      />
                    </td>
                    <td className="ch-table__name">{guest.name}</td>
                    <td>{guest.phone || guest.email || '—'}</td>
                    <td>{guest.partySize}</td>
                    <td>
                      <GuestStatusBadge status={guest.status} />
                    </td>
                    <td>
                      <div className="ch-table__actions">
                        <button className="ch-table__icon-btn" onClick={() => setFormModal({ isOpen: true, guest })} aria-label={`Edit ${guest.name}`}>
                          <FiEdit2 />
                        </button>
                        <button
                          className="ch-table__icon-btn"
                          onClick={() => setDeleteModal({ isOpen: true, ids: [guest.id] })}
                          aria-label={`Delete ${guest.name}`}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {status === 'success' && <Pagination page={page} totalPages={pagination?.totalPages} onChange={setPage} />}

      <GuestFormModal
        isOpen={formModal.isOpen}
        guest={formModal.guest}
        onClose={() => setFormModal({ isOpen: false, guest: null })}
        onSubmit={handleCreateOrUpdate}
      />
      <DeleteGuestsModal
        isOpen={deleteModal.isOpen}
        count={deleteModal.ids.length}
        onClose={() => setDeleteModal({ isOpen: false, ids: [] })}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
      <BulkImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} onImported={handleImport} />
    </div>
  );
}
