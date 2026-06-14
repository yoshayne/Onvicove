import { useWizardStore } from '../wizardStore';
import type { ThemeId } from '../../themes/types';

interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
  colors: string[];
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Dark luxury, serif headlines',
    colors: ['#1a1a1a', '#d4a96a', '#ffffff'],
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Swiss grid, clean whitespace',
    colors: ['#ffffff', '#111111', '#f8f8f8'],
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'Streetwear, neon accents',
    colors: ['#0a0a0a', '#e8ff00', '#ffffff'],
  },
  {
    id: 'warm',
    name: 'Warm',
    description: 'Wellness & artisan feel',
    colors: ['#fdf8f3', '#8b5e3c', '#3d2314'],
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Professional & formal',
    colors: ['#1a3a5c', '#c8a850', '#ffffff'],
  },
  {
    id: 'bright',
    name: 'Bright',
    description: 'Gen Z, playful pastels',
    colors: ['#ff3cac', '#f0f0ff', '#ffffff'],
  },
];

export default function Step3_Theme() {
  const themeId = useWizardStore((s) => s.themeId);
  const setThemeId = useWizardStore((s) => s.setThemeId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Choose a look for your site</h2>
        <p className="mt-1 text-sm text-gray-500">
          Watch the preview update on the right as you pick.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {THEME_OPTIONS.map((theme) => (
          <button
            key={theme.id}
            type="button"
            onClick={() => setThemeId(theme.id)}
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
    </div>
  );
}
