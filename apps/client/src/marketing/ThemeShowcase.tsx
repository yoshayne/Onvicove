import { useState, Suspense, lazy, type ComponentType } from 'react';
import type { ThemeId, ThemeProps, ProductData, ServiceData } from '../themes/types';

const THEMES: { id: ThemeId; name: string; desc: string }[] = [
  { id: 'editorial', name: 'Editorial', desc: 'Dark luxury, serif headlines' },
  { id: 'minimal', name: 'Minimal', desc: 'Swiss grid, clean whitespace' },
  { id: 'bold', name: 'Bold', desc: 'Streetwear, neon yellow' },
  { id: 'warm', name: 'Warm', desc: 'Wellness & artisan tones' },
  { id: 'classic', name: 'Classic', desc: 'Professional navy & gold' },
  { id: 'bright', name: 'Bright', desc: 'Gen Z beauty, hot pink' },
];

const MINI_STYLES: Record<ThemeId, {
  bg: string; nav: string; hero: string; accent: string; text: string; subtext: string;
  headingFont: string; bodyFont: string; navText: string;
}> = {
  editorial: {
    bg: '#ffffff', nav: '#1a1a1a', hero: '#1a1a1a', accent: '#d4a96a',
    text: '#ffffff', subtext: 'rgba(255,255,255,0.6)', headingFont: 'Georgia, serif', bodyFont: 'sans-serif', navText: '#ffffff',
  },
  minimal: {
    bg: '#ffffff', nav: '#ffffff', hero: '#ffffff', accent: '#111111',
    text: '#111111', subtext: '#888888', headingFont: 'sans-serif', bodyFont: 'sans-serif', navText: '#111111',
  },
  bold: {
    bg: '#0a0a0a', nav: '#0a0a0a', hero: '#0a0a0a', accent: '#e8ff00',
    text: '#ffffff', subtext: 'rgba(255,255,255,0.5)', headingFont: 'sans-serif', bodyFont: 'sans-serif', navText: '#ffffff',
  },
  warm: {
    bg: '#fdf8f3', nav: '#fdf8f3', hero: '#f5e8d8', accent: '#8b5e3c',
    text: '#3d2b1f', subtext: '#7a5c46', headingFont: 'Georgia, serif', bodyFont: 'sans-serif', navText: '#3d2b1f',
  },
  classic: {
    bg: '#ffffff', nav: '#1a3a5c', hero: '#1a3a5c', accent: '#c8a850',
    text: '#ffffff', subtext: 'rgba(255,255,255,0.65)', headingFont: 'Georgia, serif', bodyFont: 'serif', navText: '#ffffff',
  },
  bright: {
    bg: '#ffffff', nav: '#ffffff', hero: '#f0f0ff', accent: '#ff3cac',
    text: '#1a1a2e', subtext: '#666', headingFont: 'sans-serif', bodyFont: 'sans-serif', navText: '#1a1a2e',
  },
};

const MOCK_PRODUCTS: ProductData[] = [
  { id: '1', name: 'Signature Serum', description: 'Luxury skin care', priceCents: 8900, isFeatured: true },
  { id: '2', name: 'Glow Oil', description: 'Radiance boost', priceCents: 6400 },
  { id: '3', name: 'Night Cream', description: 'Deep repair', priceCents: 7200 },
];

const MOCK_SERVICES: ServiceData[] = [
  { id: '1', name: 'Signature Facial', description: '60-min glow treatment', priceCents: 12000, durationMinutes: 60 },
  { id: '2', name: 'Deep Cleanse', description: '45-min purifying session', priceCents: 8500, durationMinutes: 45 },
];

const themeLoaders: Record<ThemeId, () => Promise<{ default: ComponentType<ThemeProps> }>> = {
  editorial: () => import('../themes/editorial/Storefront'),
  minimal: () => import('../themes/minimal/Storefront'),
  bold: () => import('../themes/bold/Storefront'),
  warm: () => import('../themes/warm/Storefront'),
  classic: () => import('../themes/classic/Storefront'),
  bright: () => import('../themes/bright/Storefront'),
};

function MiniMockup({ id }: { id: ThemeId }) {
  const s = MINI_STYLES[id];
  const navBorder = id === 'minimal' ? '1px solid #e5e5e5' : id === 'warm' ? '1px solid #e8d5c4' : 'none';
  const navShadow = id === 'minimal' || id === 'warm' || id === 'bright' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none';

  return (
    <div style={{ background: s.bg, fontFamily: s.bodyFont, height: '100%', overflow: 'hidden' }}>
      {/* Nav */}
      <div style={{
        background: s.nav, borderBottom: navBorder, boxShadow: navShadow,
        padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['●', '●', '●'].map((d, i) => (
            <span key={i} style={{ fontSize: 4, opacity: i === 0 ? 1 : 0.4, color: s.accent }}>{d}</span>
          ))}
        </div>
        <span style={{
          fontFamily: s.headingFont, fontSize: 7, fontWeight: 700,
          color: s.navText, letterSpacing: id === 'editorial' || id === 'classic' ? '0.15em' : '0.02em',
          textTransform: id === 'editorial' || id === 'classic' ? 'uppercase' : 'none',
        }}>
          LUMIÈRE
        </span>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.accent, opacity: 0.7 }} />
      </div>

      {/* Hero */}
      <div style={{
        background: s.hero, padding: '12px 10px 10px',
        borderBottom: id === 'minimal' ? '1px solid #f0f0f0' : 'none',
      }}>
        <div style={{
          fontFamily: s.headingFont,
          fontSize: id === 'bold' ? 11 : 9,
          fontWeight: 800,
          color: s.text,
          lineHeight: 1.15,
          letterSpacing: id === 'bold' ? '-0.02em' : id === 'editorial' || id === 'classic' ? '0.03em' : 'normal',
          textTransform: id === 'bold' ? 'uppercase' : 'none',
          marginBottom: 4,
        }}>
          {id === 'bold' ? 'ELEVATE\nYOUR LOOK' : id === 'minimal' ? 'Less is\nmore.' : 'Luxury Beauty\n& Wellness'}
        </div>
        <div style={{ fontSize: 5, color: s.subtext, marginBottom: 8, lineHeight: 1.4 }}>
          Premium skincare & treatments
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <div style={{
            background: s.accent, color: id === 'bold' ? '#000' : id === 'minimal' ? '#fff' : '#fff',
            fontSize: 5, fontWeight: 700, padding: '3px 7px', borderRadius: id === 'minimal' ? 0 : 4,
            letterSpacing: id === 'bold' ? '0.1em' : 'normal',
            textTransform: id === 'bold' ? 'uppercase' : 'none',
          }}>
            Shop Now
          </div>
          <div style={{
            border: `1px solid ${s.accent}`, color: s.accent,
            fontSize: 5, fontWeight: 600, padding: '3px 7px', borderRadius: id === 'minimal' ? 0 : 4,
          }}>
            Book
          </div>
        </div>
      </div>

      {/* Product grid */}
      <div style={{ padding: '8px 10px', background: s.bg }}>
        <div style={{ fontSize: 5, fontWeight: 700, color: id === 'bold' ? s.accent : s.text === '#ffffff' ? '#ccc' : '#333', marginBottom: 5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Featured
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
          {['Serum', 'Oil', 'Cream'].map((name) => (
            <div key={name} style={{
              background: id === 'bold' ? '#1a1a1a' : id === 'warm' ? '#f0e8dc' : id === 'classic' ? '#f5f5f5' : id === 'bright' ? '#fff0f9' : '#f9f9f9',
              borderRadius: id === 'minimal' ? 0 : 4,
              border: id === 'minimal' ? '1px solid #e5e5e5' : id === 'bright' ? `1px solid ${s.accent}22` : 'none',
              padding: '4px 3px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: 20, borderRadius: id === 'minimal' ? 0 : 2, marginBottom: 3,
                background: id === 'bold' ? '#2a2a2a' : id === 'editorial' ? '#eee' : id === 'warm' ? '#ddd0c4' : id === 'classic' ? '#dde4ed' : id === 'bright' ? '#ffe0f5' : '#ebebeb',
              }} />
              <div style={{ fontSize: 4.5, fontWeight: 600, color: id === 'bold' ? '#fff' : s.text === '#ffffff' ? '#ccc' : '#222', lineHeight: 1.2 }}>{name}</div>
              <div style={{ fontSize: 4, color: s.accent, fontWeight: 700, marginTop: 1 }}>$89</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FullPreview({ themeId }: { themeId: ThemeId }) {
  const loader = themeLoaders[themeId];
  const Storefront = lazy(loader);

  return (
    <div style={{ ['--brand-color' as string]: MINI_STYLES[themeId].accent }}>
      <Suspense fallback={
        <div className="flex min-h-[400px] items-center justify-center text-slate-400">
          Loading theme…
        </div>
      }>
        <Storefront
          theme={{
            companyName: 'Lumière Studio',
            tagline: 'Luxury beauty & wellness for the modern woman',
            mode: 'both',
            brandColor: MINI_STYLES[themeId].accent,
            city: 'New York',
            industry: 'Beauty & Wellness',
            themeId,
          }}
          products={MOCK_PRODUCTS}
          services={MOCK_SERVICES}
          staff={[]}
        />
      </Suspense>
    </div>
  );
}

export default function ThemeShowcase() {
  const [tab, setTab] = useState<'grid' | 'full'>('grid');
  const [activeTheme, setActiveTheme] = useState<ThemeId>('editorial');

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h2 className="text-center text-3xl font-bold tracking-tight">Six premium themes</h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
        Pick a look that matches your brand — switch any time from your dashboard.
      </p>

      {/* Tab switcher */}
      <div className="mt-8 flex justify-center">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setTab('grid')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            All themes
          </button>
          <button
            type="button"
            onClick={() => setTab('full')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === 'full' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Full preview
          </button>
        </div>
      </div>

      {tab === 'grid' && (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {THEMES.map((t) => (
            <div
              key={t.id}
              className="group cursor-pointer overflow-hidden rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              onClick={() => { setActiveTheme(t.id); setTab('full'); }}
            >
              <div className="h-44 overflow-hidden" style={{ background: MINI_STYLES[t.id].bg }}>
                <div style={{ transform: 'scale(1)', transformOrigin: 'top left', width: '100%', height: '100%' }}>
                  <MiniMockup id={t.id} />
                </div>
              </div>
              <div className="border-t border-slate-100 p-3">
                <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                <p className="text-xs text-slate-500">{t.desc}</p>
                <p className="mt-1.5 text-xs font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
                  Preview →
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'full' && (
        <div className="mt-8">
          {/* Theme pill switcher */}
          <div className="mb-4 flex flex-wrap justify-center gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTheme(t.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  activeTheme === t.id
                    ? 'shadow-sm text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                style={activeTheme === t.id ? { background: MINI_STYLES[t.id].accent, color: t.id === 'bold' ? '#000' : '#fff' } : {}}
              >
                {t.name}
              </button>
            ))}
          </div>

          {/* Scrollable full-size preview in a browser-chrome frame */}
          <div className="overflow-hidden rounded-xl border border-slate-200 shadow-lg">
            {/* Fake browser bar */}
            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-4 py-2.5">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 rounded-md bg-white px-3 py-1 text-center text-xs text-slate-400 border border-slate-200">
                lumiere.shopsuitedirect.com
              </div>
            </div>
            {/* Preview viewport — scrollable */}
            <div className="h-[600px] overflow-y-auto bg-white">
              <FullPreview key={activeTheme} themeId={activeTheme} />
            </div>
          </div>

          <p className="mt-3 text-center text-xs text-slate-400">
            Previewing with sample products and services. Your real content will appear on your live site.
          </p>
        </div>
      )}
    </section>
  );
}
