import { useWizardStore } from '../wizardStore';
import type { ThemeId } from '../../themes/types';

interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
  colors: string[];
  premium?: boolean;
}

const THEME_OPTIONS: ThemeOption[] = [
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

  function handleSelect(theme: ThemeOption) {
    if (theme.premium && !isPro) {
      alert('Premium themes are available on Pro and Business plans. You can upgrade after launching your site.');
      return;
    }
    setThemeId(theme.id);
  }

  const freeThemes = THEME_OPTIONS.filter((t) => !t.premium);
  const premiumThemes = THEME_OPTIONS.filter((t) => t.premium);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Choose a look for your site</h2>
        <p className="mt-1 text-sm text-gray-500">
          Watch the preview update on the right as you pick.
        </p>
      </div>

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
              <p className="font-medium text-gray-900">{theme.name}</p>
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
                      ? 'border-amber-100 hover:border-amber-200 cursor-default'
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
                    {locked && <span className="text-xs">🔒</span>}
                  </div>
                  <p className="text-xs text-gray-500">{theme.description}</p>
                  {locked && <p className="mt-1 text-xs text-amber-600">Upgrade to unlock</p>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
