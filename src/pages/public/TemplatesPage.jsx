import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiSearch } from 'react-icons/fi';
import { Container, SectionHeader, Seo, Pagination } from '../../components/common';
import { Modal, Button, EmptyState, Skeleton, Alert } from '../../components/ui';
import { TemplateCard, TemplateFilters, TemplateThumb } from '../../components/templates';
import { useTemplateCatalog } from '../../hooks/useTemplateCatalog';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { ROUTES } from '../../constants/routes';
import { formatCardPrice } from '../../constants/pricingTiers';

export function TemplatesPage() {
  const { templates, pagination, status, refreshError, category, setCategory, search, setSearch, page, setPage, retry } =
    useTemplateCatalog();
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();

  function handleUseTemplate() {
    setPreviewTemplate(null);
    navigate(isAuthenticated ? ROUTES.DASHBOARD_CREATE_EVENT : ROUTES.REGISTER);
  }

  function handleUseCard(template) {
    navigate(`${ROUTES.TRY}?templateId=${template.id}`);
  }

  function handleBuyNow(template) {
    setPreviewTemplate(null);
    navigate(`${ROUTES.CHECKOUT}?templateId=${template.id}`);
  }

  return (
    <div className="ch-templates-page">
      <Seo
        title="Templates"
        description="Browse CardHub's digital invitation templates for weddings, birthdays, send-offs, graduations, and more."
      />
      <Container>
        <SectionHeader
          eyebrow={t('catalogue.eyebrow')}
          title={t('catalogue.title')}
          description={t('catalogue.description')}
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
            title={t('catalogue.loadFailedTitle')}
            description={t('catalogue.loadFailedDescription')}
            action={
              <Button variant="primary" onClick={retry}>
                {t('catalogue.retry')}
              </Button>
            }
          />
        )}

        {status === 'empty' && (
          <EmptyState icon={<FiSearch />} title={t('catalogue.empty')} description={t('catalogue.emptyDescription')} />
        )}

        {status === 'success' && (
          <>
            {refreshError && (
              <Alert variant="warning" className="ch-templates-page__refresh-warning">
                {t('catalogue.refreshWarning')}
              </Alert>
            )}
            <div className="ch-templates-grid">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onPreview={setPreviewTemplate}
                  onUse={handleUseCard}
                  onBuy={handleBuyNow}
                />
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
              {t('catalogue.close')}
            </Button>
            <Button variant="secondary" onClick={() => previewTemplate && handleUseCard(previewTemplate)}>
              {t('catalogue.useThisCard')}
            </Button>
            <Button variant="secondary" onClick={() => previewTemplate && handleBuyNow(previewTemplate)}>
              {t('catalogue.buyNow')}
            </Button>
            <Button variant="primary" onClick={handleUseTemplate}>
              {t('catalogue.buildFullInvitation')}
            </Button>
          </>
        }
      >
        {previewTemplate && (
          <div className="ch-templates-page__preview">
            <TemplateThumb template={previewTemplate} className="ch-templates-page__preview-thumb" />
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
