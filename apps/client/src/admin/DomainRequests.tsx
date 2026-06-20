import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, X, Clock, ExternalLink, Globe } from 'lucide-react';
import { useApi } from '../lib/api';
import Spinner from '../components/shared/Spinner';
import Button from '../components/shared/Button';

interface DomainRequest {
  id: string;
  tenant_id: string;
  domain: string;
  tld: string;
  status: 'pending' | 'purchased' | 'rejected' | 'cancelled';
  notes: string | null;
  price_cents: number | null;
  created_at: string;
  company_name: string;
  slug: string;
}

const STATUS_UI = {
  pending: { label: 'Pending', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: Clock },
  purchased: { label: 'Purchased', color: 'text-green-700 bg-green-50 border-green-200', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-700 bg-red-50 border-red-200', icon: X },
  cancelled: { label: 'Cancelled', color: 'text-slate-500 bg-slate-50 border-slate-200', icon: X },
};

function ActionModal({
  request,
  onClose,
  onSubmit,
  isPending,
}: {
  request: DomainRequest;
  onClose: () => void;
  onSubmit: (data: { status: 'purchased' | 'rejected'; notes?: string; price_cents?: number }) => void;
  isPending: boolean;
}) {
  const [action, setAction] = useState<'purchased' | 'rejected'>('purchased');
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Update domain request</h2>
            <p className="text-sm text-slate-500 font-mono mt-0.5">{request.domain}</p>
            <p className="text-xs text-slate-400">{request.company_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAction('purchased')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
              action === 'purchased'
                ? 'bg-green-50 border-green-400 text-green-700'
                : 'border-slate-200 text-slate-500 hover:border-slate-400'
            }`}
          >
            Mark Purchased
          </button>
          <button
            type="button"
            onClick={() => setAction('rejected')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
              action === 'rejected'
                ? 'bg-red-50 border-red-400 text-red-700'
                : 'border-slate-200 text-slate-500 hover:border-slate-400'
            }`}
          >
            Reject
          </button>
        </div>

        {action === 'purchased' && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Price paid (optional)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="12.00"
                className="w-full rounded-lg border border-slate-300 pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">
            {action === 'rejected' ? 'Reason (shown to tenant)' : 'Notes (optional)'}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder={action === 'rejected' ? 'e.g. Domain was unavailable' : 'Internal notes…'}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        {action === 'purchased' && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
            Marking as purchased will automatically activate this domain on the tenant's account and send them a confirmation email.
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            variant={action === 'rejected' ? 'danger' : 'primary'}
            isLoading={isPending}
            onClick={() =>
              onSubmit({
                status: action,
                notes: notes.trim() || undefined,
                price_cents: price ? Math.round(parseFloat(price) * 100) : undefined,
              })
            }
          >
            {action === 'purchased' ? 'Confirm Purchase' : 'Reject Request'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DomainRequests() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<DomainRequest | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'domain-requests'],
    queryFn: () => api.get<{ requests: DomainRequest[] }>('/domain-purchases/admin/pending'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string; status: 'purchased' | 'rejected'; notes?: string; price_cents?: number }) =>
      api.patch(`/domain-purchases/admin/${id}`, body),
    onSuccess: () => {
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'domain-requests'] });
    },
  });

  const requests = data?.requests ?? [];

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Domain Requests</h1>
        <p className="text-sm text-slate-500 mt-1">
          Tenants who want a domain purchased on their behalf. Buy via{' '}
          <a href="https://railway.com/domains" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-0.5">
            railway.com/domains <ExternalLink size={11} />
          </a>{' '}
          then mark as purchased here.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 flex flex-col items-center gap-3 text-slate-400">
          <Globe size={32} className="opacity-30" />
          <p className="text-sm">No pending domain requests</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Domain</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tenant</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Submitted</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((req) => {
                const ui = STATUS_UI[req.status];
                const Icon = ui.icon;
                return (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-slate-800">{req.domain}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700">{req.company_name}</div>
                      <div className="text-xs text-slate-400">/{req.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${ui.color}`}>
                        <Icon size={11} />
                        {ui.label}
                      </span>
                      {req.notes && <p className="text-xs text-slate-400 mt-0.5">{req.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {req.status === 'pending' && (
                        <Button size="sm" variant="secondary" onClick={() => setSelected(req)}>
                          Update
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <ActionModal
          request={selected}
          onClose={() => setSelected(null)}
          isPending={updateMutation.isPending}
          onSubmit={(body) => updateMutation.mutate({ id: selected.id, ...body })}
        />
      )}
    </div>
  );
}
