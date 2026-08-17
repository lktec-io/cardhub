import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { FiCopy, FiEdit3, FiExternalLink, FiEyeOff, FiShare2, FiTrash2 } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { InvitationCanvasEmbed } from '../../../components/invitation/InvitationCanvasEmbed';
import { Button } from '../../../components/ui';
import { DeleteEventModal, ChangeTemplateModal, PublishModal } from '../../../components/events';
import { eventsService } from '../../../services/eventsService';
import { useToast } from '../../../hooks/useToast';
import { getErrorMessage } from '../../../utils/mapValidationErrors';
import { getEventTypeLabel } from '../../../constants/eventTypes';
import { buildShareMessage, buildWhatsAppShareUrl } from '../../../utils/shareMessage';
import { ROUTES } from '../../../constants/routes';

function formatDate(dateStr) {
  if (!dateStr) return 'Not set';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function EventOverviewPage() {
  const { event, reload } = useOutletContext();
  const navigate = useNavigate();
  const toast = useToast();

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [publishErrors, setPublishErrors] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isChangingTemplate, setIsChangingTemplate] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);

  const isPublished = event.status === 'published';
  const inviteUrl = `${window.location.origin}${ROUTES.invite(event.slug)}`;

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await eventsService.remove(event.id);
      toast.success('Event deleted');
      navigate(ROUTES.DASHBOARD_EVENTS);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not delete this event'));
      setIsDeleting(false);
    }
  }

  async function handleDuplicate() {
    setIsDuplicating(true);
    try {
      const res = await eventsService.duplicate(event.id);
      toast.success('Event duplicated');
      navigate(ROUTES.eventDetail(res.data.data.event.id));
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not duplicate this event'));
    } finally {
      setIsDuplicating(false);
    }
  }

  async function handleChangeTemplate(template) {
    setIsChangingTemplate(true);
    try {
      await eventsService.changeTemplate(event.id, template.id);
      toast.success('Template updated');
      setIsTemplateModalOpen(false);
      reload();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not change the template'));
    } finally {
      setIsChangingTemplate(false);
    }
  }

  function openPublishModal() {
    setPublishErrors([]);
    setIsPublishOpen(true);
  }

  async function handlePublish() {
    setIsPublishing(true);
    try {
      await eventsService.publish(event.id);
      toast.success('Your invitation is now live');
      setIsPublishOpen(false);
      reload();
    } catch (error) {
      const details = error.response?.data?.error?.details;
      if (Array.isArray(details) && details.length > 0) {
        setPublishErrors(details);
      } else {
        toast.error(getErrorMessage(error, 'Could not publish this invitation'));
        setIsPublishOpen(false);
      }
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleUnpublish() {
    setIsUnpublishing(true);
    try {
      await eventsService.unpublish(event.id);
      toast.success('Invitation unpublished');
      reload();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not unpublish this invitation'));
    } finally {
      setIsUnpublishing(false);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Could not copy the link');
    }
  }

  async function handleShare() {
    const message = buildShareMessage(event, inviteUrl);
    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, text: message, url: inviteUrl });
      } catch {
        // User cancelled the native share sheet — not an error.
      }
    } else {
      handleCopyLink();
    }
  }

  return (
    <div className="ch-event-overview">
      <InvitationCanvasEmbed
        event={event}
        config={event.invitationConfig}
        templateConfig={event.template?.config}
        height={620}
      />

      <div className="ch-event-overview__info">
        <dl className="ch-event-overview__meta">
          <div className="ch-event-overview__meta-row">
            <dt>Event type</dt>
            <dd>{getEventTypeLabel(event.eventType)}</dd>
          </div>
          <div className="ch-event-overview__meta-row">
            <dt>Template</dt>
            <dd>{event.template?.name}</dd>
          </div>
          <div className="ch-event-overview__meta-row">
            <dt>Date</dt>
            <dd>{formatDate(event.eventDate)}</dd>
          </div>
          <div className="ch-event-overview__meta-row">
            <dt>Venue</dt>
            <dd>{event.venue?.name || 'Not set'}</dd>
          </div>
          <div className="ch-event-overview__meta-row">
            <dt>Last updated</dt>
            <dd>{new Date(event.updatedAt).toLocaleDateString()}</dd>
          </div>
        </dl>

        {isPublished && (
          <div className="ch-event-overview__link">
            <p className="ch-field__label">Invitation link</p>
            <div className="ch-event-overview__link-row">
              <code>{inviteUrl}</code>
              <Button variant="ghost" size="sm" onClick={handleCopyLink}>
                <FiCopy aria-hidden="true" /> Copy
              </Button>
            </div>
            <div className="ch-event-overview__share-row">
              <Button variant="secondary" size="sm" onClick={handleShare}>
                <FiShare2 aria-hidden="true" /> Share
              </Button>
              <a
                href={buildWhatsAppShareUrl(buildShareMessage(event, inviteUrl))}
                target="_blank"
                rel="noreferrer"
                className="ch-btn ch-btn--secondary ch-btn--sm"
              >
                <FaWhatsapp aria-hidden="true" /> WhatsApp
              </a>
            </div>
          </div>
        )}

        <div className="ch-event-overview__actions">
          <Button variant="primary" onClick={() => navigate(ROUTES.eventBuilder(event.id))}>
            Continue designing
          </Button>
          <Button variant="secondary" onClick={() => navigate(ROUTES.eventSettings(event.id))}>
            <FiEdit3 aria-hidden="true" /> Edit details
          </Button>
          <Button variant="secondary" onClick={() => setIsTemplateModalOpen(true)}>
            Change template
          </Button>
          <Button variant="ghost" isLoading={isDuplicating} onClick={handleDuplicate}>
            <FiCopy aria-hidden="true" /> Duplicate
          </Button>
          <Button variant="ghost" onClick={() => setIsDeleteOpen(true)}>
            <FiTrash2 aria-hidden="true" /> Delete
          </Button>

          {isPublished ? (
            <>
              <a href={inviteUrl} target="_blank" rel="noreferrer" className="ch-btn ch-btn--outline">
                <FiExternalLink aria-hidden="true" /> View invitation
              </a>
              <Button variant="ghost" isLoading={isUnpublishing} onClick={handleUnpublish}>
                <FiEyeOff aria-hidden="true" /> Unpublish
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={openPublishModal}>
              Publish
            </Button>
          )}
        </div>
      </div>

      <DeleteEventModal
        event={event}
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
      <ChangeTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        currentTemplateId={event.template?.id}
        onConfirm={handleChangeTemplate}
        isSaving={isChangingTemplate}
      />
      <PublishModal
        isOpen={isPublishOpen}
        onClose={() => setIsPublishOpen(false)}
        onConfirm={handlePublish}
        isPublishing={isPublishing}
        errors={publishErrors}
      />
    </div>
  );
}
