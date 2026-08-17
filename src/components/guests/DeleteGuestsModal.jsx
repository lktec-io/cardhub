import { Modal, Button } from '../ui';

export function DeleteGuestsModal({ isOpen, onClose, onConfirm, isDeleting = false, count = 1 }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={count > 1 ? `Delete ${count} guests?` : 'Delete this guest?'}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} isLoading={isDeleting}>
            Delete {count > 1 ? `${count} guests` : 'guest'}
          </Button>
        </>
      }
    >
      <p className="ch-body-sm">This action cannot be undone.</p>
    </Modal>
  );
}
