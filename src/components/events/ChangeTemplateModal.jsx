import { useState } from 'react';
import { FiAlertCircle } from 'react-icons/fi';
import { Modal, Button, EmptyState, Skeleton, Alert } from '../ui';
import { TemplateCard, TemplateFilters } from '../templates';
import { useTemplateCatalog } from '../../hooks/useTemplateCatalog';

export function ChangeTemplateModal({ isOpen, onClose, currentTemplateId, onConfirm, isSaving = false }) {
  const { templates, status, category, setCategory, search, setSearch, retry } = useTemplateCatalog({ pageSize: 8 });
  const [pendingTemplate, setPendingTemplate] = useState(null);

  function handleClose() {
    setPendingTemplate(null);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Change template" size="lg">
      {pendingTemplate ? (
        <div className="ch-change-template__confirm">
          <Alert variant="warning" title={`Switch to "${pendingTemplate.name}"?`}>
            Your event details won&rsquo;t change, only the template used for your invitation design.
          </Alert>
          <div className="ch-change-template__confirm-actions">
            <Button variant="ghost" onClick={() => setPendingTemplate(null)} disabled={isSaving}>
              Back
            </Button>
            <Button variant="primary" isLoading={isSaving} onClick={() => onConfirm(pendingTemplate)}>
              Confirm change
            </Button>
          </div>
        </div>
      ) : (
        <>
          <TemplateFilters search={search} onSearchChange={setSearch} category={category} onCategoryChange={setCategory} />

          {status === 'loading' && (
            <div className="ch-change-template__grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} height="220px" radius="var(--radius-lg)" />
              ))}
            </div>
          )}

          {status === 'error' && (
            <EmptyState
              icon={<FiAlertCircle />}
              title="Couldn't load templates"
              action={
                <Button variant="primary" onClick={retry}>
                  Retry
                </Button>
              }
            />
          )}

          {status === 'empty' && <EmptyState title="No templates found" description="Try a different search or category." />}

          {status === 'success' && (
            <div className="ch-change-template__grid">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSelected={template.id === currentTemplateId}
                  onSelect={setPendingTemplate}
                />
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
