import { useState } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import { Alert, Button, Input, Modal } from '../../../components/ui';
import { getErrorMessage } from '../../../utils/mapValidationErrors';

/**
 * Confirmation for permanent actions. Names exactly what will be removed
 * (`subject`, optional `scope` lines), can require a typed phrase, stays
 * open on failure with the server's reason, and never closes mid-request.
 * `onConfirm(typedPhrase)` must return a promise; the dialog closes only
 * when it resolves.
 */
export function DangerDialog({ isOpen, title, subject, scope = [], warning, blockedReason, confirmPhrase, confirmLabel = 'Delete permanently', onConfirm, onClose }) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const phraseOk = !confirmPhrase || typed.trim() === confirmPhrase;

  function close() {
    if (busy) return;
    setTyped('');
    setError('');
    onClose();
  }

  async function confirm() {
    setBusy(true);
    setError('');
    try {
      await onConfirm(typed.trim());
      setTyped('');
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'This could not be completed. Nothing was changed.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={title}
      size="sm"
      className="ch-danger"
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={busy}>
            Cancel
          </Button>
          {!blockedReason && (
            <Button variant="danger" onClick={confirm} isLoading={busy} disabled={!phraseOk}>
              {confirmLabel}
            </Button>
          )}
        </>
      }
    >
      <div className="ch-danger__body">
        <p className="ch-danger__subject">
          <FiAlertTriangle aria-hidden="true" /> {subject}
        </p>
        {scope.length > 0 && (
          <ul className="ch-danger__scope">
            {scope.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
        {blockedReason ? (
          <Alert variant="warning">{blockedReason}</Alert>
        ) : (
          <p className="ch-danger__warning">{warning || 'This is permanent and cannot be undone.'}</p>
        )}
        {!blockedReason && confirmPhrase && (
          <Input
            label={`Type ${confirmPhrase} to confirm`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={busy}
          />
        )}
        {error && <Alert variant="danger">{error}</Alert>}
      </div>
    </Modal>
  );
}
