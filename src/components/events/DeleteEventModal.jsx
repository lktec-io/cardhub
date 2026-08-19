import { Modal, Button } from '../ui';
import { useLanguage } from '../../hooks/useLanguage';

export function DeleteEventModal({ event, isOpen, onClose, onConfirm, isDeleting = false }) {
  const { t } = useLanguage();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('deleteEvent.title')}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
            {t('deleteEvent.cancel')}
          </Button>
          <Button variant="danger" onClick={onConfirm} isLoading={isDeleting}>
            {t('deleteEvent.confirm')}
          </Button>
        </>
      }
    >
      <p className="ch-body-sm">
        {event ? (
          <>
            <strong>{event.title}</strong> {t('deleteEvent.willBeRemoved')}
          </>
        ) : (
          t('deleteEvent.cannotUndo')
        )}
      </p>
    </Modal>
  );
}
