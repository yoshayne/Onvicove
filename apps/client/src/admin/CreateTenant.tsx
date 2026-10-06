import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../lib/api';
import { useImpersonateApi } from '../lib/api';
import Button from '../components/shared/Button';

// ─── Static data ─────────────────────────────────────────────────────────────

const THEMES = [
  { id: 'editorial', label: 'Editorial', desc: 'Clean editorial — great for services & portfolios', accent: '#1a1a1a' },
  { id: 'minimal',   label: 'Minimal',   desc: 'Light & spacious — modern professional',           accent: '#111111' },
  { id: 'bold',      label: 'Bold',      desc: 'High-contrast, punchy — retail & fashion',         accent: '#FF3B00' },
  { id: 'warm',      label: 'Warm',      desc: 'Earthy tones — food, wellness, lifestyle',         accent: '#b5651d' },
  { id: 'classic',   label: 'Classic',   desc: 'Navy & gold — law, finance, luxury',               accent: '#1a3a5c' },
  { id: 'bright',    label: 'Bright',    desc: 'Vibrant & fun — kids, beauty, fitness',            accent: '#FF6B6B' },
  { id: 'obsidian',  label: 'Obsidian',  desc: 'Dark luxury — high-end brands',                   accent: '#9B59B6' },
  { id: 'aurora',    label: 'Aurora',    desc: 'Gradient pastels — creative, artsy',              accent: '#6C63FF' },
  { id: 'magazine',  label: 'Magazine',  desc: 'Editorial grid — news, media, events',            accent: '#E63946' },
  { id: 'brutalist', label: 'Brutalist', desc: 'Raw & bold — streetwear, art',                    accent: '#000000' },
  { id: 'neon-tokyo',label: 'Neon Tokyo',desc: 'Cyberpunk neon — tech, gaming, clubs',            accent: '#FF00FF' },
  { id: 'craft',     label: 'Craft',     desc: 'Handmade warmth — jewelry, ceramics, candles',   accent: '#8B7355' },
  { id: 'lens',      label: 'Lens',      desc: 'Photo-forward — photographers, creatives',        accent: '#2C3E50' },
];

const INDUSTRIES = [
  'Beauty & Wellness','Photography','Fitness & Training','Food & Beverage',
  'Retail','Home Services','Event Planning','Consulting','Art & Design',
  'Music & Entertainment','Health & Medical','Education','Other',
];

const TIMEZONES = [
  'America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
  'America/Phoenix','America/Anchorage','Pacific/Honolulu',
  'Europe/London','Europe/Paris','Europe/Berlin',
  'Asia/Tokyo','Asia/Singapore','Australia/Sydney',
];

const ALL_SECTIONS = [
  { id: 'hero',              label: 'Hero banner',       desc: 'Full-width header image with tagline',  defaultOn: true  },
  { id: 'featured-products', label: 'Featured products', desc: 'Highlight top products',               defaultOn: true  },
  { id: 'services',          label: 'Services',          desc: 'List bookable services',               defaultOn: true  },
  { id: 'about',             label: 'About',             desc: 'Business story & values',              defaultOn: true  },
  { id: 'staff',             label: 'Meet the team',     desc: 'Staff bios & photos',                  defaultOn: false },
  { id: 'testimonials',      label: 'Testimonials',      desc: 'Customer reviews',                     defaultOn: false },
  { id: 'contact',           label: 'Contact',           desc: 'Address, hours & contact form',        defaultOn: true  },
  { id: 'gallery',           label: 'Gallery',           desc: 'Photo gallery grid',                   defaultOn: false },
  { id: 'faq',               label: 'FAQ',               desc: 'Frequently asked questions',           defaultOn: false },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  // Step 1 — Client
  company_name: string;
  slug: string;
  mode: 'store' | 'book' | 'both';
  plan: 'starter' | 'pro' | 'business';
  client_email: string;

  // Step 2 — Location
  city: string;
  industry: string;
  timezone: string;

  // Step 3 — Theme
  theme_id: string;

  // Step 4 — Brand
  brand_color: string;
  logo_file: File | null;
  logo_preview: string;
  hero_file: File | null;
  hero_preview: string;

  // Step 5 — Content
  tagline: string;
  about_text: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  contact_hours: string;
  sections: Record<string, boolean>;
}

const STEP_LABELS = ['Client', 'Location', 'Theme', 'Brand', 'Content', 'Review'];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─── Upload zone ──────────────────────────────────────────────────────────────

function UploadZone({
  label, hint, preview, onFile, onClear,
}: {
  label: string;
  hint: string;
  preview: string;
  onFile: (f: File) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) onFile(f);
  }

  return (
    <div>
      <div className="text-xs font-medium text-slate-500 mb-1">{label}</div>
      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-200">
          <img src={preview} alt={label} className="w-full h-40 object-cover" />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
            aria-label="Remove"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
          onClick={() => ref.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-slate-400"><path d="M12 16V8m0 0-3 3m3-3 3 3M20 16.7A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span className="text-sm text-slate-500">Click or drag to upload</span>
          <span className="text-xs text-slate-400">{hint}</span>
        </div>
      )}
      <input ref={ref} type="file" accept="image/*" className="sr-only" onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) onFile(f);
        e.target.value = '';
      }} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CreateTenant() {
  const api = useApi();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [slugEdited, setSlugEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitStep, setSubmitStep] = useState('');
  const [impersonateToken, setImpersonateToken] = useState('');
  // Keep a component-level impersonation API for any future reactive use
  useImpersonateApi(impersonateToken);

  const defaultSections = Object.fromEntries(ALL_SECTIONS.map(s => [s.id, s.defaultOn]));

  const [form, setForm] = useState<FormState>({
    company_name: '', slug: '', mode: 'both', plan: 'starter', client_email: '',
    city: '', industry: '', timezone: 'America/New_York',
    theme_id: 'editorial',
    brand_color: '#3D4F7C', logo_file: null, logo_preview: '', hero_file: null, hero_preview: '',
    tagline: '', about_text: '', contact_email: '', contact_phone: '', contact_address: '', contact_hours: '',
    sections: defaultSections,
  });

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleNameChange(value: string) {
    set('company_name', value);
    if (!slugEdited) set('slug', slugify(value));
  }

  function handleImageFile(key: 'logo' | 'hero', file: File) {
    const url = URL.createObjectURL(file);
    if (key === 'logo') { set('logo_file', file); set('logo_preview', url); }
    else { set('hero_file', file); set('hero_preview', url); }
  }

  function clearImage(key: 'logo' | 'hero') {
    if (key === 'logo') { set('logo_file', null); set('logo_preview', ''); }
    else { set('hero_file', null); set('hero_preview', ''); }
  }

  // ── Validation ───────────────────────────────────────────────────────────

  const step1Valid = form.company_name.trim().length > 0
    && form.slug.trim().length > 0
    && /^[a-z0-9-]+$/.test(form.slug);

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleCreate() {
    setSubmitting(true);
    setSubmitError('');
    try {
      // 1. Create the tenant
      setSubmitStep('Creating tenant…');
      const { tenant } = await api.post<{ tenant: { id: string } }>('/admin/tenants', {
        company_name: form.company_name,
        slug: form.slug,
        mode: form.mode,
        plan: form.plan,
        theme_id: form.theme_id,
        brand_color: form.brand_color,
        city: form.city || undefined,
        industry: form.industry || undefined,
      });
      const tenantId = tenant.id;

      // 2. Get impersonation token so we can call tenant APIs
      setSubmitStep('Configuring site…');
      const { token } = await api.post<{ token: string }>(`/admin/tenants/${tenantId}/impersonate`);
      setImpersonateToken(token);
      // Build an impersonation API instance directly (avoids hook-in-async constraint)
      const impApiHeaders = { 'X-Impersonate-Token': token };
      const baseUrl = import.meta.env.VITE_API_URL as string | undefined;
      const apiBase = baseUrl ?? '';
      async function impFetch(path: string, init: RequestInit = {}) {
        const res = await fetch(`${apiBase}/api${path}`, {
          ...init,
          headers: { 'Content-Type': 'application/json', ...impApiHeaders, ...(init.headers ?? {}) },
        });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as {error?: string}).error ?? res.statusText); }
        return res.json();
      }
      const impApi = {
        patch: (path: string, body: unknown) => impFetch(path, { method: 'PATCH', body: JSON.stringify(body) }),
        put:   (path: string, body: unknown) => impFetch(path, { method: 'PUT',   body: JSON.stringify(body) }),
        upload: async <T,>(path: string, file: File): Promise<T> => {
          const fd = new FormData(); fd.append('file', file);
          const res = await fetch(`${apiBase}/api${path}`, { method: 'POST', headers: impApiHeaders, body: fd });
          if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as {error?: string}).error ?? res.statusText); }
          return res.json() as T;
        },
      };

      // 3. Upload logo if provided
      if (form.logo_file) {
        setSubmitStep('Uploading logo…');
        const { key: logoKey } = await impApi.upload<{ key: string; url: string }>('/uploads', form.logo_file);
        await impApi.patch('/tenants/me', { logo_key: logoKey });
      }

      // 4. Upload hero image if provided
      if (form.hero_file) {
        setSubmitStep('Uploading hero image…');
        const { key: heroKey } = await impApi.upload<{ key: string; url: string }>('/uploads', form.hero_file);
        await impApi.patch('/tenants/me', { hero_image_key: heroKey });
      }

      // 5. Save tagline and other text fields
      const patchBody: Record<string, unknown> = {};
      if (form.tagline) patchBody.tagline = form.tagline;
      if (Object.keys(patchBody).length) {
        setSubmitStep('Saving content…');
        await impApi.patch('/tenants/me', patchBody);
      }

      // 6. Save page_content (about text, contact info)
      const pageContent: Record<string, string> = {};
      if (form.about_text)       pageContent['about.text']       = form.about_text;
      if (form.contact_email)    pageContent['contact.email']    = form.contact_email;
      if (form.contact_phone)    pageContent['contact.phone']    = form.contact_phone;
      if (form.contact_address)  pageContent['contact.address']  = form.contact_address;
      if (form.contact_hours)    pageContent['contact.hours']    = form.contact_hours;
      if (Object.keys(pageContent).length) {
        setSubmitStep('Saving page content…');
        await impApi.put('/tenants/me/page-content', pageContent);
      }

      // 7. Save page sections
      setSubmitStep('Saving page layout…');
      const sections = ALL_SECTIONS
        .filter(s => {
          // filter sections to mode
          if (form.mode === 'store' && s.id === 'services') return false;
          if (form.mode === 'book' && s.id === 'featured-products') return false;
          return true;
        })
        .map(s => ({ id: s.id, type: s.id, label: s.label, enabled: form.sections[s.id] ?? s.defaultOn }));
      await impApi.put('/page-sections/home', { sections });

      // 8. Send invite if email provided
      if (form.client_email) {
        setSubmitStep('Sending invite…');
        await api.post(`/admin/tenants/${tenantId}/invite`, { invite_email: form.client_email });
      }

      setSubmitStep('Done!');
      navigate(`/admin/tenants/${tenantId}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
      setSubmitStep('');
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 max-w-2xl pb-12">
      {/* Header */}
      <div>
        <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:underline">&larr; Back</button>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">New client site</h1>
        <p className="text-sm text-slate-500 mt-0.5">Build the site, then invite the client to claim it.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const done = step > n;
          const active = step === n;
          return (
            <div key={n} className="flex items-center gap-1 shrink-0">
              <div className="flex items-center gap-1.5">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  active ? 'bg-indigo-600 text-white' : done ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {done ? '✓' : n}
                </div>
                <span className={`text-xs font-medium ${active ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
              </div>
              {n < STEP_LABELS.length && <div className="mx-1 h-px w-5 bg-slate-200" />}
            </div>
          );
        })}
      </div>

      {/* ── Step 1: Client ─────────────────────────────────────────── */}
      {step === 1 && (
        <Card title="Client details">
          <Field label="Company / business name *">
            <input
              type="text" value={form.company_name} placeholder="Acme Photography"
              onChange={(e) => handleNameChange(e.target.value)}
              className={input}
            />
          </Field>

          <Field label="URL slug *" hint="shopsuitedirect.com/[slug]">
            <input
              type="text" value={form.slug} placeholder="acme-photography"
              onChange={(e) => { setSlugEdited(true); set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }}
              className={input}
            />
            {form.slug && !/^[a-z0-9-]+$/.test(form.slug) && (
              <p className="mt-1 text-xs text-red-600">Lowercase letters, numbers and hyphens only</p>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Site type">
              <select value={form.mode} onChange={(e) => set('mode', e.target.value as FormState['mode'])} className={select}>
                <option value="both">Shop + Bookings</option>
                <option value="store">Shop only</option>
                <option value="book">Bookings only</option>
              </select>
            </Field>
            <Field label="Plan">
              <select value={form.plan} onChange={(e) => set('plan', e.target.value as FormState['plan'])} className={select}>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="business">Business</option>
              </select>
            </Field>
          </div>

          <Field label="Client email" hint="Optional — send invite automatically when site is created">
            <input
              type="email" value={form.client_email} placeholder="client@example.com"
              onChange={(e) => set('client_email', e.target.value)}
              className={input}
            />
          </Field>

          <Nav canNext={step1Valid} onNext={() => setStep(2)} />
        </Card>
      )}

      {/* ── Step 2: Location ───────────────────────────────────────── */}
      {step === 2 && (
        <Card title="Location &amp; industry">
          <div className="grid grid-cols-2 gap-4">
            <Field label="City">
              <input type="text" value={form.city} placeholder="Austin, TX"
                onChange={(e) => set('city', e.target.value)} className={input} />
            </Field>
            <Field label="Industry">
              <select value={form.industry} onChange={(e) => set('industry', e.target.value)} className={select}>
                <option value="">Select…</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Timezone">
            <select value={form.timezone} onChange={(e) => set('timezone', e.target.value)} className={select}>
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>)}
            </select>
          </Field>

          <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} />
        </Card>
      )}

      {/* ── Step 3: Theme ──────────────────────────────────────────── */}
      {step === 3 && (
        <Card title="Choose a theme">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {THEMES.map(t => (
              <button
                key={t.id} type="button"
                onClick={() => set('theme_id', t.id)}
                className={`flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-colors ${
                  form.theme_id === t.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {/* Color swatch */}
                <span className="mt-0.5 h-8 w-8 shrink-0 rounded-lg border border-black/10" style={{ background: t.accent }} />
                <div>
                  <div className={`text-sm font-semibold ${form.theme_id === t.id ? 'text-indigo-700' : 'text-slate-800'}`}>{t.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-snug">{t.desc}</div>
                </div>
              </button>
            ))}
          </div>
          <Nav onBack={() => setStep(2)} onNext={() => setStep(4)} />
        </Card>
      )}

      {/* ── Step 4: Brand ──────────────────────────────────────────── */}
      {step === 4 && (
        <Card title="Brand &amp; images">
          <Field label="Brand color">
            <div className="flex items-center gap-3">
              <input
                type="color" value={form.brand_color}
                onChange={(e) => set('brand_color', e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-slate-300 p-0.5"
              />
              <input
                type="text" value={form.brand_color}
                onChange={(e) => set('brand_color', e.target.value)}
                className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex gap-2">
                {['#3D4F7C','#1a1a1a','#b5651d','#c8a850','#6C63FF','#FF3B00'].map(c => (
                  <button key={c} type="button" title={c} onClick={() => set('brand_color', c)}
                    className="h-6 w-6 rounded-full border-2 border-white ring-1 ring-slate-200 hover:ring-indigo-400 transition-all"
                    style={{ background: c }} />
                ))}
              </div>
            </div>
          </Field>

          <UploadZone
            label="Logo" hint="PNG or SVG with transparency · max 2 MB"
            preview={form.logo_preview}
            onFile={(f) => handleImageFile('logo', f)}
            onClear={() => clearImage('logo')}
          />

          <UploadZone
            label="Hero image" hint="1920 × 1080 px recommended · JPG or PNG"
            preview={form.hero_preview}
            onFile={(f) => handleImageFile('hero', f)}
            onClear={() => clearImage('hero')}
          />

          <Nav onBack={() => setStep(3)} onNext={() => setStep(5)} />
        </Card>
      )}

      {/* ── Step 5: Content ────────────────────────────────────────── */}
      {step === 5 && (
        <Card title="Page content">
          <Field label="Tagline / hero subtext" hint="Short line under the business name in the hero section">
            <input
              type="text" value={form.tagline} placeholder="High-end photography for modern brands"
              onChange={(e) => set('tagline', e.target.value)} className={input} />
          </Field>

          <Field label="About text">
            <textarea
              value={form.about_text} rows={3}
              placeholder="Tell the client's story — who they are, what they do, why they're different…"
              onChange={(e) => set('about_text', e.target.value)}
              className={input + ' resize-none'} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact email">
              <input type="email" value={form.contact_email} placeholder="hello@acme.com"
                onChange={(e) => set('contact_email', e.target.value)} className={input} />
            </Field>
            <Field label="Contact phone">
              <input type="tel" value={form.contact_phone} placeholder="(512) 555-0100"
                onChange={(e) => set('contact_phone', e.target.value)} className={input} />
            </Field>
          </div>

          <Field label="Address">
            <input type="text" value={form.contact_address} placeholder="123 Main St, Austin TX 78701"
              onChange={(e) => set('contact_address', e.target.value)} className={input} />
          </Field>

          <Field label="Business hours">
            <input type="text" value={form.contact_hours} placeholder="Mon–Fri 9am–6pm, Sat 10am–4pm"
              onChange={(e) => set('contact_hours', e.target.value)} className={input} />
          </Field>

          {/* Section toggles */}
          <div>
            <div className="text-xs font-medium text-slate-500 mb-2">Page sections</div>
            <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-white p-3">
              {ALL_SECTIONS
                .filter(s => {
                  if (form.mode === 'store' && s.id === 'services') return false;
                  if (form.mode === 'book' && s.id === 'featured-products') return false;
                  return true;
                })
                .map(s => (
                  <label key={s.id} className="flex items-center justify-between gap-3 cursor-pointer group">
                    <div>
                      <span className="text-sm font-medium text-slate-800 group-hover:text-slate-900">{s.label}</span>
                      <span className="ml-2 text-xs text-slate-400">{s.desc}</span>
                    </div>
                    <div
                      onClick={() => set('sections', { ...form.sections, [s.id]: !form.sections[s.id] })}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        form.sections[s.id] ? 'bg-indigo-600' : 'bg-slate-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
                        form.sections[s.id] ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </div>
                  </label>
                ))}
            </div>
          </div>

          <Nav onBack={() => setStep(4)} onNext={() => setStep(6)} />
        </Card>
      )}

      {/* ── Step 6: Review + Create ────────────────────────────────── */}
      {step === 6 && (
        <Card title="Review &amp; create">
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              ['Company', form.company_name],
              ['Slug', `/${form.slug}`],
              ['Mode', form.mode === 'both' ? 'Shop + Bookings' : form.mode],
              ['Plan', form.plan],
              ['Theme', THEMES.find(t => t.id === form.theme_id)?.label ?? form.theme_id],
              form.city ? ['City', form.city] : null,
              form.industry ? ['Industry', form.industry] : null,
              form.client_email ? ['Invite to', form.client_email] : null,
            ].filter((x): x is [string, string] => x !== null).map(([label, value]) => (
              <div key={label as string} className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-400">{label}</div>
                <div className="font-medium text-slate-800 truncate">{value}</div>
              </div>
            ))}

            {/* Brand color swatch */}
            <div className="rounded-lg bg-slate-50 p-3 flex items-center gap-3">
              <span className="h-8 w-8 rounded-lg border border-black/10 shrink-0" style={{ background: form.brand_color }} />
              <div>
                <div className="text-xs text-slate-400">Brand color</div>
                <div className="font-mono text-sm text-slate-800">{form.brand_color}</div>
              </div>
            </div>
          </div>

          {/* Image previews */}
          {(form.logo_preview || form.hero_preview) && (
            <div className="grid grid-cols-2 gap-3">
              {form.logo_preview && (
                <div>
                  <div className="text-xs text-slate-400 mb-1">Logo</div>
                  <img src={form.logo_preview} alt="Logo" className="h-24 w-full rounded-lg object-contain border border-slate-200 bg-slate-50 p-2" />
                </div>
              )}
              {form.hero_preview && (
                <div>
                  <div className="text-xs text-slate-400 mb-1">Hero image</div>
                  <img src={form.hero_preview} alt="Hero" className="h-24 w-full rounded-lg object-cover border border-slate-200" />
                </div>
              )}
            </div>
          )}

          {/* Active sections */}
          <div>
            <div className="text-xs text-slate-400 mb-1">Active sections</div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SECTIONS.filter(s => form.sections[s.id]).map(s => (
                <span key={s.id} className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">{s.label}</span>
              ))}
            </div>
          </div>

          {form.client_email && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
              An invite will be sent to <strong>{form.client_email}</strong> after the site is created.
            </div>
          )}

          {submitError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{submitError}</div>
          )}

          {submitting && submitStep && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <svg className="animate-spin h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              {submitStep}
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="secondary" disabled={submitting} onClick={() => setStep(5)}>← Back</Button>
            <Button variant="primary" disabled={submitting} onClick={handleCreate}>
              {submitting ? 'Creating…' : `🚀 Create site${form.client_email ? ' & send invite' : ''}`}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
const select = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col gap-5">
      <h2 className="font-semibold text-slate-800" dangerouslySetInnerHTML={{ __html: title }} />
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      {hint && <p className="text-xs text-slate-400 mb-1">{hint}</p>}
      {children}
    </div>
  );
}

function Nav({ onBack, onNext, canNext = true }: { onBack?: () => void; onNext?: () => void; canNext?: boolean }) {
  return (
    <div className="flex justify-between pt-2">
      {onBack ? (
        <Button variant="secondary" onClick={onBack}>← Back</Button>
      ) : <span />}
      {onNext && (
        <Button variant="primary" disabled={!canNext} onClick={onNext}>Next →</Button>
      )}
    </div>
  );
}

