import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useApi } from '../lib/api';
import Button from '../components/shared/Button';
import Spinner from '../components/shared/Spinner';

interface PreviewResult {
  flyers: { format: string; label: string; url: string }[];
  item_name: string | null;
  emailed_to?: string | null;
  email_error?: string;
}

/** Try the first-sale flyer (and its email) for any store without needing a real sale */
interface SendInfo {
  company: string;
  owner_email: string | null;
  opted_out: boolean;
  first_sale: { type: 'order' | 'booking'; item_name: string | null; at: string } | null;
  existing: { flyers_ready: boolean; emailed_at: string | null } | null;
}

export default function MilestonePreview() {
  const api = useApi();
  const qc = useQueryClient();
  const [tenantId, setTenantId] = useState('');
  const [itemKey, setItemKey] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [variant, setVariant] = useState(0);

  const tenants = useQuery({ queryKey: ['admin', 'tenants', 'all'], queryFn: () => api.get<{ tenants: { id: string; company_name: string }[] }>('/admin/tenants') });
  const itemsQ = useQuery({
    queryKey: ['admin', 'milestone-preview', 'items', tenantId],
    enabled: !!tenantId,
    queryFn: () => api.get<{ items: { id: string; name: string; type: 'order' | 'booking'; has_image: boolean }[] }>(`/admin/milestone-preview/products?tenant_id=${tenantId}`),
  });
  const infoQ = useQuery({
    queryKey: ['admin', 'milestone-send', tenantId],
    enabled: !!tenantId,
    queryFn: () => api.get<SendInfo>(`/admin/milestone-send/info?tenant_id=${tenantId}`),
  });
  const send = useMutation({
    mutationFn: () => api.post<{ emailed_to: string }>('/admin/milestone-send', { tenant_id: tenantId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'milestone-send', tenantId] }),
  });
  const info = infoQ.data;
  const run = useMutation({
    mutationFn: () => {
      const [type, id] = itemKey.split(':');
      return api.post<PreviewResult>('/admin/milestone-preview', { tenant_id: tenantId, item: itemKey ? { type, id } : null, send_email: sendEmail, variant });
    },
  });

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Milestone flyer preview</h1>
        <p className="text-sm text-slate-500">See the "first sale" flyers for any store, and send the test email to yourself. Nothing is recorded against the store.</p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="text-sm font-medium text-slate-700">Store</label>
        <select value={tenantId} onChange={(e) => { setTenantId(e.target.value); setItemKey(''); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Choose a store…</option>
          {(tenants.data?.tenants ?? []).map((t) => <option key={t.id} value={t.id}>{t.company_name}</option>)}
        </select>

        {tenantId && (
          <>
            <label className="text-sm font-medium text-slate-700">What "sold" (a product makes a "first sale" flyer, a service makes a "first booking" flyer)</label>
            <select value={itemKey} onChange={(e) => setItemKey(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Automatic (newest product with a photo, else a service)</option>
              {(itemsQ.data?.items ?? []).map((p) => <option key={p.type + p.id} value={`${p.type}:${p.id}`}>{p.type === 'booking' ? 'Service' : 'Product'}: {p.name}{p.has_image ? '' : ' (no photo)'}</option>)}
            </select>
          </>
        )}

        <label className="text-sm font-medium text-slate-700">Layout</label>
        <select value={variant} onChange={(e) => setVariant(Number(e.target.value))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value={0}>Chosen for this kind of business</option>
          <option value={1}>Redo layout (what the free redo shows)</option>
          <option value={2}>Another layout</option>
          <option value={3}>Another layout</option>
        </select>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} /> Also email the test to me
        </label>
        <div>
          <Button disabled={!tenantId} isLoading={run.isPending} onClick={() => run.mutate()}>Make flyers</Button>
        </div>
        {run.isPending && <p className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> Designing two flyers…</p>}
        {run.isError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{(run.error as Error).message}</p>}
      </div>

      {tenantId && info && (
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-900">Send the first-sale flyer to {info.company}</h2>
          {!info.first_sale ? (
            <p className="text-sm text-slate-500">This store has no paid sale yet, so there is nothing to celebrate.</p>
          ) : (
            <>
              <p className="text-sm text-slate-600">
                First {info.first_sale.type === 'booking' ? 'booking' : 'sale'}{info.first_sale.item_name ? `: ${info.first_sale.item_name}` : ''}, on {new Date(info.first_sale.at).toLocaleDateString()}.
                {' '}Goes to <strong>{info.owner_email ?? 'no email on file'}</strong>.
              </p>
              {info.opted_out && <p className="text-xs text-amber-700">This owner turned milestone emails off. Sending here is a manual exception.</p>}
              {info.existing?.emailed_at && <p className="text-xs text-amber-700">Already emailed on {new Date(info.existing.emailed_at).toLocaleString()}. Sending again will email them a second time.</p>}
              <p className="text-xs text-slate-500">Makes the two flyers if they don't exist yet (about a minute), shows them on the owner's dashboard, and emails "Congratulations on your first {info.first_sale.type === 'booking' ? 'booking' : 'sale'}" with the flyer inside.</p>
              <div>
                <Button isLoading={send.isPending} disabled={!info.owner_email} onClick={() => { if (window.confirm(`Email ${info.owner_email} their first-sale flyer now?`)) send.mutate(); }}>
                  {info.existing?.emailed_at ? 'Send again' : 'Send flyer and email'}
                </Button>
              </div>
            </>
          )}
          {send.isSuccess && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Sent to {send.data.emailed_to}.</p>}
          {send.isError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{(send.error as Error).message}</p>}
        </div>
      )}

      {run.data && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
          {run.data.emailed_to && <p className="text-sm text-emerald-700">Test email sent to {run.data.emailed_to}.</p>}
          {run.data.email_error && <p className="text-sm text-red-700">The email didn't send: {run.data.email_error}</p>}
          <p className="text-xs text-slate-500">Item: {run.data.item_name ?? 'none (brand-only flyer)'}</p>
          <div className="grid grid-cols-2 gap-3">
            {run.data.flyers.map((f) => (
              <div key={f.format} className="flex flex-col gap-2">
                <img src={f.url} alt={f.label} className="w-full rounded-lg border border-slate-200" />
                <a href={f.url} target="_blank" rel="noreferrer" download className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"><Download size={14} /> {f.label}</a>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">Not right? Press "Make flyers" again for a new take.</p>
        </div>
      )}
    </div>
  );
}
