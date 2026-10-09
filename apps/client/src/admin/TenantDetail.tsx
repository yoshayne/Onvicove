import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import { useImpersonation } from '../contexts/ImpersonationContext';
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
  const { startImpersonation } = useImpersonation();

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

  const [inviteEmail, setInviteEmail] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ claim_url: string; invite_email: string } | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const inviteMutation = useMutation({
    mutationFn: () => api.post<{ claim_url: string; invite_email: string; expires_at: string }>(`/admin/tenants/${id}/invite`, { invite_email: inviteEmail }),
    onSuccess: (data) => { setInviteResult(data); setShowInviteForm(false); },
  });

  const impersonateMutation = useMutation({
    mutationFn: () => api.post<{ token: string; tenant: { id: string; company_name: string; slug: string } }>(`/admin/tenants/${id}/impersonate`),
    onSuccess: ({ token, tenant }) => {
      startImpersonation({ tenantId: tenant.id, companyName: tenant.company_name, slug: tenant.slug, token });
      window.location.href = '/dashboard';
    },
  });

  function copyInviteLink() {
    if (inviteResult) {
      navigator.clipboard.writeText(inviteResult.claim_url).then(() => {
        setInviteCopied(true);
        setTimeout(() => setInviteCopied(false), 2000);
      });
    }
  }

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
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{tenant.company_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge tone={tenant.is_active ? 'success' : 'danger'}>{tenant.is_active ? 'active' : 'inactive'}</Badge>
              <Badge tone={tenant.stripe_onboarded ? 'success' : 'warning'}>
                {tenant.stripe_onboarded ? 'Stripe ready' : tenant.stripe_account_id ? 'Stripe needs more info' : 'Stripe not connected'}
              </Badge>
              {!(tenant as unknown as { clerk_user_id: string | null }).clerk_user_id && (
                <Badge tone="warning">unclaimed</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={impersonateMutation.isPending}
              onClick={() => impersonateMutation.mutate()}
            >
              {impersonateMutation.isPending ? 'Opening…' : '✏️ Edit site'}
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowInviteForm(true)}>
              📨 Invite client
            </Button>
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

      {/* Invite panel */}
      {(showInviteForm || inviteResult) && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="font-medium text-indigo-900 text-sm">Send client invite</p>
            <button onClick={() => { setShowInviteForm(false); setInviteResult(null); }} className="text-indigo-400 hover:text-indigo-700 text-lg leading-none">&times;</button>
          </div>

          {inviteResult ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-indigo-800">Invite sent to <strong>{inviteResult.invite_email}</strong>. Share this link too:</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={inviteResult.claim_url}
                  className="flex-1 rounded border border-indigo-200 bg-white px-3 py-1.5 text-xs font-mono text-slate-700"
                />
                <Button size="sm" variant="primary" onClick={copyInviteLink}>
                  {inviteCopied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <p className="text-xs text-indigo-600">Link expires in 7 days. You can resend a fresh one anytime.</p>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-indigo-700 mb-1">Client email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <Button
                variant="primary"
                size="sm"
                disabled={!inviteEmail.includes('@') || inviteMutation.isPending}
                onClick={() => inviteMutation.mutate()}
              >
                {inviteMutation.isPending ? 'Sending…' : 'Send invite'}
              </Button>
            </div>
          )}

          {inviteMutation.isError && (
            <p className="text-xs text-red-600">{inviteMutation.error instanceof Error ? inviteMutation.error.message : 'Failed to send invite'}</p>
          )}
        </div>
      )}

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
