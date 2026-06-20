import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import type { Tenant } from '../types';
import Spinner from '../components/shared/Spinner';
import Badge from '../components/shared/Badge';
import Button from '../components/shared/Button';

interface TenantDetailResponse {
  tenant: Tenant;
  counts: {
    products: number;
    services: number;
    orders: number;
    bookings: number;
    customers: number;
  };
}

export default function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const api = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'tenants', id],
    queryFn: () => api.get<TenantDetailResponse>(`/admin/tenants/${id}`),
  });

  const updateMutation = useMutation({
    mutationFn: (updates: { plan?: string; is_active?: boolean }) =>
      api.patch<TenantDetailResponse>(`/admin/tenants/${id}`, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'tenants', id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/admin/tenants/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] });
      navigate('/admin/tenants');
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
        {error instanceof Error ? error.message : 'Failed to load tenant.'}
      </div>
    );
  }

  const { tenant, counts } = data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/admin/tenants" className="text-sm text-slate-500 hover:underline">
          &larr; Back to tenants
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">{tenant.company_name}</h1>
          <div className="flex items-center gap-2">
            <Badge tone={tenant.is_active ? 'success' : 'danger'}>{tenant.is_active ? 'active' : 'inactive'}</Badge>
            <Badge tone={tenant.stripe_onboarded ? 'success' : 'warning'}>
              {tenant.stripe_onboarded ? 'Stripe connected' : 'Stripe not connected'}
            </Badge>
          </div>
        </div>
        <a href={`/${tenant.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 hover:underline">
          /{tenant.slug} &#8599;
        </a>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Object.entries(counts).map(([key, value]) => (
          <div key={key} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm capitalize text-slate-500">{key}</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 text-sm font-medium text-slate-500">Plan</div>
        <div className="flex flex-wrap items-center gap-2">
          {(['starter', 'pro', 'business'] as const).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={tenant.plan === p ? 'primary' : 'secondary'}
              onClick={() => updateMutation.mutate({ plan: p })}
              disabled={updateMutation.isPending}
            >
              {p}
            </Button>
          ))}
        </div>
        {tenant.plan_expires_at && (
          <p className="mt-2 text-xs text-slate-500">
            Expires {new Date(tenant.plan_expires_at).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 text-sm font-medium text-slate-500">Account status</div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={tenant.is_active ? 'danger' : 'primary'}
            size="sm"
            onClick={() => updateMutation.mutate({ is_active: !tenant.is_active })}
            disabled={updateMutation.isPending}
          >
            {tenant.is_active ? 'Suspend account' : 'Reactivate account'}
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (window.confirm(`Permanently delete ${tenant.company_name}? This cannot be undone.`)) {
                deleteMutation.mutate();
              }
            }}
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Delete account'}
          </Button>
        </div>
        {deleteMutation.isError && (
          <p className="mt-2 text-sm text-red-600">
            {deleteMutation.error instanceof Error ? deleteMutation.error.message : 'Delete failed.'}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div><span className="text-slate-400">Industry:</span> {tenant.industry || '—'}</div>
          <div><span className="text-slate-400">City:</span> {tenant.city || '—'}</div>
          <div><span className="text-slate-400">Currency:</span> {tenant.currency}</div>
          <div><span className="text-slate-400">Created:</span> {new Date(tenant.created_at).toLocaleDateString()}</div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <span className="text-slate-400">Custom domain:</span>
            {tenant.custom_domain ? (
              <>
                <a
                  href={`https://${tenant.custom_domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-indigo-600 hover:underline"
                >
                  {tenant.custom_domain}
                </a>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  tenant.custom_domain_verified
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {tenant.custom_domain_verified ? 'verified' : 'pending'}
                </span>
              </>
            ) : (
              <span className="text-slate-400">None</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
