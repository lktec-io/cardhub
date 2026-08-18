import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertCircle, FiSearch } from 'react-icons/fi';
import { PageHeader, Seo, Pagination } from '../../components/common';
import { Button, Input, Badge, EmptyState, Skeleton } from '../../components/ui';
import { adminService } from '../../services/adminService';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/mapValidationErrors';
import { ROUTES } from '../../constants/routes';

const PAGE_SIZE = 20;

const STATUS_BADGE = { active: 'success', inactive: 'default', suspended: 'danger' };

export function AdminCustomersPage() {
  const toast = useToast();
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [status, setStatus] = useState('loading');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(() => {
    adminService
      .listUsers({ page, limit: PAGE_SIZE, search: search || undefined })
      .then((res) => {
        const data = res.data.data;
        setCustomers(data.users);
        setPagination(data.pagination);
        setStatus(data.users.length === 0 ? 'empty' : 'success');
      })
      .catch(() => setStatus('error'));
  }, [page, search]);

  const [lastKey, setLastKey] = useState(`${page}|${search}`);
  const key = `${page}|${search}`;
  if (key !== lastKey) {
    setLastKey(key);
    setStatus('loading');
  }

  useEffect(() => {
    const timer = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  async function toggleStatus(customer) {
    const nextStatus = customer.status === 'suspended' ? 'active' : 'suspended';
    setUpdatingId(customer.id);
    try {
      await adminService.updateUserStatus(customer.id, nextStatus);
      setCustomers((prev) => prev.map((c) => (c.id === customer.id ? { ...c, status: nextStatus } : c)));
      toast.success(nextStatus === 'suspended' ? 'Customer suspended' : 'Customer reactivated');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update this customer'));
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="ch-admin-page">
      <Seo title="Admin — Customers" />
      <PageHeader eyebrow="CardHub Admin" title="Customers" description="Everyone who has registered a CardHub account." />

      <Input
        icon={<FiSearch aria-hidden="true" />}
        placeholder="Search by name, email, or phone..."
        value={search}
        onChange={(e) => {
          setPage(1);
          setSearch(e.target.value);
        }}
        className="ch-admin-page__search"
      />

      {status === 'loading' && <Skeleton height="320px" radius="var(--radius-lg)" />}

      {status === 'error' && (
        <EmptyState icon={<FiAlertCircle />} title="Couldn't load customers" action={<Button variant="primary" onClick={load}>Retry</Button>} />
      )}

      {status === 'empty' && <EmptyState title="No customers found" />}

      {status === 'success' && (
        <>
          <div className="ch-table-wrap">
            <table className="ch-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Orders</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="ch-table__name">
                      <Link to={ROUTES.adminCustomerDetail(customer.id)}>{customer.name}</Link>
                    </td>
                    <td>{customer.phone || '—'}</td>
                    <td>{customer.email}</td>
                    <td>{customer.orderCount ?? 0}</td>
                    <td>
                      <Badge variant={STATUS_BADGE[customer.status] || 'default'}>{customer.status}</Badge>
                    </td>
                    <td>{new Date(customer.createdAt).toLocaleDateString()}</td>
                    <td>
                      {customer.role !== 'admin' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          isLoading={updatingId === customer.id}
                          onClick={() => toggleStatus(customer)}
                        >
                          {customer.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                        </Button>
                      )}
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
