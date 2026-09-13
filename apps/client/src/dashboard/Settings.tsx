import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import type { Tenant, BookingMode, FontPairId } from '../types';
import Spinner from '../components/shared/Spinner';
import Button from '../components/shared/Button';
import { Input } from '../components/shared/Input';
import CustomDomainPanel from './CustomDomainPanel';
import { FONT_PAIRS } from '../themes/shared/fontPairs';

interface SettingsFormState {
  company_name: string;
  tagline: string;
  brand_color: string;
  city: string;
  industry: string;
  timezone: string;
  currency: string;
  booking_mode: BookingMode;
  show_live_calendar: boolean;
  font_pair_id: FontPairId;
}

function tenantToForm(tenant: Tenant): SettingsFormState {
  return {
    company_name: tenant.company_name,
    tagline: tenant.tagline ?? '',
    brand_color: tenant.brand_color ?? '#000000',
    city: tenant.city ?? '',
    industry: tenant.industry ?? '',
    timezone: tenant.timezone,
    currency: tenant.currency,
    booking_mode: tenant.booking_mode,
    show_live_calendar: tenant.show_live_calendar,
    font_pair_id: (tenant.font_pair_id as FontPairId) ?? 'classic',
  };
}

export default function Settings() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SettingsFormState | null>(null);
  const [saved, setSaved] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => api.get<{ tenant: Tenant }>('/tenants/me'),
  });

  useEffect(() => {
    if (data?.tenant && !form) {
      setForm(tenantToForm(data.tenant));
    }
  }, [data, form]);

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.patch<{ tenant: Tenant }>('/tenants/me', body),
    onSuccess: (res) => {
      queryClient.setQueryData(['tenant', 'me'], res);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    updateMutation.mutate({
      company_name: form.company_name,
      tagline: form.tagline || null,
      brand_color: form.brand_color,
      city: form.city || null,
      industry: form.industry || null,
      timezone: form.timezone,
      currency: form.currency,
      booking_mode: form.booking_mode,
      show_live_calendar: form.show_live_calendar,
      font_pair_id: form.font_pair_id,
    });
  }

  if (isLoading || !form) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Failed to load settings.</div>;
  }

  const tenant = data!.tenant;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6">
        <Input
          label="Company name"
          value={form.company_name}
          onChange={(e) => setForm((f) => (f ? { ...f, company_name: e.target.value } : f))}
          required
        />
        <Input
          label="Tagline"
          value={form.tagline}
          onChange={(e) => setForm((f) => (f ? { ...f, tagline: e.target.value } : f))}
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Brand color</label>
            <input
              type="color"
              value={form.brand_color}
              onChange={(e) => setForm((f) => (f ? { ...f, brand_color: e.target.value } : f))}
              className="h-10 w-full rounded-lg border border-slate-300"
            />
          </div>
          <Input
            label="City"
            value={form.city}
            onChange={(e) => setForm((f) => (f ? { ...f, city: e.target.value } : f))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Industry"
            value={form.industry}
            onChange={(e) => setForm((f) => (f ? { ...f, industry: e.target.value } : f))}
          />
          <Input
            label="Timezone"
            value={form.timezone}
            onChange={(e) => setForm((f) => (f ? { ...f, timezone: e.target.value } : f))}
          />
        </div>

        <Input
          label="Currency"
          value={form.currency}
          onChange={(e) => setForm((f) => (f ? { ...f, currency: e.target.value.toUpperCase() } : f))}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Booking mode</label>
          <select
            value={form.booking_mode}
            onChange={(e) => setForm((f) => (f ? { ...f, booking_mode: e.target.value as BookingMode } : f))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="instant">Instant confirmation</option>
            <option value="manual">Manual approval</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.show_live_calendar}
            onChange={(e) => setForm((f) => (f ? { ...f, show_live_calendar: e.target.checked } : f))}
          />
          Show live calendar availability on storefront
        </label>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700">Typography</label>
          <p className="text-xs text-slate-500">Heading &amp; body font pairing shown on your storefront.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {FONT_PAIRS.map((pair) => (
              <button
                key={pair.id}
                type="button"
                onClick={() => setForm((f) => (f ? { ...f, font_pair_id: pair.id as FontPairId } : f))}
                className={`flex flex-col gap-1 rounded-lg border p-2.5 text-left transition ${
                  form.font_pair_id === pair.id
                    ? 'border-slate-900 ring-1 ring-slate-900 bg-slate-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-sm font-semibold leading-none text-slate-900" style={{ fontFamily: pair.heading }}>
                  {pair.previewHeading}
                </span>
                <span className="text-[11px] text-slate-500 leading-none" style={{ fontFamily: pair.body }}>
                  {pair.previewBody}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">{pair.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          {saved && <span className="text-sm text-green-600">Saved</span>}
          <Button type="submit" isLoading={updateMutation.isPending}>
            Save changes
          </Button>
        </div>
      </form>

      <CustomDomainPanel tenant={tenant} />
    </div>
  );
}
