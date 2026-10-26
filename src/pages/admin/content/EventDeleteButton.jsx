import { useState } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import { Button } from '../../../components/ui';
import { adminService } from '../../../services/adminService';
import { useToast } from '../../../hooks/useToast';
import { getErrorMessage } from '../../../utils/mapValidationErrors';
import { DangerDialog } from './DangerDialog';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Asks the server what deleting this event would remove (or why it can't), then confirms. */
export function EventDeleteButton({ eventId, title, onDeleted, compact = false }) {
  const toast = useToast();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  async function open() {
    setLoading(true);
    try {
      setPreview((await adminService.eventDeletePreview(eventId)).data.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not check this event.'));
    } finally {
      setLoading(false);
    }
  }

  const scope = preview
    ? [
        preview.scope.ticketTypes && plural(preview.scope.ticketTypes, 'ticket type'),
        preview.scope.guests && plural(preview.scope.guests, 'guest'),
        'its poster file (if no other record uses it)',
      ].filter(Boolean)
    : [];

  return (
    <>
      {compact ? (
        <button type="button" className="ch-tm-icon-btn ch-tm-icon-btn--danger" onClick={open} disabled={loading} aria-label={`Delete ${title}`} title="Delete permanently">
          <FiTrash2 aria-hidden="true" />
        </button>
      ) : (
        <Button variant="ghost" size="sm" leftIcon={<FiTrash2 aria-hidden="true" />} onClick={open} isLoading={loading}>
          Delete event
        </Button>
      )}
      <DangerDialog
        isOpen={Boolean(preview)}
        title="Delete event permanently?"
        subject={`Event #${eventId}: ${title}`}
        scope={preview?.canDelete ? scope : []}
        blockedReason={preview?.blockedReason}
        confirmPhrase={preview?.confirmPhrase}
        onClose={() => setPreview(null)}
        onConfirm={async (confirm) => {
          await adminService.deleteEvent(eventId, confirm);
          toast.success('Event deleted.');
          onDeleted?.();
        }}
      />
    </>
  );
}
