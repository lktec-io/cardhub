import { Modal, Button } from '../../../../components/ui';

export function UnsavedChangesModal({ isOpen, onStay, onLeave }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onStay}
      title="You have unsaved changes"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onStay}>
            Stay
          </Button>
          <Button variant="danger" onClick={onLeave}>
            Leave without saving
          </Button>
        </>
      }
    >
      <p className="ch-body-sm">If you leave now, your recent changes to this invitation won&rsquo;t be saved.</p>
    </Modal>
  );
}
