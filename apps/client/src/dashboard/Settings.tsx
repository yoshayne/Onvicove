import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import type { Tenant, BookingMode } from '../types';
import Spinner from '../components/shared/Spinner';
import Button from '../components/shared/Button';
import { Input } from '../components/shared/Input';

interface SettingsFormState {
  company_name: string;
  tagline: string;
  brand_color: string;
  city: string;
  industry: string;
  timezone: string;
  currency: string;
  custom_domain: string;
  booking_mode: BookingMode;
  show_live_calendar: boolean;
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
    custom_domain: tenant.custom_domain ?? '',
    booking_mode: tenant.booking_mode,
    show_live_calendar: tenant.show_live_calendar,
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
      custom_domain: form.custom_domain || null,
      booking_mode: form.booking_mode,
      show_live_calendar: form.show_live_calendar,
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

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6">
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

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Currency"
            value={form.currency}
            onChange={(e) => setForm((f) => (f ? { ...f, currency: e.target.value.toUpperCase() } : f))}
          />
          <Input
            label="Custom domain"
            value={form.custom_domain}
            onChange={(e) => setForm((f) => (f ? { ...f, custom_domain: e.target.value } : f))}
            placeholder="www.example.com"
          />
        </div>

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

        <div className="flex items-center justify-end gap-3">
          {saved && <span className="text-sm text-green-600">Saved</span>}
          <Button type="submit" isLoading={updateMutation.isPending}>
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}
