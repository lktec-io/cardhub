import { useCallback, useEffect, useMemo, useState } from 'react';
import './builder.css';
import { useNavigate, useParams } from 'react-router-dom';
import { FiAlertCircle } from 'react-icons/fi';
import { Seo } from '../../../../components/common';
import { Button, EmptyState, Spinner } from '../../../../components/ui';
import { eventsService } from '../../../../services/eventsService';
import { invitationService } from '../../../../services/invitationService';
import { useToast } from '../../../../hooks/useToast';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { getErrorMessage } from '../../../../utils/mapValidationErrors';
import { ROUTES } from '../../../../constants/routes';
import { BuilderTopBar } from './BuilderTopBar';
import { BuilderCanvas } from './BuilderCanvas';
import { BuilderSectionsPanel } from './BuilderSectionsPanel';
import { BuilderDesignPanel } from './BuilderDesignPanel';
import { BuilderPreviewOverlay } from './BuilderPreviewOverlay';
import { UnsavedChangesModal } from './UnsavedChangesModal';

export function InvitationBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isMobile = useMediaQuery('(max-width: 960px)');

  const [event, setEvent] = useState(null);
  const [config, setConfig] = useState(null);
  const [savedConfig, setSavedConfig] = useState(null);
  const [status, setStatus] = useState('loading');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('content');

  useEffect(() => {
    let isMounted = true;
    eventsService
      .getOne(id)
      .then((res) => {
        if (!isMounted) return;
        const data = res.data.data.event;
        setEvent(data);
        setConfig(data.invitationConfig);
        setSavedConfig(data.invitationConfig);
        setStatus('success');
      })
      .catch((error) => {
        if (!isMounted) return;
        setStatus(error.response?.status === 404 ? 'not-found' : 'error');
      });
    return () => {
      isMounted = false;
    };
  }, [id]);

  const isDirty = useMemo(() => JSON.stringify(config) !== JSON.stringify(savedConfig), [config, savedConfig]);

  // Native browser warning on tab close/refresh — the one navigation path
  // a custom in-app modal genuinely cannot cover.
  useEffect(() => {
    if (!isDirty) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  function updateSection(sectionId, patch) {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)),
    }));
  }

  function moveSection(sectionId, direction) {
    setConfig((prev) => {
      const ordered = [...prev.sections].sort((a, b) => a.order - b.order);
      const index = ordered.findIndex((s) => s.id === sectionId);
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= ordered.length) return prev;

      const a = ordered[index];
      const b = ordered[swapIndex];
      const sections = prev.sections.map((s) => {
        if (s.id === a.id) return { ...s, order: b.order };
        if (s.id === b.id) return { ...s, order: a.order };
        return s;
      });
      return { ...prev, sections };
    });
  }

  function updateDesign(patch) {
    setConfig((prev) => ({ ...prev, design: { ...prev.design, ...patch } }));
  }

  const handleSave = useCallback(async () => {
    setSaveStatus('saving');
    try {
      const res = await invitationService.updateConfig(id, config);
      const saved = res.data.data.invitation;
      setConfig(saved);
      setSavedConfig(saved);
      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('error');
      toast.error(getErrorMessage(error, 'Could not save your invitation'));
    }
  }, [id, config, toast]);

  function handleBack() {
    if (isDirty) {
      setIsUnsavedModalOpen(true);
    } else {
      navigate(ROUTES.eventDetail(id));
    }
  }

  if (status === 'loading') {
    return (
      <div className="ch-route-loading">
        <Spinner size="lg" label="Loading builder" />
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <EmptyState
        icon={<FiAlertCircle />}
        title="Event not found"
        description="This event doesn't exist or you don't have access to it."
        action={
          <Button variant="primary" onClick={() => navigate(ROUTES.DASHBOARD_EVENTS)}>
            Back to My Events
          </Button>
        }
      />
    );
  }

  if (status === 'error') {
    return (
      <EmptyState
        icon={<FiAlertCircle />}
        title="Couldn't load the builder"
        action={
          <Button variant="primary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <div className="ch-builder">
      <Seo title={`Design — ${event.title}`} />

      <BuilderTopBar
        eventTitle={event.title}
        isDirty={isDirty}
        saveStatus={saveStatus}
        onBack={handleBack}
        onPreview={() => setIsPreviewOpen(true)}
        onSave={handleSave}
      />

      <div className="ch-builder__body">
        {(!isMobile || mobileTab === 'content') && (
          <div className="ch-builder__panel ch-builder__panel--left">
            <BuilderSectionsPanel sections={config.sections} onUpdateSection={updateSection} onMoveSection={moveSection} />
          </div>
        )}

        <div className="ch-builder__canvas-col">
          <BuilderCanvas event={event} config={config} templateConfig={event.template?.config} />
        </div>

        {(!isMobile || mobileTab === 'design') && (
          <div className="ch-builder__panel ch-builder__panel--right">
            <BuilderDesignPanel design={config.design} templateColors={event.template?.config?.colors} onChange={updateDesign} />
          </div>
        )}
      </div>

      {isMobile && (
        <nav className="ch-builder__mobile-tabs" aria-label="Builder controls">
          <button
            type="button"
            className={mobileTab === 'content' ? 'ch-builder__mobile-tab--active' : ''}
            onClick={() => setMobileTab('content')}
          >
            Content
          </button>
          <button
            type="button"
            className={mobileTab === 'design' ? 'ch-builder__mobile-tab--active' : ''}
            onClick={() => setMobileTab('design')}
          >
            Design
          </button>
        </nav>
      )}

      <BuilderPreviewOverlay
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        event={event}
        config={config}
        templateConfig={event.template?.config}
      />

      <UnsavedChangesModal
        isOpen={isUnsavedModalOpen}
        onStay={() => setIsUnsavedModalOpen(false)}
        onLeave={() => navigate(ROUTES.eventDetail(id))}
      />
    </div>
  );
}
