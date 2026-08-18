import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiSearch } from 'react-icons/fi';
import { Container, SectionHeader, Seo, InvitationPreview, Pagination } from '../../components/common';
import { Modal, Button, EmptyState, Skeleton } from '../../components/ui';
import { TemplateCard, TemplateFilters } from '../../components/templates';
import { useTemplateCatalog } from '../../hooks/useTemplateCatalog';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';
import { formatCardPrice } from '../../constants/pricingTiers';

export function TemplatesPage() {
  const { templates, pagination, status, category, setCategory, search, setSearch, page, setPage, retry } =
    useTemplateCatalog();
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  function handleUseTemplate() {
    setPreviewTemplate(null);
    navigate(isAuthenticated ? ROUTES.DASHBOARD_CREATE_EVENT : ROUTES.REGISTER);
  }

  function handleUseCard(template) {
    navigate(`${ROUTES.TRY}?templateId=${template.id}`);
  }

  return (
    <div className="ch-templates-page">
      <Seo
        title="Templates"
        description="Browse CardHub's digital invitation templates for weddings, birthdays, send-offs, graduations, and more."
      />
      <Container>
        <SectionHeader
          eyebrow="Card Catalogue"
          title="A card for every celebration"
          description="Browse CardHub's digital card catalogue, priced per card. Preview a design, then try the service or build a full invitation."
        />

        <TemplateFilters search={search} onSearchChange={setSearch} category={category} onCategoryChange={setCategory} />

        {status === 'loading' && (
          <div className="ch-templates-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="ch-template-card-skeleton">
                <Skeleton height="140px" radius="var(--radius-md)" />
                <Skeleton height="16px" width="60%" />
                <Skeleton height="22px" width="80%" />
                <Skeleton height="36px" />
              </div>
            ))}
          </div>
        )}

        {status === 'error' && (
          <EmptyState
            icon={<FiAlertCircle />}
            title="Couldn't load templates"
            description="Something went wrong while loading the catalog. Please try again."
            action={
              <Button variant="primary" onClick={retry}>
                Retry
              </Button>
            }
          />
        )}

        {status === 'empty' && (
          <EmptyState icon={<FiSearch />} title="No templates found" description="Try a different search term or category." />
        )}

        {status === 'success' && (
          <>
            <div className="ch-templates-grid">
              {templates.map((template) => (
                <TemplateCard key={template.id} template={template} onPreview={setPreviewTemplate} onUse={handleUseCard} />
              ))}
            </div>
            <Pagination page={page} totalPages={pagination?.totalPages} onChange={setPage} />
          </>
        )}
      </Container>

      <Modal
        isOpen={Boolean(previewTemplate)}
        onClose={() => setPreviewTemplate(null)}
        title={previewTemplate?.name}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPreviewTemplate(null)}>
              Close
            </Button>
            <Button variant="secondary" onClick={() => previewTemplate && handleUseCard(previewTemplate)}>
              Use This Card
            </Button>
            <Button variant="primary" onClick={handleUseTemplate}>
              Build full invitation
            </Button>
          </>
        }
      >
        {previewTemplate && (
          <div className="ch-templates-page__preview">
            <InvitationPreview compact title="Your Names Here" venue={previewTemplate.name} colors={previewTemplate.config?.colors} />
            <p className="ch-body-sm">{previewTemplate.description}</p>
            {typeof previewTemplate.priceTzs === 'number' && (
              <p className="ch-templates-page__preview-price">{formatCardPrice(previewTemplate.priceTzs)}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
