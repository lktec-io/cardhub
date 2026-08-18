import { useEffect, useState } from 'react';
import { FiAlertCircle } from 'react-icons/fi';
import { PageHeader, Seo, Pagination } from '../../components/common';
import { Button, Badge, Select, EmptyState, Skeleton } from '../../components/ui';
import { adminService } from '../../services/adminService';
import { useToast } from '../../hooks/useToast';
import { getCategoryLabel } from '../../constants/templateCategories';
import { getErrorMessage } from '../../utils/mapValidationErrors';
import { PRICING_TIER_LIST } from '../../constants/pricingTiers';

const TIER_OPTIONS = PRICING_TIER_LIST.map((tier) => ({ value: tier.id, label: tier.name }));

const PAGE_SIZE = 20;

export function AdminTemplatesPage() {
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
      toast.success(nextStatus === 'active' ? 'Template activated' : 'Template deactivated');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update this template'));
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
      toast.success('Pricing tier updated');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update the pricing tier'));
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="ch-admin-page">
      <Seo title="Admin — Templates" />
      <PageHeader
        eyebrow="CardHub Admin"
        title="Cards / Templates"
        description="Deactivating a card removes it from the public catalogue — existing events keep working. Creating a brand-new card design and editing name/description/config are deferred to Phase 2; the pricing tier is editable here today."
      />

      {status === 'loading' && <Skeleton height="320px" radius="var(--radius-lg)" />}

      {status === 'error' && (
        <EmptyState icon={<FiAlertCircle />} title="Couldn't load templates" action={<Button variant="primary" onClick={load}>Retry</Button>} />
      )}

      {status === 'empty' && <EmptyState title="No templates found" />}

      {status === 'success' && (
        <>
          <div className="ch-table-wrap">
            <table className="ch-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price tier</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id}>
                    <td className="ch-table__name">{template.name}</td>
                    <td>{getCategoryLabel(template.category)}</td>
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
                      <Badge variant={template.status === 'active' ? 'success' : 'default'}>{template.status}</Badge>
                    </td>
                    <td>
                      <Button variant="ghost" size="sm" isLoading={updatingId === template.id} onClick={() => toggleStatus(template)}>
                        {template.status === 'active' ? 'Deactivate' : 'Activate'}
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
