import { useCallback, useEffect, useState } from 'react';
import { FiAlertCircle, FiArrowDown, FiArrowUp, FiEdit2, FiEye, FiEyeOff, FiFilm, FiPlus, FiTrash2 } from 'react-icons/fi';
import { PageHeader, Seo } from '../../components/common';
import { Badge, Button, EmptyState, Input, Modal, Select, Skeleton, Switch, Textarea } from '../../components/ui';
import { adminService } from '../../services/adminService';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/mapValidationErrors';
import { EVENT_TYPES, getEventTypeLabel } from '../../constants/eventTypes';
import { FilePickField } from './content/FilePickField';
import { ConfirmDialog } from './content/ConfirmDialog';
import { fieldErrors, formatBytes, moveItem } from './content/adminContent';
import './content/admin-content.css';

const CATEGORY_OPTIONS = [{ value: '', label: 'No category' }, ...EVENT_TYPES.map((t) => ({ value: t.value, label: t.label }))];

/**
 * Admin → Videos. Published videos feed the "See it at real events"
 * showcase on the home page, in this order. Files are stored on the
 * CardHub server; nothing here is public until it's published.
 */
export function AdminMediaPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [editor, setEditor] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = useCallback(() => {
    adminService
      .listMedia()
      .then((res) => {
        setItems(res.data.data.media.filter((item) => item.kind === 'video'));
        setStatus('success');
      })
      .catch(() => setStatus('error'));
  }, []);

  useEffect(fetchItems, [fetchItems]);

  function retry() {
    setStatus('loading');
    fetchItems();
  }

  function replaceItem(item) {
    setItems((prev) => (prev.some((i) => i.id === item.id) ? prev.map((i) => (i.id === item.id ? item : i)) : [...prev, item]));
  }

  async function togglePublished(item) {
    setBusyId(item.id);
    const next = item.status === 'published' ? 'draft' : 'published';
    try {
      const res = await adminService.updateMedia(item.id, { title: item.title, description: item.description || '', category: item.category || '', status: next });
      replaceItem(res.data.data.item);
      toast.success(next === 'published' ? 'Video is live on the home page.' : 'Video hidden from the website.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update this video.'));
    } finally {
      setBusyId(null);
    }
  }

  async function move(index, direction) {
    const previous = items;
    const next = moveItem(items, index, direction);
    if (next === items) return;
    setItems(next);
    try {
      await adminService.reorderMedia(next.map((i) => i.id));
    } catch (error) {
      setItems(previous);
      toast.error(getErrorMessage(error, 'Could not save the new order.'));
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await adminService.deleteMedia(toDelete.id);
      setItems((prev) => prev.filter((i) => i.id !== toDelete.id));
      toast.success('Video deleted.');
      setToDelete(null);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not delete this video.'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="ch-admin-page">
      <Seo title="Admin — Videos" noIndex />
      <PageHeader
        eyebrow="Content"
        title="Event videos"
        description="Short clips from real CardHub events. Published videos play in the home page showcase."
        actions={
          <Button variant="primary" leftIcon={<FiPlus aria-hidden="true" />} onClick={() => setEditor({ mode: 'create' })}>
            Upload video
          </Button>
        }
      />

      {status === 'loading' && <Skeleton height="320px" radius="var(--radius-surface)" />}
      {status === 'error' && <EmptyState icon={<FiAlertCircle />} title="Couldn’t load videos" action={<Button variant="primary" onClick={retry}>Retry</Button>} />}
      {status === 'success' && items.length === 0 && (
        <EmptyState
          icon={<FiFilm />}
          title="No videos yet"
          description="Until you publish one, the home page shows the built-in CardHub film."
          action={<Button variant="primary" onClick={() => setEditor({ mode: 'create' })}>Upload video</Button>}
        />
      )}

      {status === 'success' && items.length > 0 && (
        <ul className="ch-ac-grid ch-ac-grid--wide">
          {items.map((item, index) => {
            const live = item.status === 'published';
            return (
              <li key={item.id} className={`ch-ac-item ${live ? '' : 'ch-ac-item--hidden'}`}>
                <div className="ch-ac-item__media ch-ac-item__media--video">
                  <video src={item.url} poster={item.posterUrl || undefined} controls preload="none" playsInline />
                  <span className="ch-ac-item__pos">{index + 1}</span>
                </div>
                <div className="ch-ac-item__body">
                  <div className="ch-ac-item__title-row">
                    <h2 className="ch-ac-item__title">{item.title}</h2>
                    <Badge variant={live ? 'success' : 'default'}>{live ? 'Live' : 'Draft'}</Badge>
                  </div>
                  <p className="ch-ac-item__meta">
                    {item.category ? `${getEventTypeLabel(item.category)} · ` : ''}
                    {formatBytes(item.sizeBytes)}
                    {item.posterUrl ? '' : ' · no cover frame'}
                  </p>
                </div>
                <div className="ch-ac-item__actions">
                  <Button variant="secondary" size="sm" leftIcon={<FiEdit2 aria-hidden="true" />} onClick={() => setEditor({ mode: 'edit', item })}>
                    Edit
                  </Button>
                  <Button
                    variant={live ? 'ghost' : 'brand'}
                    size="sm"
                    leftIcon={live ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
                    onClick={() => togglePublished(item)}
                    isLoading={busyId === item.id}
                  >
                    {live ? 'Hide' : 'Publish'}
                  </Button>
                  <span className="ch-ac-item__tools">
                    <button type="button" className="ch-tm-icon-btn" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${item.title} up`}>
                      <FiArrowUp aria-hidden="true" />
                    </button>
                    <button type="button" className="ch-tm-icon-btn" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label={`Move ${item.title} down`}>
                      <FiArrowDown aria-hidden="true" />
                    </button>
                    <button type="button" className="ch-tm-icon-btn ch-tm-icon-btn--danger" onClick={() => setToDelete(item)} aria-label={`Delete ${item.title}`}>
                      <FiTrash2 aria-hidden="true" />
                    </button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editor && (
        <VideoEditor
          key={editor.item?.id || 'new'}
          mode={editor.mode}
          item={editor.item}
          onClose={() => setEditor(null)}
          onSaved={(item) => {
            replaceItem(item);
            setEditor(null);
          }}
        />
      )}

      <ConfirmDialog isOpen={Boolean(toDelete)} title="Delete this video?" onClose={() => setToDelete(null)} onConfirm={confirmDelete} busy={deleting}>
        <p className="ch-body-sm">“{toDelete?.title}” and its file will be removed from the server permanently.</p>
      </ConfirmDialog>
    </div>
  );
}

function VideoEditor({ mode, item, onClose, onSaved }) {
  const toast = useToast();
  const [details, setDetails] = useState({
    title: item?.title || '',
    description: item?.description || '',
    category: item?.category || '',
    status: item?.status || 'draft',
  });
  const [file, setFile] = useState(null);
  const [poster, setPoster] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(null);
  const set = (field) => (e) => setDetails((prev) => ({ ...prev, [field]: e.target.value }));

  async function save(event) {
    event.preventDefault();
    const nextErrors = {};
    if (details.title.trim().length < 2) nextErrors.title = 'Give the video a title';
    if (mode === 'create' && !file) nextErrors.file = 'Choose the video file';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      let saved;
      if (mode === 'create') {
        const res = await adminService.uploadVideo(details, file, (e) => e.total && setProgress(Math.round((e.loaded / e.total) * 100)));
        saved = res.data.data.item;
      } else {
        saved = (await adminService.updateMedia(item.id, details)).data.data.item;
      }
      if (poster) saved = (await adminService.replaceMediaPoster(saved.id, poster)).data.data.item;
      toast.success(mode === 'create' ? 'Video uploaded.' : 'Video saved.');
      onSaved(saved);
    } catch (error) {
      setErrors(fieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save this video.'));
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }

  return (
    <Modal
      isOpen
      onClose={saving ? undefined : onClose}
      title={mode === 'create' ? 'Upload event video' : `Edit “${item.title}”`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="ch-video-editor" isLoading={saving}>
            {saving && progress !== null && progress < 100 ? `Uploading ${progress}%` : mode === 'create' ? 'Upload' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form id="ch-video-editor" className="ch-ac-form" onSubmit={save} noValidate>
        <div className="ch-ac-form__media">
          {mode === 'create' ? (
            <FilePickField label="Video file" kind="video" file={file} onChange={setFile} error={errors.file} disabled={saving} />
          ) : (
            <div className="ch-field">
              <span className="ch-field__label">Video</span>
              <video className="ch-ac-form__video" src={item.url} poster={item.posterUrl || undefined} controls preload="metadata" playsInline />
            </div>
          )}
          <FilePickField
            label="Cover frame (optional)"
            kind="image"
            file={poster}
            onChange={setPoster}
            currentUrl={item?.posterUrl}
            error={errors.image}
            hint="Shown before the video plays · JPG, PNG or WEBP"
            disabled={saving}
          />
        </div>
        {progress !== null && (
          <div className="ch-tm-meter ch-tm-meter--lg" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
            <span className="ch-tm-meter__fill" style={{ width: `${progress}%` }} />
          </div>
        )}
        <div className="ch-ac-form__fields">
          <Input label="Title" value={details.title} onChange={set('title')} error={errors.title} maxLength={150} disabled={saving} />
          <Select label="Event category" value={details.category} onChange={set('category')} options={CATEGORY_OPTIONS} error={errors.category} disabled={saving} />
          <Textarea label="Caption (optional)" value={details.description} onChange={set('description')} error={errors.description} maxLength={500} rows={3} disabled={saving} />
          <Switch
            label="Show on the website"
            description={details.status === 'published' ? 'Plays in the home page showcase.' : 'Saved as a draft.'}
            checked={details.status === 'published'}
            onChange={(checked) => setDetails((prev) => ({ ...prev, status: checked ? 'published' : 'draft' }))}
            disabled={saving}
          />
        </div>
      </form>
    </Modal>
  );
}
