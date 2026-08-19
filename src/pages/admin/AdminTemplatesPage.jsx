import { useEffect, useState } from 'react';
import { FiAlertCircle } from 'react-icons/fi';
import { PageHeader, Seo, Pagination } from '../../components/common';
import { Button, Badge, Select, EmptyState, Skeleton } from '../../components/ui';
import { adminService } from '../../services/adminService';
import { useToast } from '../../hooks/useToast';
import { useLanguage } from '../../hooks/useLanguage';
import { getErrorMessage } from '../../utils/mapValidationErrors';
import { PRICING_TIER_LIST } from '../../constants/pricingTiers';

const TIER_OPTIONS = PRICING_TIER_LIST.map((tier) => ({ value: tier.id, label: tier.name }));

const PAGE_SIZE = 20;

export function AdminTemplatesPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [status, setStatus] = useState('loading');
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState(null);

  const [lastPage, setLastPage] = useState(page);
  if (lastPage !== page) {
    setLastPage(page);
    if (status !== 'loading') setStatus('loading');
  }

  function fetchTemplates() {
    adminService
      .listTemplates({ page, limit: PAGE_SIZE })
      .then((res) => {
        const data = res.data.data;
        setTemplates(data.templates);
        setPagination(data.pagination);
        setStatus(data.templates.length === 0 ? 'empty' : 'success');
      })
      .catch(() => setStatus('error'));
  }

  function load() {
    setStatus('loading');
    fetchTemplates();
  }

  useEffect(fetchTemplates, [page]);

  async function toggleStatus(template) {
    const nextStatus = template.status === 'active' ? 'inactive' : 'active';
    setUpdatingId(template.id);
    try {
      await adminService.updateTemplateStatus(template.id, nextStatus);
      setTemplates((prev) => prev.map((t) => (t.id === template.id ? { ...t, status: nextStatus } : t)));
      toast.success(nextStatus === 'active' ? t('admin.templates.activated') : t('admin.templates.deactivated'));
    } catch (error) {
      toast.error(getErrorMessage(error, t('admin.templates.updateFailed')));
    } finally {
      setUpdatingId(null);
    }
  }

  async function changeTier(template, pricingTier) {
    setUpdatingId(template.id);
    try {
      const res = await adminService.updateTemplatePricingTier(template.id, pricingTier);
      const updated = res.data.data.template;
      setTemplates((prev) => prev.map((t) => (t.id === template.id ? updated : t)));
      toast.success(t('admin.templates.tierUpdated'));
    } catch (error) {
      toast.error(getErrorMessage(error, t('admin.templates.tierUpdateFailed')));
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="ch-admin-page">
      <Seo title="Admin — Templates" />
      <PageHeader
        eyebrow={t('admin.eyebrow')}
        title={t('admin.templates.title')}
        description={t('admin.templates.description')}
      />

      {status === 'loading' && <Skeleton height="320px" radius="var(--radius-lg)" />}

      {status === 'error' && (
        <EmptyState icon={<FiAlertCircle />} title={t('admin.templates.loadFailed')} action={<Button variant="primary" onClick={load}>{t('dashboardHome.retry')}</Button>} />
      )}

      {status === 'empty' && <EmptyState title={t('admin.templates.empty')} />}

      {status === 'success' && (
        <>
          <div className="ch-table-wrap">
            <table className="ch-table">
              <thead>
                <tr>
                  <th>{t('admin.name')}</th>
                  <th>{t('admin.templates.category')}</th>
                  <th>{t('admin.templates.priceTier')}</th>
                  <th>{t('admin.created')}</th>
                  <th>{t('admin.templates.status')}</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id}>
                    <td className="ch-table__name">{template.name}</td>
                    <td>{t(`category.${template.category}`)}</td>
                    <td>
                      <Select
                        value={template.pricingTier}
                        disabled={updatingId === template.id}
                        options={TIER_OPTIONS}
                        onChange={(e) => changeTier(template, e.target.value)}
                        className="ch-admin-orders__select"
                      />
                    </td>
                    <td>{new Date(template.createdAt).toLocaleDateString()}</td>
                    <td>
                      <Badge variant={template.status === 'active' ? 'success' : 'default'}>
                        {template.status === 'active' ? t('admin.templates.active') : t('admin.templates.inactive')}
                      </Badge>
                    </td>
                    <td>
                      <Button variant="ghost" size="sm" isLoading={updatingId === template.id} onClick={() => toggleStatus(template)}>
                        {template.status === 'active' ? t('admin.templates.deactivate') : t('admin.templates.activate')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={pagination?.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
