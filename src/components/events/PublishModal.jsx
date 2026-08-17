import { Modal, Button, Alert } from '../ui';

export function PublishModal({ isOpen, onClose, onConfirm, isPublishing = false, errors = [] }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Publish invitation?"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isPublishing}>
            Cancel
          </Button>
          <Button variant="primary" isLoading={isPublishing} onClick={onConfirm}>
            Publish invitation
          </Button>
        </>
      }
    >
      {errors.length > 0 ? (
        <Alert variant="warning" title="This invitation isn't ready yet">
          <ul className="ch-publish-modal__errors">
            {errors.map((err) => (
              <li key={err.field}>{err.message}</li>
            ))}
          </ul>
        </Alert>
      ) : (
        <p className="ch-body-sm">
          Your invitation will become publicly accessible at its link. Anyone with the link will be able to view
          it. You can unpublish it again at any time.
        </p>
      )}
    </Modal>
  );
}
