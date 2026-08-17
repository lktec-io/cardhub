import { useState } from 'react';
import { Modal, Button, Textarea, Alert } from '../ui';
import { getErrorMessage } from '../../utils/mapValidationErrors';

const MAX_ROWS = 500;

/** Simple comma-separated parser: name,phone,email — one guest per line.
 * A header row is detected and skipped if its first cell reads "name".
 * This is intentionally lightweight (no quoted-comma/escaping support) —
 * documented as a Phase 6 scope decision, not a full CSV parser. */
function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const firstCols = lines[0].split(',').map((c) => c.trim().toLowerCase());
  const hasHeader = firstCols[0] === 'name';
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.slice(0, MAX_ROWS).map((line) => {
    const [name = '', phone = '', email = ''] = line.split(',').map((c) => c.trim());
    return { name, phone: phone || undefined, email: email || undefined };
  });
}

export function BulkImportModal({ isOpen, onClose, onImported }) {
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  function handleClose() {
    setCsvText('');
    setPreview(null);
    setResult(null);
    setError(null);
    onClose();
  }

  function handleParse() {
    const rows = parseCsv(csvText).filter((r) => r.name);
    if (rows.length === 0) {
      setError('No valid rows found. Each line should be: name,phone,email');
      return;
    }
    setError(null);
    setPreview(rows);
  }

  async function handleConfirm() {
    setIsImporting(true);
    setError(null);
    try {
      const res = await onImported(preview);
      setResult(res);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not import guests'));
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import guests from CSV" size="md">
      {error && <Alert variant="danger" className="ch-auth-form__alert">{error}</Alert>}

      {result ? (
        <div className="ch-bulk-import__result">
          <Alert variant="success" title="Import complete">
            {result.imported} guest{result.imported === 1 ? '' : 's'} imported.
            {result.skipped > 0 && ` ${result.skipped} skipped (already existed).`}
            {result.invalid?.length > 0 && ` ${result.invalid.length} row(s) had errors and were not imported.`}
          </Alert>
          <Button variant="primary" onClick={handleClose}>
            Done
          </Button>
        </div>
      ) : preview ? (
        <div className="ch-bulk-import__preview">
          <p className="ch-body-sm">{preview.length} guest(s) ready to import:</p>
          <div className="ch-bulk-import__table-wrap">
            <table className="ch-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 50).map((row, i) => (
                  <tr key={i}>
                    <td>{row.name}</td>
                    <td>{row.phone || '—'}</td>
                    <td>{row.email || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.length > 50 && <p className="ch-caption">Showing first 50 of {preview.length} rows.</p>}
          <div className="ch-bulk-import__actions">
            <Button variant="ghost" onClick={() => setPreview(null)} disabled={isImporting}>
              Back
            </Button>
            <Button variant="primary" isLoading={isImporting} onClick={handleConfirm}>
              Confirm import
            </Button>
          </div>
        </div>
      ) : (
        <div className="ch-bulk-import__input">
          <Textarea
            label="Paste guest list"
            hint="One guest per line: name,phone,email — phone and email are optional."
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={'Leonard Mushi,0700000000,leonard@example.com\nNeema Kway,0711111111,'}
            rows={8}
          />
          <Button variant="primary" onClick={handleParse} disabled={!csvText.trim()}>
            Preview import
          </Button>
        </div>
      )}
    </Modal>
  );
}
