import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import type { Tenant, BookingMode, FontPairId } from '../types';
import Spinner from '../components/shared/Spinner';
import Button from '../components/shared/Button';
import { Input } from '../components/shared/Input';
import CustomDomainPanel from './CustomDomainPanel';
import { FONT_PAIRS } from '../themes/shared/fontPairs';
import ColorPicker from '../components/shared/ColorPicker';

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

        <ColorPicker
          label="Brand color"
          value={form.brand_color}
          onChange={(hex) => setForm((f) => (f ? { ...f, brand_color: hex } : f))}
        />

        <Input
          label="City"
          value={form.city}
          onChange={(e) => setForm((f) => (f ? { ...f, city: e.target.value } : f))}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <GoogleCalendarPanel tenant={tenant} />
        <OutlookCalendarPanel tenant={tenant} />
      </div>
    </div>
  );
}

function GoogleCalendarPanel({ tenant }: { tenant: Tenant }) {
  const [disconnecting, setDisconnecting] = useState(false);
  const queryClient = useQueryClient();
  const api = useApi();
  const connected = !!tenant.google_cal_enabled;
  const params = new URLSearchParams(window.location.search);
  const justConnected = params.get('gcal') === 'connected';

  async function disconnect() {
    setDisconnecting(true);
    try {
      await api.delete('/google-cal/disconnect');
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Google Calendar</h2>
      <p className="text-sm text-slate-500 mb-4">
        Automatically create a calendar event whenever a booking is confirmed.
      </p>
      {justConnected && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-2.5 text-sm text-green-700">
          ✓ Google Calendar connected successfully!
        </div>
      )}
      {connected ? (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-green-700">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            Connected
          </div>
          <button
            type="button"
            onClick={disconnect}
            disabled={disconnecting}
            className="text-sm text-slate-500 underline hover:text-slate-700 disabled:opacity-50"
          >
            {disconnecting ? 'Disconnecting…' : 'Disconnect'}
          </button>
        </div>
      ) : (
        <a
          href="/api/google-cal/connect"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Connect Google Calendar
        </a>
      )}
      <p className="mt-3 text-xs text-slate-400">
        You'll be asked to grant calendar access on Google's sign-in page. We only create events — we never read or delete your calendar.
      </p>
    </div>
  );
}

function OutlookCalendarPanel({ tenant }: { tenant: Tenant }) {
  const [disconnecting, setDisconnecting] = useState(false);
  const queryClient = useQueryClient();
  const api = useApi();
  const connected = !!tenant.outlook_cal_enabled;
  const params = new URLSearchParams(window.location.search);
  const justConnected = params.get('outlook') === 'connected';

  async function disconnect() {
    setDisconnecting(true);
    try {
      await api.delete('/outlook-cal/disconnect');
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Outlook Calendar</h2>
      <p className="text-sm text-slate-500 mb-4">
        Automatically create an Outlook event whenever a booking is confirmed.
      </p>
      {justConnected && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-2.5 text-sm text-green-700">
          ✓ Outlook Calendar connected successfully!
        </div>
      )}
      {connected ? (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-green-700">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            Connected
          </div>
          <button
            type="button"
            onClick={disconnect}
            disabled={disconnecting}
            className="text-sm text-slate-500 underline hover:text-slate-700 disabled:opacity-50"
          >
            {disconnecting ? 'Disconnecting…' : 'Disconnect'}
          </button>
        </div>
      ) : (
        <a
          href="/api/outlook-cal/connect"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
            <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
            <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
            <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
            <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
          </svg>
          Connect Outlook Calendar
        </a>
      )}
      <p className="mt-3 text-xs text-slate-400">
        You'll sign in with your Microsoft account. We only create events — we never read or delete your calendar.
      </p>
    </div>
  );
}
