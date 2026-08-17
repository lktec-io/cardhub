import { Modal, Button } from '../ui';

export function DeleteEventModal({ event, isOpen, onClose, onConfirm, isDeleting = false }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete this event?"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} isLoading={isDeleting}>
            Delete event
          </Button>
        </>
      }
    >
      <p className="ch-body-sm">
        {event ? (
          <>
            <strong>{event.title}</strong> will be removed from My Events. This action cannot be undone.
          </>
        ) : (
          'This action cannot be undone.'
        )}
      </p>
    </Modal>
  );
}
