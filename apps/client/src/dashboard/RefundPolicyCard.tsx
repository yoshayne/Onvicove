import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import type { Tenant } from '../types';
import Button from '../components/shared/Button';
import { refundTemplate } from './refundTemplates';

const MAX = 5000;

/** The store's own refund policy: shown at <your site>/refund-policy, linked under every page of the site and in the monthly-plan terms */
export default function RefundPolicyCard({ tenant }: { tenant: Tenant }) {
  const api = useApi();
  const queryClient = useQueryClient();
  const saved = tenant.page_content?.['refund.policy'] ?? '';
  const [text, setText] = useState(saved);
  const [justSaved, setJustSaved] = useState(false);

  const save = useMutation({
    mutationFn: (value: string) => api.put('/tenants/me/page-content', { 'refund.policy': value }),
    onSuccess: () => {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
      queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] });
    },
  });

  const url = `${window.location.origin}/${tenant.slug}/refund-policy`;
  const dirty = text.trim() !== saved.trim();

  function fillTemplate() {
    if (text.trim() && !confirm('Replace what you have written with the starter template?')) return;
    setText(refundTemplate({
      company: tenant.company_name,
      sells: tenant.mode !== 'book',
      books: tenant.mode !== 'store',
      cancelHours: tenant.cancel_window_hours ?? 24,
    }));
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Refund policy</h2>
        <p className="mt-1 text-sm text-slate-500">
          What customers can expect if they need a refund or want to cancel. It appears as a "Refund policy" link at the bottom of your site, and it's the policy referred to in the monthly-plan terms your customers agree to.
        </p>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX))}
        rows={10}
        placeholder="e.g. Appointments can be cancelled up to 24 hours before for a full refund of your deposit…"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <button type="button" onClick={fillTemplate} className="font-semibold text-violet-600 hover:text-violet-700">Use a starter template</button>
          <span>{text.length}/{MAX}</span>
          {saved.trim() && <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-violet-600 hover:text-violet-700">View your page</a>}
        </div>
        <div className="flex items-center gap-3">
          {justSaved && <span className="text-sm text-green-600">Saved</span>}
          <Button type="button" onClick={() => save.mutate(text.trim())} isLoading={save.isPending} disabled={!dirty}>
            Save refund policy
          </Button>
        </div>
      </div>
      <p className="text-xs text-slate-400">The starter template is a plain-language starting point, not legal advice. Edit it to match what you really do. Leave the box empty to show no policy link.</p>
      {save.isError && <p className="text-xs text-red-600">{(save.error as Error).message}</p>}
    </div>
  );
}
