import { useEffect } from 'react';
import { FiAlertCircle, FiSearch } from 'react-icons/fi';
import { EmptyState, Button, Skeleton } from '../../../../components/ui';
import { Pagination } from '../../../../components/common';
import { TemplateCard, TemplateFilters } from '../../../../components/templates';
import { useTemplateCatalog } from '../../../../hooks/useTemplateCatalog';

export function TemplateStep({ eventType, selectedTemplateId, onSelect }) {
  const { templates, pagination, status, category, setCategory, search, setSearch, page, setPage, retry } =
    useTemplateCatalog({ pageSize: 8 });

  useEffect(() => {
    if (eventType) setCategory(eventType === 'send_off' || eventType === 'other' ? '' : eventType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h2 className="ch-h3">Choose a template</h2>
      <p className="ch-body-sm ch-wizard__intro">Pick the design you'd like your invitation to start from.</p>

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

      {status === 'empty' && (
        <EmptyState icon={<FiSearch />} title="No templates found" description="Try a different search or category." />
      )}

      {status === 'success' && (
        <>
          <div className="ch-change-template__grid">
            {templates.map((template) => (
              <TemplateCard key={template.id} template={template} isSelected={selectedTemplateId === template.id} onSelect={onSelect} />
            ))}
          </div>
          <Pagination page={page} totalPages={pagination?.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
