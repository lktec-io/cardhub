import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertCircle, FiArrowDown, FiArrowUp, FiEdit2, FiExternalLink, FiEye, FiEyeOff, FiPlus, FiTrash2 } from 'react-icons/fi';
import { PageHeader, Seo } from '../../components/common';
import { Badge, Button, EmptyState, Input, Modal, Select, Skeleton, Switch, Textarea } from '../../components/ui';
import { adminService } from '../../services/adminService';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/mapValidationErrors';
import { TEMPLATE_CATEGORIES, getCategoryLabel } from '../../constants/templateCategories';
import { PRICING_TIER_LIST } from '../../constants/pricingTiers';
import { ROUTES } from '../../constants/routes';
import { FilePickField } from './content/FilePickField';
import { ConfirmDialog } from './content/ConfirmDialog';
import { fieldErrors, moveItem } from './content/adminContent';
import './content/admin-content.css';

const CATEGORY_OPTIONS = TEMPLATE_CATEGORIES.filter((c) => c.value);
const TIER_OPTIONS = PRICING_TIER_LIST.map((tier) => ({ value: tier.id, label: `${tier.name} · TSh ${new Intl.NumberFormat('en-TZ').format(tier.priceTzs)}` }));
const EMPTY_DETAILS = { name: '', description: '', category: 'wedding', pricingTier: PRICING_TIER_LIST[0]?.id || 'starter', status: 'inactive' };

/**
 * Admin → Invitation cards. The public gallery (/templates, the landing
 * showcase, Try Our Service) reads exactly these rows, so what's published
 * here is what customers see, in this order.
 */
export function AdminCardsPage() {
  const toast = useToast();
  const [cards, setCards] = useState([]);
  const [status, setStatus] = useState('loading');
  const [editor, setEditor] = useState(null); // { mode: 'create' | 'edit', card? }
  const [busyId, setBusyId] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCards = useCallback(() => {
    adminService
      .listCards()
      .then((res) => {
        setCards(res.data.data.cards);
        setStatus('success');
      })
      .catch(() => setStatus('error'));
  }, []);

  useEffect(fetchCards, [fetchCards]);

  function retry() {
    setStatus('loading');
    fetchCards();
  }

  function replaceCard(card) {
    setCards((prev) => (prev.some((c) => c.id === card.id) ? prev.map((c) => (c.id === card.id ? { ...c, ...card } : c)) : [...prev, card]));
  }

  async function togglePublished(card) {
    setBusyId(card.id);
    const next = card.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await adminService.updateCard(card.id, { ...pickDetails(card), status: next });
      replaceCard(res.data.data.card);
      toast.success(next === 'active' ? `“${card.name}” is now live in the gallery.` : `“${card.name}” is hidden from the gallery.`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update this card.'));
    } finally {
      setBusyId(null);
    }
  }

  async function move(index, direction) {
    const previous = cards;
    const next = moveItem(cards, index, direction);
    if (next === cards) return;
    setCards(next);
    try {
      await adminService.reorderCards(next.map((c) => c.id));
    } catch (error) {
      setCards(previous);
      toast.error(getErrorMessage(error, 'Could not save the new order.'));
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await adminService.deleteCard(toDelete.id);
      setCards((prev) => prev.filter((c) => c.id !== toDelete.id));
      toast.success('Card deleted.');
      setToDelete(null);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not delete this card.'));
    } finally {
      setDeleting(false);
    }
  }

  const liveCount = cards.filter((c) => c.status === 'active').length;

  return (
    <div className="ch-admin-page">
      <Seo title="Admin — Invitation cards" noIndex />
      <PageHeader
        eyebrow="Content"
        title="Invitation cards"
        description="Upload real card designs, choose their category and price tier, and decide which ones appear in the public gallery."
        actions={
          <Button variant="primary" leftIcon={<FiPlus aria-hidden="true" />} onClick={() => setEditor({ mode: 'create' })}>
            Add card
          </Button>
        }
      />

      {status === 'loading' && <Skeleton height="360px" radius="var(--radius-surface)" />}
      {status === 'error' && (
        <EmptyState icon={<FiAlertCircle />} title="Couldn’t load the card catalogue" action={<Button variant="primary" onClick={retry}>Retry</Button>} />
      )}
      {status === 'success' && cards.length === 0 && (
        <EmptyState title="No cards yet" description="Add your first invitation card design." action={<Button variant="primary" onClick={() => setEditor({ mode: 'create' })}>Add card</Button>} />
      )}

      {status === 'success' && cards.length > 0 && (
        <>
          <div className="ch-ac-toolbar">
            <p className="ch-ac-toolbar__summary">
              <strong>{liveCount}</strong> live · {cards.length - liveCount} hidden · shown to customers in this order
            </p>
            <Link to={ROUTES.TEMPLATES} target="_blank" rel="noopener" className="ch-btn ch-btn--ghost ch-btn--sm">
              <FiExternalLink aria-hidden="true" /> Open public gallery
            </Link>
          </div>
          <ul className="ch-ac-grid">
            {cards.map((card, index) => {
              const live = card.status === 'active';
              const busy = busyId === card.id;
              return (
                <li key={card.id} className={`ch-ac-item ${live ? '' : 'ch-ac-item--hidden'}`}>
                  <div className="ch-ac-item__media">
                    {card.previewImage ? <img src={card.previewImage} alt={card.name} loading="lazy" /> : <span className="ch-ac-item__noimg">No image</span>}
                    <span className="ch-ac-item__pos">{index + 1}</span>
                  </div>
                  <div className="ch-ac-item__body">
                    <div className="ch-ac-item__title-row">
                      <h2 className="ch-ac-item__title">{card.name}</h2>
                      <Badge variant={live ? 'success' : 'default'}>{live ? 'Live' : 'Hidden'}</Badge>
                    </div>
                    <p className="ch-ac-item__meta">
                      {getCategoryLabel(card.category)} · TSh {new Intl.NumberFormat('en-TZ').format(card.priceTzs)}
                      {card.eventsUsing ? ` · used by ${card.eventsUsing} event${card.eventsUsing === 1 ? '' : 's'}` : ''}
                    </p>
                  </div>
                  <div className="ch-ac-item__actions">
                    <Button variant="secondary" size="sm" leftIcon={<FiEdit2 aria-hidden="true" />} onClick={() => setEditor({ mode: 'edit', card })} disabled={busy}>
                      Edit
                    </Button>
                    <Button
                      variant={live ? 'ghost' : 'brand'}
                      size="sm"
                      leftIcon={live ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
                      onClick={() => togglePublished(card)}
                      isLoading={busy}
                    >
                      {live ? 'Hide' : 'Publish'}
                    </Button>
                    <span className="ch-ac-item__tools">
                      <button type="button" className="ch-tm-icon-btn" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${card.name} up`}>
                        <FiArrowUp aria-hidden="true" />
                      </button>
                      <button type="button" className="ch-tm-icon-btn" onClick={() => move(index, 1)} disabled={index === cards.length - 1} aria-label={`Move ${card.name} down`}>
                        <FiArrowDown aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="ch-tm-icon-btn ch-tm-icon-btn--danger"
                        onClick={() => setToDelete(card)}
                        disabled={card.eventsUsing > 0}
                        title={card.eventsUsing > 0 ? 'Used by events, so it can be hidden but not deleted' : undefined}
                        aria-label={`Delete ${card.name}`}
                      >
                        <FiTrash2 aria-hidden="true" />
                      </button>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {editor && (
        <CardEditor
          key={editor.card?.id || 'new'}
          mode={editor.mode}
          card={editor.card}
          onClose={() => setEditor(null)}
          onSaved={(card) => {
            replaceCard(card);
            setEditor(null);
          }}
        />
      )}

      <ConfirmDialog isOpen={Boolean(toDelete)} title="Delete this card?" onClose={() => setToDelete(null)} onConfirm={confirmDelete} busy={deleting}>
        <p className="ch-body-sm">
          “{toDelete?.name}” and its image will be removed permanently. If you might need it again, hide it instead.
        </p>
      </ConfirmDialog>
    </div>
  );
}

function pickDetails(card) {
  return { name: card.name, description: card.description || '', category: card.category, pricingTier: card.pricingTier, status: card.status };
}

function CardEditor({ mode, card, onClose, onSaved }) {
  const toast = useToast();
  const [details, setDetails] = useState(card ? pickDetails(card) : EMPTY_DETAILS);
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (field) => (e) => setDetails((prev) => ({ ...prev, [field]: e.target.value }));

  async function save(event) {
    event.preventDefault();
    const nextErrors = {};
    if (details.name.trim().length < 2) nextErrors.name = 'Give the card a name';
    if (mode === 'create' && !file) nextErrors.image = 'Choose the card image';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      let saved;
      if (mode === 'create') {
        saved = (await adminService.createCard(details, file)).data.data.card;
      } else {
        saved = (await adminService.updateCard(card.id, details)).data.data.card;
        if (file) saved = (await adminService.replaceCardImage(card.id, file)).data.data.card;
      }
      toast.success(mode === 'create' ? 'Card added.' : 'Card saved.');
      onSaved(saved);
    } catch (error) {
      setErrors(fieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save this card.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={saving ? undefined : onClose}
      title={mode === 'create' ? 'Add invitation card' : `Edit “${card.name}”`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="ch-card-editor" isLoading={saving}>
            {mode === 'create' ? 'Add card' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form id="ch-card-editor" className="ch-ac-form" onSubmit={save} noValidate>
        <FilePickField
          label="Card image"
          kind="image"
          file={file}
          onChange={(next) => {
            setFile(next);
            setErrors((prev) => ({ ...prev, image: undefined }));
          }}
          currentUrl={card?.previewImage}
          error={errors.image}
          hint="The real design customers will see, download and share. Portrait 4:5 works best · JPG, PNG or WEBP · up to 8 MB"
          disabled={saving}
        />
        <div className="ch-ac-form__fields">
          <Input label="Card name" value={details.name} onChange={set('name')} error={errors.name} maxLength={150} disabled={saving} />
          <div className="ch-ac-form__row">
            <Select label="Category" value={details.category} onChange={set('category')} options={CATEGORY_OPTIONS} error={errors.category} disabled={saving} />
            <Select label="Price tier" value={details.pricingTier} onChange={set('pricingTier')} options={TIER_OPTIONS} error={errors.pricingTier} disabled={saving} />
          </div>
          <Textarea label="Short description (optional)" value={details.description} onChange={set('description')} error={errors.description} maxLength={500} rows={3} disabled={saving} />
          <Switch
            label="Show in the public gallery"
            description={details.status === 'active' ? 'Customers can see and choose this card.' : 'Hidden until you publish it.'}
            checked={details.status === 'active'}
            onChange={(checked) => setDetails((prev) => ({ ...prev, status: checked ? 'active' : 'inactive' }))}
            disabled={saving}
          />
        </div>
      </form>
    </Modal>
  );
}
