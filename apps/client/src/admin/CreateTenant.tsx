import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import Button from '../components/shared/Button';

const THEMES = [
  { id: 'editorial', label: 'Editorial' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'bold', label: 'Bold' },
  { id: 'warm', label: 'Warm' },
  { id: 'classic', label: 'Classic' },
  { id: 'bright', label: 'Bright' },
  { id: 'obsidian', label: 'Obsidian' },
  { id: 'aurora', label: 'Aurora' },
  { id: 'magazine', label: 'Magazine' },
  { id: 'brutalist', label: 'Brutalist' },
  { id: 'neon-tokyo', label: 'Neon Tokyo' },
  { id: 'craft', label: 'Craft' },
  { id: 'lens', label: 'Lens' },
];

const INDUSTRIES = [
  'Beauty & Wellness', 'Photography', 'Fitness & Training', 'Food & Beverage',
  'Retail', 'Home Services', 'Event Planning', 'Consulting', 'Art & Design',
  'Music & Entertainment', 'Health & Medical', 'Education', 'Other',
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

interface FormState {
  company_name: string;
  slug: string;
  mode: 'store' | 'book' | 'both';
  theme_id: string;
  brand_color: string;
  city: string;
  industry: string;
  plan: 'starter' | 'pro' | 'business';
}

export default function CreateTenant() {
  const api = useApi();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({
    company_name: '',
    slug: '',
    mode: 'both',
    theme_id: 'editorial',
    brand_color: '#3D4F7C',
    city: '',
    industry: '',
    plan: 'starter',
  });
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: () => api.post<{ tenant: { id: string } }>('/admin/tenants', form),
    onSuccess: (data) => navigate(`/admin/tenants/${data.tenant.id}`),
    onError: (err) => setError(err instanceof Error ? err.message : 'Something went wrong'),
  });

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleNameChange(value: string) {
    set('company_name', value);
    if (!slugEdited) set('slug', slugify(value));
  }

  const canStep1 = form.company_name.trim().length > 0 && form.slug.trim().length > 0 && /^[a-z0-9-]+$/.test(form.slug);
  const canStep2 = true;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:underline">&larr; Back</button>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">New client site</h1>
        <p className="text-sm text-slate-500 mt-1">Build a site on behalf of a client. You'll send them an invite to claim it when it's ready.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
              step === n ? 'bg-indigo-600 text-white' :
              step > n ? 'bg-green-500 text-white' :
              'bg-slate-200 text-slate-500'
            }`}>{step > n ? '✓' : n}</div>
            {n < 3 && <div className="h-px w-8 bg-slate-200" />}
          </div>
        ))}
        <span className="ml-2 text-sm text-slate-500">
          {step === 1 ? 'Basics' : step === 2 ? 'Branding' : 'Review'}
        </span>
      </div>

      {step === 1 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col gap-4">
          <h2 className="font-semibold text-slate-800">Business details</h2>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Company name *</label>
            <input
              type="text"
              value={form.company_name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Acme Photography"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">URL slug *</label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-slate-400">shopsuitedirect.com/store/</span>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => { setSlugEdited(true); set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }}
                placeholder="acme-photography"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {form.slug && !/^[a-z0-9-]+$/.test(form.slug) && (
              <p className="mt-1 text-xs text-red-600">Lowercase letters, numbers, and hyphens only</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Site type</label>
              <select
                value={form.mode}
                onChange={(e) => set('mode', e.target.value as FormState['mode'])}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="both">Shop + Bookings</option>
                <option value="store">Shop only</option>
                <option value="book">Bookings only</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Plan</label>
              <select
                value={form.plan}
                onChange={(e) => set('plan', e.target.value as FormState['plan'])}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="business">Business</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                placeholder="Austin, TX"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Industry</label>
              <select
                value={form.industry}
                onChange={(e) => set('industry', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select…</option>
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" disabled={!canStep1} onClick={() => setStep(2)}>
              Next: Branding →
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col gap-4">
          <h2 className="font-semibold text-slate-800">Theme &amp; branding</h2>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Theme</label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => set('theme_id', t.id)}
                  className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${
                    form.theme_id === t.id
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Brand color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.brand_color}
                onChange={(e) => set('brand_color', e.target.value)}
                className="h-9 w-16 cursor-pointer rounded border border-slate-300 p-0.5"
              />
              <input
                type="text"
                value={form.brand_color}
                onChange={(e) => set('brand_color', e.target.value)}
                className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={() => setStep(1)}>← Back</Button>
            <Button variant="primary" disabled={!canStep2} onClick={() => setStep(3)}>
              Next: Review →
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col gap-4">
          <h2 className="font-semibold text-slate-800">Review &amp; create</h2>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-400 mb-0.5">Company</div>
              <div className="font-medium text-slate-800">{form.company_name}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-400 mb-0.5">Slug</div>
              <div className="font-mono text-slate-800">/{form.slug}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-400 mb-0.5">Mode</div>
              <div className="capitalize text-slate-800">{form.mode === 'both' ? 'Shop + Bookings' : form.mode}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-400 mb-0.5">Plan</div>
              <div className="capitalize text-slate-800">{form.plan}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-400 mb-0.5">Theme</div>
              <div className="text-slate-800">{THEMES.find(t => t.id === form.theme_id)?.label}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-400 mb-0.5">Brand color</div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-4 w-4 rounded-full border border-slate-200" style={{ background: form.brand_color }} />
                <span className="font-mono text-slate-800">{form.brand_color}</span>
              </div>
            </div>
            {form.city && (
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-400 mb-0.5">City</div>
                <div className="text-slate-800">{form.city}</div>
              </div>
            )}
            {form.industry && (
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-400 mb-0.5">Industry</div>
                <div className="text-slate-800">{form.industry}</div>
              </div>
            )}
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-sm text-blue-700">
            The site will be created as <strong>unclaimed</strong>. After building it out, send the client an invite link from the tenant detail page and they'll take ownership when they sign up.
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={() => setStep(2)}>← Back</Button>
            <Button
              variant="primary"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? 'Creating…' : 'Create site'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
