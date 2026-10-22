import { Button, Modal } from '../../../components/ui';

export function ConfirmDialog({ isOpen, title, children, confirmLabel = 'Delete', onConfirm, onClose, busy = false }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? undefined : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} isLoading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
