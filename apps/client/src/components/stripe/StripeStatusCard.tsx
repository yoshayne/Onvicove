import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useApi } from '../../lib/api';
import StripeSetupModal from './StripeSetupModal';

export interface StripeAccountStatus {
  connected: boolean;
  onboarded: boolean;
  status?: 'ready' | 'needs_info' | 'verifying' | 'under_review';
  message?: string;
  items?: { label: string; overdue: boolean }[];
  deadline?: string | null;
}

export function useStripeStatus() {
  const api = useApi();
  return useQuery({
    queryKey: ['stripe', 'account-status'],
    queryFn: () => api.get<StripeAccountStatus>('/stripe/account-status'),
    staleTime: 60_000,
    retry: false,
  });
}

/**
 * Payment-setup status in plain words: not started -> "Get paid" with the setup pop-up; started but incomplete ->
 * exactly what Stripe still needs and a button that goes straight back; checking / under review -> what to expect.
 * Renders nothing once payments are ready.
 */
export default function StripeStatusCard({ showWhenReady = false }: { showWhenReady?: boolean }) {
  const api = useApi();
  const { data, isLoading } = useStripeStatus();
  const [open, setOpen] = useState(false);

  const resume = useMutation({
    mutationFn: () => api.post<{ url: string }>('/stripe/connect-link', {}),
    onSuccess: (res) => {
      window.location.href = res.url;
    },
  });

  if (isLoading || !data) return null;

  if (data.status === 'ready' || (data.onboarded && !data.status)) {
    return showWhenReady ? (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">You're all set to get paid.</div>
    ) : null;
  }

  if (!data.connected) {
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div>
            <p className="text-sm font-semibold text-blue-900">Next step: get paid</p>
            <p className="text-sm text-blue-800">Set up payments so customers can buy and book. It takes about 5 minutes.</p>
          </div>
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">
            Set up payments
          </button>
        </div>
        <StripeSetupModal open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  if (data.status === 'verifying') {
    return <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">{data.message}</div>;
  }

  if (data.status === 'under_review') {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{data.message}</div>;
  }

  const overdue = (data.items ?? []).some((i) => i.overdue);
  return (
    <div className={`rounded-xl border p-4 ${overdue ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
      <p className={`text-sm font-semibold ${overdue ? 'text-red-900' : 'text-amber-900'}`}>
        {overdue ? 'Payments are paused' : 'Almost there'}
      </p>
      <p className={`mt-1 text-sm ${overdue ? 'text-red-800' : 'text-amber-800'}`}>{data.message}</p>
      {(data.items ?? []).length > 0 && (
        <ul className={`mt-2 list-disc pl-5 text-sm ${overdue ? 'text-red-900' : 'text-amber-900'}`}>
          {data.items!.map((i) => (
            <li key={i.label}>
              {i.label}
              {i.overdue && <span className="ml-2 rounded bg-red-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-900">overdue</span>}
            </li>
          ))}
        </ul>
      )}
      {data.deadline && (
        <p className="mt-2 text-xs text-slate-600">Stripe's deadline: {new Date(data.deadline).toLocaleDateString()}</p>
      )}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={resume.isPending}
          onClick={() => resume.mutate()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
        >
          {resume.isPending ? 'Opening Stripe…' : 'Finish on Stripe (about 2 minutes)'}
        </button>
        <span className="text-xs text-slate-500">Stripe remembers what you already entered.</span>
      </div>
      {resume.isError && <p className="mt-2 text-sm text-red-600">{(resume.error as Error).message}</p>}
    </div>
  );
}
