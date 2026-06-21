import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import type { Tenant, ThemeId } from '../types';
import Spinner from '../components/shared/Spinner';
import Badge from '../components/shared/Badge';

interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
  colors: string[];
  hero: string;
  premium?: boolean;
}

const THEMES: ThemeOption[] = [
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Dark luxury, serif headlines',
    colors: ['#1a1a1a', '#d4a96a', '#ffffff'],
    hero: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=70',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Swiss grid, clean whitespace',
    colors: ['#ffffff', '#111111', '#f8f8f8'],
    hero: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=600&q=70',
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'Streetwear, neon accents',
    colors: ['#0a0a0a', '#e8ff00', '#ffffff'],
    hero: 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=600&q=70',
  },
  {
    id: 'warm',
    name: 'Warm',
    description: 'Wellness & artisan feel',
    colors: ['#fdf8f3', '#8b5e3c', '#3d2314'],
    hero: 'https://images.unsplash.com/photo-1600857544200-b2f468e76b53?auto=format&fit=crop&w=600&q=70',
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Professional & formal',
    colors: ['#1a3a5c', '#c8a850', '#ffffff'],
    hero: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=70',
  },
  {
    id: 'bright',
    name: 'Bright',
    description: 'Gen Z, playful pastels',
    colors: ['#ff3cac', '#f0f0ff', '#ffffff'],
    hero: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=70',
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    description: 'Black luxury, gold accents',
    colors: ['#000000', '#c9a84c', '#111111'],
    hero: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=600&q=70',
    premium: true,
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Gradient & glassmorphism',
    colors: ['#0d0d1a', '#a78bfa', '#1a0533'],
    hero: 'https://images.unsplash.com/photo-1518310383802-640c2de311b6?auto=format&fit=crop&w=600&q=70',
    premium: true,
  },
  {
    id: 'magazine',
    name: 'Magazine',
    description: 'Editorial asymmetric grid',
    colors: ['#f8f6f1', '#1a1a1a', '#eeece7'],
    hero: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=600&q=70',
    premium: true,
  },
  {
    id: 'brutalist',
    name: 'Brutalist',
    description: 'Raw, bold, unconventional',
    colors: ['#ffffff', '#000000', '#0000ff'],
    hero: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=70',
    premium: true,
  },
  {
    id: 'neon-tokyo',
    name: 'Neon Tokyo',
    description: 'Cyberpunk neon energy',
    colors: ['#050510', '#ff2d9b', '#0a0a20'],
    hero: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=600&q=70',
    premium: true,
  },
  {
    id: 'craft',
    name: 'Craft',
    description: 'Handmade paper textures',
    colors: ['#f5f0e8', '#5c4a32', '#ece5d8'],
    hero: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=600&q=70',
    premium: true,
  },
];

function ThemeCard({
  theme,
  isActive,
  isLocked,
  isPending,
  onSelect,
}: {
  theme: ThemeOption;
  isActive: boolean;
  isLocked: boolean;
  isPending: boolean;
  onSelect: () => void;
}) {
  const isDark = ['bold', 'obsidian', 'aurora', 'neon-tokyo'].includes(theme.id);

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-xl border bg-white transition-all ${
        isActive
          ? theme.premium
            ? 'border-amber-400 ring-2 ring-amber-400'
            : 'border-gray-900 ring-2 ring-gray-900'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Mockup */}
      <div className="relative h-40 overflow-hidden" style={{ backgroundColor: theme.colors[0] }}>
        <img
          src={theme.hero}
          alt={theme.name}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: isDark ? 0.45 : 0.7, mixBlendMode: isDark ? 'screen' : 'normal' }}
        />
        {/* Simulated nav bar */}
        <div
          className="absolute inset-x-0 top-0 flex items-center justify-between px-3 py-2"
          style={{ background: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)' }}
        >
          <div className="h-1.5 w-16 rounded-full" style={{ backgroundColor: theme.colors[1], opacity: 0.8 }} />
          <div className="flex gap-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-1 w-6 rounded-full opacity-60" style={{ backgroundColor: theme.colors[1] }} />
            ))}
          </div>
        </div>
        {/* Color swatch strip */}
        <div className="absolute inset-x-0 bottom-0 flex h-1.5">
          {theme.colors.map((c, i) => (
            <div key={i} className="flex-1" style={{ backgroundColor: c }} />
          ))}
        </div>
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white">🔒 Pro &amp; Business</span>
          </div>
        )}
      </div>

      {/* Info + action */}
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-900">{theme.name}</p>
            <p className="text-xs text-slate-500">{theme.description}</p>
          </div>
          {isActive && <Badge tone={theme.premium ? 'warning' : 'success'}>Active</Badge>}
        </div>

        {isLocked ? (
          <a
            href="/dashboard/billing"
            className="block w-full rounded-lg border border-amber-300 bg-amber-50 py-2 text-center text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors"
          >
            Upgrade to unlock
          </a>
        ) : isActive ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 py-2 text-center text-sm font-medium text-slate-400">
            Currently active
          </div>
        ) : (
          <button
            type="button"
            onClick={onSelect}
            disabled={isPending}
            className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            {isPending ? 'Applying…' : 'Use this theme'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Themes() {
  const api = useApi();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => api.get<{ tenant: Tenant }>('/tenants/me'),
  });

  const updateMutation = useMutation({
    mutationFn: (theme_id: ThemeId) => api.patch<{ tenant: Tenant }>('/tenants/me', { theme_id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] }),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !data?.tenant) {
    return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Failed to load themes.</div>;
  }

  const tenant = data.tenant;
  const activeTheme = tenant.theme_id as ThemeId;
  const isPro = tenant.plan === 'pro' || tenant.plan === 'business';

  const freeThemes = THEMES.filter((t) => !t.premium);
  const premiumThemes = THEMES.filter((t) => t.premium);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Themes</h1>
        <p className="mt-1 text-sm text-slate-500">
          Choose a storefront theme. Changes take effect immediately on your live site.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {freeThemes.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isActive={activeTheme === theme.id}
            isLocked={false}
            isPending={updateMutation.isPending && updateMutation.variables === theme.id}
            onSelect={() => updateMutation.mutate(theme.id)}
          />
        ))}
      </div>

      {/* Premium divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          ★ Pro &amp; Business themes
        </span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {!isPro && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Upgrade to <strong>Pro</strong> or <strong>Business</strong> to unlock 6 premium themes.{' '}
          <a href="/dashboard/billing" className="font-semibold underline">
            View plans →
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {premiumThemes.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isActive={activeTheme === theme.id}
            isLocked={!isPro}
            isPending={updateMutation.isPending && updateMutation.variables === theme.id}
            onSelect={() => updateMutation.mutate(theme.id)}
          />
        ))}
      </div>
    </div>
  );
}
