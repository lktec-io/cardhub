import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiAlertCircle, FiSearch } from 'react-icons/fi';
import { Container, SectionHeader, Seo, Pagination } from '../../components/common';
import { Button, EmptyState, Skeleton, Alert } from '../../components/ui';
import { CardLightbox, TemplateCard, TemplateFilters } from '../../components/templates';
import { useTemplateCatalog } from '../../hooks/useTemplateCatalog';
import { useCardActions } from '../../hooks/useCardActions';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useToast } from '../../hooks/useToast';
import { templatesService } from '../../services/templatesService';
import { ROUTES } from '../../constants/routes';

export function TemplatesPage() {
  const { templates, pagination, status, refreshError, category, setCategory, search, setSearch, page, setPage, retry } =
    useTemplateCatalog();
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const { share, download } = useCardActions();
  const sharedCardId = searchParams.get('card');

  // A shared card link (/templates?card=<id>) opens that card's preview directly.
  useEffect(() => {
    if (!sharedCardId || !/^\d+$/.test(sharedCardId)) return undefined;
    // Opened from this page's own grid: already have it, no fetch needed.
    if (previewTemplate && String(previewTemplate.id) === sharedCardId) return undefined;
    let active = true;
    templatesService
      .getOne(sharedCardId)
      .then((res) => active && setPreviewTemplate(res.data.data.template))
      .catch(() => {
        if (!active) return;
        toast.error(t('catalogue.cardNotFound'));
        setSearchParams((current) => {
          const next = new URLSearchParams(current);
          next.delete('card');
          return next;
        }, { replace: true });
      });
    return () => {
      active = false;
    };
    // Only react to the link itself changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedCardId]);

  const openPreview = useCallback(
    (template) => {
      setPreviewTemplate(template);
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set('card', String(template.id));
        return next;
      }, { replace: true });
    },
    [setSearchParams]
  );

  const closePreview = useCallback(() => {
    setPreviewTemplate(null);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('card');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

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
                  onPreview={openPreview}
                  onShare={share}
                  onDownload={download}
                  onBuy={handleBuyNow}
                />
              ))}
            </div>
            <Pagination page={page} totalPages={pagination?.totalPages} onChange={setPage} />
          </>
        )}
      </Container>

      <CardLightbox
        template={previewTemplate}
        onClose={closePreview}
        onShare={share}
        onDownload={download}
        actions={
          previewTemplate && (
            <>
              <Button variant="secondary" size="sm" onClick={() => handleUseCard(previewTemplate)}>
                {t('catalogue.useThisCard')}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleUseTemplate}>
                {t('catalogue.buildFullInvitation')}
              </Button>
              <Button variant="primary" size="sm" onClick={() => handleBuyNow(previewTemplate)}>
                {t('catalogue.buyNow')}
              </Button>
            </>
          )
        }
      />
    </div>
  );
}
