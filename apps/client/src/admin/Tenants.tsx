import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../lib/api';
import Spinner from '../components/shared/Spinner';
import Badge from '../components/shared/Badge';
import Button from '../components/shared/Button';

interface AdminTenant {
  id: string;
  company_name: string;
  slug: string;
  plan: string;
  plan_expires_at: string | null;
  is_active: boolean;
  stripe_onboarded: boolean;
  stripe_started?: boolean;
  industry: string | null;
  city: string | null;
  created_at: string;
  created_by_admin: boolean;
  unclaimed: boolean;
  pending_invite_email: string | null;
}

export default function Tenants() {
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('');
  const [status, setStatus] = useState('');

  const deleteAllMutation = useMutation({
    mutationFn: () => api.delete('/admin/tenants'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] }),
  });

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (plan) params.set('plan', plan);
  if (status) params.set('status', status);
  const query = params.toString();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'tenants', search, plan, status],
    queryFn: () => api.get<{ tenants: AdminTenant[] }>(`/admin/tenants${query ? `?${query}` : ''}`),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Tenants</h1>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => navigate('/admin/tenants/new')}>
            + New client site
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={deleteAllMutation.isPending || !data?.tenants.length}
            onClick={() => {
              if (window.confirm(`Permanently delete ALL ${data?.tenants.length} tenant accounts? This cannot be undone.`)) {
                deleteAllMutation.mutate();
              }
            }}
          >
            {deleteAllMutation.isPending ? 'Deleting…' : 'Delete all'}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by name or slug"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">All plans</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="business">Business</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : error || !data ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Failed to load tenants.'}
        </div>
      ) : !data.tenants.length ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No tenants found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Stripe</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ownership</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {data.tenants.map((t) => (
                <tr
                  key={t.id}
                  className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                  onClick={() => navigate(`/admin/tenants/${t.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{t.company_name}</span>
                      {t.created_by_admin && (
                        <span className="rounded bg-violet-100 px-1.5 py-0.5 text-xs font-medium text-violet-700">admin-built</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">/{t.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="default">{t.plan}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={t.stripe_onboarded ? 'success' : 'warning'}>
                      {t.stripe_onboarded ? 'ready' : t.stripe_started ? 'needs info' : 'not connected'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={t.is_active ? 'success' : 'danger'}>{t.is_active ? 'active' : 'inactive'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {t.unclaimed ? (
                      <div>
                        <Badge tone="warning">unclaimed</Badge>
                        {t.pending_invite_email && (
                          <div className="mt-0.5 text-xs text-slate-400 truncate max-w-[140px]">{t.pending_invite_email}</div>
                        )}
                      </div>
                    ) : (
                      <Badge tone="success">claimed</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{new Date(t.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
