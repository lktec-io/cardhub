import { FiArrowLeft, FiCheck, FiEye, FiLoader } from 'react-icons/fi';
import { Button } from '../../../../components/ui';

const SAVE_LABEL = {
  idle: 'Save',
  saving: 'Saving...',
  saved: 'Saved',
  error: 'Save failed — Retry',
};

export function BuilderTopBar({ eventTitle, isDirty, saveStatus, onBack, onPreview, onSave }) {
  return (
    <header className="ch-builder-topbar">
      <div className="ch-builder-topbar__left">
        <button type="button" className="ch-builder-topbar__back" onClick={onBack}>
          <FiArrowLeft aria-hidden="true" /> Back
        </button>
        <div className="ch-builder-topbar__title">
          <span className="ch-builder-topbar__brand">CardHub</span>
          <span className="ch-builder-topbar__event">{eventTitle}</span>
        </div>
      </div>

      <div className="ch-builder-topbar__right">
        <span className="ch-builder-topbar__status" aria-live="polite">
          {saveStatus === 'saving' && (
            <>
              <FiLoader className="ch-spin" aria-hidden="true" /> Saving...
            </>
          )}
          {saveStatus === 'saved' && !isDirty && (
            <>
              <FiCheck aria-hidden="true" /> Saved
            </>
          )}
        </span>
        <Button variant="secondary" size="sm" onClick={onPreview}>
          <FiEye aria-hidden="true" /> Preview
        </Button>
        <Button
          variant={saveStatus === 'error' ? 'danger' : 'primary'}
          size="sm"
          isLoading={saveStatus === 'saving'}
          disabled={!isDirty && saveStatus !== 'error'}
          onClick={onSave}
        >
          {SAVE_LABEL[saveStatus] || SAVE_LABEL.idle}
        </Button>
      </div>
    </header>
  );
}
