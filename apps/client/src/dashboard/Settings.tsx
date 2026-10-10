import { useEffect, useState, useRef, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import type { Tenant, BookingMode, FontPairId, WeeklyAvailability } from '../types';
import WeeklyHoursEditor from '../components/shared/WeeklyHoursEditor';
import { describeHours, hasAnyHours, withAllDays, WEEKDAY_9_TO_5 } from '../lib/hours';
import Spinner from '../components/shared/Spinner';
import Button from '../components/shared/Button';
import { Input } from '../components/shared/Input';
import CustomDomainPanel from './CustomDomainPanel';
import { FONT_PAIRS } from '../themes/shared/fontPairs';
import ColorPicker from '../components/shared/ColorPicker';

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

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
  booking_notice_minutes: number;
  cancel_window_hours: number;
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
    booking_notice_minutes: tenant.booking_notice_minutes ?? 60,
    cancel_window_hours: tenant.cancel_window_hours ?? 24,
    font_pair_id: (tenant.font_pair_id as FontPairId) ?? 'classic',
  };
}

// Weekly hours bookings are taken against when there is no staff member, or a staff member sets none.
function BookingHoursCard({ tenant }: { tenant: Tenant }) {
  const api = useApi();
  const queryClient = useQueryClient();
  const [hours, setHours] = useState<WeeklyAvailability | null>(null);
  const [saved, setSaved] = useState(false);

  const { data } = useQuery({
    queryKey: ['booking-hours', tenant.id, tenant.business_hours ? 'saved' : 'derived'],
    queryFn: () => api.get<{ availability: Partial<WeeklyAvailability>; source: 'business' | 'text' | 'none' }>('/tenants/me/booking-hours'),
  });

  useEffect(() => {
    if (data && !hours) setHours(withAllDays(data.availability));
  }, [data, hours]);

  const save = useMutation({
    mutationFn: (next: WeeklyAvailability | null) => api.patch('/tenants/me', { business_hours: next }),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['booking-hours'] });
    },
  });

  if (!hours) return null;
  const noHours = !hasAnyHours(hours);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Booking hours</h2>
        <p className="mt-1 text-sm text-slate-500">
          When customers can book. This applies to your whole business — and to any staff member who hasn't set hours of their own.
        </p>
      </div>

      {data?.source === 'text' && (
        <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
          We filled these in from the Business hours text on your page ({describeHours(hours) || 'your text'}). Click <strong>Save booking hours</strong> to make them official.
        </div>
      )}
      {noHours && data?.source === 'none' && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          No booking hours are set, so customers can't book yet.
          <button type="button" onClick={() => setHours(withAllDays(WEEKDAY_9_TO_5))} className="ml-2 font-semibold underline">Start with Mon–Fri 9am–5pm</button>
        </div>
      )}

      <WeeklyHoursEditor value={hours} onChange={setHours} />

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-green-600">Saved</span>}
        <Button type="button" onClick={() => save.mutate(hasAnyHours(hours) ? hours : null)} isLoading={save.isPending}>
          Save booking hours
        </Button>
      </div>
      {save.isError && <p className="text-xs text-red-600">{(save.error as Error).message}</p>}
    </div>
  );
}

export default function Settings() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SettingsFormState | null>(null);
  const [saved, setSaved] = useState(false);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const slugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => api.get<{ tenant: Tenant }>('/tenants/me'),
  });

  const tenant = data?.tenant;

  useEffect(() => {
    if (tenant && !form) {
      setForm(tenantToForm(tenant));
    }
  }, [tenant, form]);

  // When company name changes, compute a slug and check availability
  function handleNameChange(name: string) {
    setForm((f) => (f ? { ...f, company_name: name } : f));
    if (!tenant) return;
    const newSlug = toSlug(name);
    if (newSlug === tenant.slug) {
      setPendingSlug(null);
      setSlugAvailable(null);
      return;
    }
    setPendingSlug(newSlug);
    setSlugAvailable(null);
    if (slugTimer.current) clearTimeout(slugTimer.current);
    if (!newSlug) return;
    slugTimer.current = setTimeout(async () => {
      setSlugChecking(true);
      try {
        const res = await api.get<{ available: boolean }>(`/tenants/slug-available?slug=${encodeURIComponent(newSlug)}`);
        setSlugAvailable(res.available);
      } catch {
        setSlugAvailable(null);
      } finally {
        setSlugChecking(false);
      }
    }, 500);
  }

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.patch<{ tenant: Tenant }>('/tenants/me', body),
    onSuccess: (res) => {
      queryClient.setQueryData(['tenant', 'me'], res);
      setPendingSlug(null);
      setSlugAvailable(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    const body: Record<string, unknown> = {
      company_name: form.company_name,
      tagline: form.tagline || null,
      brand_color: form.brand_color,
      city: form.city || null,
      industry: form.industry || null,
      timezone: form.timezone,
      currency: form.currency,
      booking_mode: form.booking_mode,
      show_live_calendar: form.show_live_calendar,
      booking_notice_minutes: form.booking_notice_minutes,
      cancel_window_hours: form.cancel_window_hours,
      font_pair_id: form.font_pair_id,
    };
    // Include slug update if new slug is available and different
    if (pendingSlug && slugAvailable && tenant && !tenant.custom_domain_verified) {
      body.slug = pendingSlug;
    }
    updateMutation.mutate(body);
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

  const hasCustomDomain = !!(tenant?.custom_domain_verified && tenant?.custom_domain);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-1">
          <Input
            label="Company name"
            value={form.company_name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
          />
          {/* Slug preview — only when no custom domain */}
          {!hasCustomDomain && (
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span>URL:</span>
              <span className="font-mono">
                {pendingSlug
                  ? <><span className="line-through text-slate-300">{tenant?.slug}</span>{' → '}<span className={slugAvailable === false ? 'text-red-500' : 'text-slate-700'}>{pendingSlug}</span></>
                  : <span className="text-slate-700">{tenant?.slug}</span>
                }
                <span>.shopsuitedirect.com</span>
              </span>
              {slugChecking && <Spinner size="sm" />}
              {pendingSlug && !slugChecking && slugAvailable === true && (
                <span className="text-emerald-600 font-medium">available — will update on save</span>
              )}
              {pendingSlug && !slugChecking && slugAvailable === false && (
                <span className="text-red-500 font-medium">taken — slug won't change</span>
              )}
            </div>
          )}
        </div>
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">Booking notice</label>
            <select
              value={form.booking_notice_minutes}
              onChange={(e) => setForm((f) => (f ? { ...f, booking_notice_minutes: Number(e.target.value) } : f))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {[0, 30, 60, 120, 240, 720, 1440, 2880].map((m) => (
                <option key={m} value={m}>
                  {m === 0 ? 'Right up to the start time' : m < 60 ? `${m} minutes before` : m < 1440 ? `${m / 60} hour${m === 60 ? '' : 's'} before` : `${m / 1440} day${m === 1440 ? '' : 's'} before`}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">How soon before an appointment a customer can still book it.</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Customers can cancel or reschedule</label>
            <select
              value={form.cancel_window_hours}
              onChange={(e) => setForm((f) => (f ? { ...f, cancel_window_hours: Number(e.target.value) } : f))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {[0, 2, 6, 12, 24, 48, 72].map((h) => (
                <option key={h} value={h}>
                  {h === 0 ? 'Up to the start time' : `Up to ${h} hours before`}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">They get a link in their confirmation email. Deposits aren't refunded automatically; you decide.</p>
          </div>
        </div>

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

      {tenant && (tenant.mode === 'book' || tenant.mode === 'both') && <BookingHoursCard tenant={tenant} />}

      {tenant && <CustomDomainPanel tenant={tenant} />}
    </div>
  );
}
