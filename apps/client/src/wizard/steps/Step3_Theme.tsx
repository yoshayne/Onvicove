import { useWizardStore } from '../wizardStore';
import type { ThemeId } from '../../themes/types';
import { BUSINESS_TYPE_BY_ID } from '../businessTypes';
import { FREE_THEME_FOR, THEME_LABEL } from '../planGate';

interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
  colors: string[];
  premium?: boolean;
}

const THEME_OPTIONS: ThemeOption[] = [
  { id: 'barber', name: 'Barber', description: 'Dark & sharp, booking first', colors: ['#0c0c0d', '#d4a73a', '#f4f4f5'] },
  { id: 'studio', name: 'Studio', description: 'Soft & elegant, booking first', colors: ['#faf6f2', '#b5838d', '#2c2420'] },
  { id: 'ink', name: 'Ink', description: 'High contrast, your work first', colors: ['#080808', '#e63946', '#fafafa'] },
  { id: 'editorial', name: 'Editorial', description: 'Dark luxury, serif headlines', colors: ['#1a1a1a', '#d4a96a', '#ffffff'] },
  { id: 'minimal', name: 'Minimal', description: 'Swiss grid, clean whitespace', colors: ['#ffffff', '#111111', '#f8f8f8'] },
  { id: 'bold', name: 'Bold', description: 'Streetwear, neon accents', colors: ['#0a0a0a', '#e8ff00', '#ffffff'] },
  { id: 'warm', name: 'Warm', description: 'Wellness & artisan feel', colors: ['#fdf8f3', '#8b5e3c', '#3d2314'] },
  { id: 'classic', name: 'Classic', description: 'Professional & formal', colors: ['#1a3a5c', '#c8a850', '#ffffff'] },
  { id: 'bright', name: 'Bright', description: 'Gen Z, playful pastels', colors: ['#ff3cac', '#f0f0ff', '#ffffff'] },
  { id: 'obsidian', name: 'Obsidian', description: 'Black luxury, gold accents', colors: ['#000000', '#c9a84c', '#111111'], premium: true },
  { id: 'aurora', name: 'Aurora', description: 'Gradient & glassmorphism', colors: ['#0d0d1a', '#a78bfa', '#1a0533'], premium: true },
  { id: 'magazine', name: 'Magazine', description: 'Editorial asymmetric grid', colors: ['#f8f6f1', '#1a1a1a', '#eeece7'], premium: true },
  { id: 'brutalist', name: 'Brutalist', description: 'Raw, bold, unconventional', colors: ['#ffffff', '#000000', '#0000ff'], premium: true },
  { id: 'neon-tokyo', name: 'Neon Tokyo', description: 'Cyberpunk neon energy', colors: ['#050510', '#ff2d9b', '#0a0a20'], premium: true },
  { id: 'craft', name: 'Craft', description: 'Handmade paper textures', colors: ['#f5f0e8', '#5c4a32', '#ece5d8'], premium: true },
];

export default function Step3_Theme() {
  const themeId = useWizardStore((s) => s.themeId);
  const setThemeId = useWizardStore((s) => s.setThemeId);
  const plan = useWizardStore((s) => s.plan);
  const isPro = plan === 'pro' || plan === 'business';
  const businessType = useWizardStore((s) => s.businessType);
  const type = BUSINESS_TYPE_BY_ID[businessType];
  const recommended = type && type.why.length > 0 ? THEME_OPTIONS.find((t) => t.id === type.themeId) : undefined;

  const setPlan = useWizardStore((s) => s.setPlan);
  const setDesiredThemeId = useWizardStore((s) => s.setDesiredThemeId);
  const selected = THEME_OPTIONS.find((t) => t.id === themeId);

  // Every look can be previewed on any plan; Pro looks are only held back when the site goes live
  function handleSelect(theme: ThemeOption) {
    setThemeId(theme.id);
    if (!theme.premium) setDesiredThemeId(undefined);
  }

  const freeThemes = THEME_OPTIONS.filter((t) => !t.premium);
  const premiumThemes = THEME_OPTIONS.filter((t) => t.premium);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">Choose a look for your site</h2>
        <p className="mt-1 text-sm text-gray-500">
          Watch the preview update as you pick. Every look is open to preview, including Pro themes.
        </p>
      </div>

      {recommended && type && (
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-3 sm:p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Recommended for {type.label.toLowerCase()}</p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-10 w-24 shrink-0 overflow-hidden rounded-lg border border-blue-100">
              {recommended.colors.map((color, i) => (
                <div key={i} className="flex-1" style={{ backgroundColor: color }} />
              ))}
            </div>
            <div>
              <p className="font-medium text-gray-900">{recommended.name}</p>
              <p className="text-xs text-gray-600">{recommended.description}</p>
            </div>
          </div>
          <p className="mt-3 hidden text-sm font-medium text-gray-900 sm:block">Why it fits:</p>
          <ul className="mt-1 hidden list-disc pl-5 text-sm text-gray-700 sm:block">
            {type.why.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => handleSelect(recommended)}
            className="mt-2 rounded-lg bg-blue-700 px-4 py-2 sm:mt-3 text-sm font-medium text-white hover:bg-blue-800"
          >
            {themeId === recommended.id ? '✓ Using this look' : 'Use this look'}
          </button>
          <p className="mt-2 hidden text-xs text-gray-500 sm:block">Not feeling it? Pick any look below. You can change it anytime.</p>
        </div>
      )}

      {selected?.premium && !isPro && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">You're previewing {selected.name}, a Pro theme.</p>
          <p className="mt-1 text-sm text-amber-800">Keep exploring. It needs Pro to go live, and at the end you can choose to upgrade or launch with a free look and keep {selected.name} for later.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setPlan('pro')} className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700">Start with Pro</button>
            <button
              type="button"
              onClick={() => { setDesiredThemeId(selected.id); setThemeId(FREE_THEME_FOR[selected.id] ?? 'editorial'); }}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
            >
              Use {THEME_LABEL[FREE_THEME_FOR[selected.id]] ?? 'a free look'} for now
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {freeThemes.map((theme) => (
          <button
            key={theme.id}
            type="button"
            onClick={() => handleSelect(theme)}
            className={`flex flex-col gap-3 rounded-xl border p-3 text-left transition ${
              themeId === theme.id
                ? 'border-gray-900 ring-1 ring-gray-900'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex h-10 overflow-hidden rounded-lg border border-gray-100">
              {theme.colors.map((color, i) => (
                <div key={i} className="flex-1" style={{ backgroundColor: color }} />
              ))}
            </div>
            <div>
              <p className="flex items-center gap-2 font-medium text-gray-900">
                {theme.name}
                {recommended?.id === theme.id && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">Recommended</span>}
              </p>
              <p className="text-xs text-gray-500">{theme.description}</p>
            </div>
          </button>
        ))}
      </div>

      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 flex items-center gap-1">
            ★ Pro &amp; Business
          </span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {premiumThemes.map((theme) => {
            const locked = !isPro;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleSelect(theme)}
                className={`relative flex flex-col gap-3 rounded-xl border p-3 text-left transition ${
                  themeId === theme.id
                    ? 'border-amber-500 ring-1 ring-amber-500'
                    : locked
                      ? 'border-amber-100 hover:border-amber-300'
                      : 'border-amber-200 hover:border-amber-300'
                }`}
              >
                <div className="flex h-10 overflow-hidden rounded-lg border border-gray-100">
                  {theme.colors.map((color, i) => (
                    <div key={i} className="flex-1" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-gray-900">{theme.name}</p>
                    {locked && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">Pro</span>}
                  </div>
                  <p className="text-xs text-gray-500">{theme.description}</p>
                  {locked && <p className="mt-1 text-xs text-amber-600">Tap to preview</p>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
