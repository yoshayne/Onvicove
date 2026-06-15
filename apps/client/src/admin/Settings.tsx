import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import Spinner from '../components/shared/Spinner';
import Button from '../components/shared/Button';

interface PlanConfig {
  name: string;
  price_cents: number;
  item_limit: number | null;
  ai_credits: number;
}

interface PlatformSettings {
  plans: Record<'starter' | 'pro' | 'business', PlanConfig>;
  ai_photo_cost_cents: number;
  platform_fee_percent: number;
  platform_fee_fixed_cents: number;
}

const PLAN_IDS: (keyof PlatformSettings['plans'])[] = ['starter', 'pro', 'business'];

export default function Settings() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PlatformSettings | null>(null);
  const [saved, setSaved] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => api.get<{ settings: PlatformSettings }>('/admin/settings'),
  });

  useEffect(() => {
    if (data && !form) setForm(data.settings);
  }, [data, form]);

  const saveMutation = useMutation({
    mutationFn: (settings: PlatformSettings) => api.put<{ settings: PlatformSettings }>('/admin/settings', settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (isLoading || !form) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
        {error instanceof Error ? error.message : 'Failed to load settings.'}
      </div>
    );
  }

  function updatePlan(planId: keyof PlatformSettings['plans'], key: keyof PlanConfig, value: string) {
    setForm((prev) => {
      if (!prev) return prev;
      const plan = { ...prev.plans[planId] };
      if (key === 'name') {
        plan.name = value;
      } else if (key === 'item_limit') {
        plan.item_limit = value === '' ? null : parseInt(value, 10);
      } else {
        (plan as unknown as Record<string, number>)[key] = parseInt(value, 10) || 0;
      }
      return { ...prev, plans: { ...prev.plans, [planId]: plan } };
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Display name</th>
              <th className="px-4 py-3 font-medium">Price (USD/mo)</th>
              <th className="px-4 py-3 font-medium">Item limit</th>
              <th className="px-4 py-3 font-medium">AI photo credits / mo</th>
            </tr>
          </thead>
          <tbody>
            {PLAN_IDS.map((planId) => {
              const plan = form.plans[planId];
              return (
                <tr key={planId} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium capitalize text-slate-900">{planId}</td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={plan.name}
                      onChange={(e) => updatePlan(planId, 'name', e.target.value)}
                      className="w-32 rounded-lg border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.01"
                      value={(plan.price_cents / 100).toString()}
                      onChange={(e) => updatePlan(planId, 'price_cents', String(Math.round(parseFloat(e.target.value || '0') * 100)))}
                      className="w-24 rounded-lg border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder="Unlimited"
                      value={plan.item_limit ?? ''}
                      onChange={(e) => updatePlan(planId, 'item_limit', e.target.value)}
                      className="w-28 rounded-lg border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={plan.ai_credits}
                      onChange={(e) => updatePlan(planId, 'ai_credits', e.target.value)}
                      className="w-24 rounded-lg border border-slate-300 px-2 py-1"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">AI photo generation price (USD)</label>
          <input
            type="number"
            step="0.01"
            value={(form.ai_photo_cost_cents / 100).toString()}
            onChange={(e) =>
              setForm((prev) => prev && { ...prev, ai_photo_cost_cents: Math.round(parseFloat(e.target.value || '0') * 100) })
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Platform fee (%)</label>
          <input
            type="number"
            step="0.001"
            value={(form.platform_fee_percent * 100).toString()}
            onChange={(e) =>
              setForm((prev) => prev && { ...prev, platform_fee_percent: parseFloat(e.target.value || '0') / 100 })
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Platform fee fixed (USD)</label>
          <input
            type="number"
            step="0.01"
            value={(form.platform_fee_fixed_cents / 100).toString()}
            onChange={(e) =>
              setForm((prev) => prev && { ...prev, platform_fee_fixed_cents: Math.round(parseFloat(e.target.value || '0') * 100) })
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving…' : 'Save settings'}
        </Button>
        {saved && <span className="text-sm text-green-600">Saved</span>}
        {saveMutation.isError && <span className="text-sm text-red-600">Failed to save</span>}
      </div>
    </div>
  );
}
