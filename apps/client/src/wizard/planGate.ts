import { useQuery } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import type { ThemeId } from '../themes/types';
import type { WizardState } from './wizardStore';

export const PREMIUM_THEME_IDS = new Set<string>(['obsidian', 'aurora', 'magazine', 'brutalist', 'neon-tokyo', 'craft']);

/** The free look closest in style to each Pro theme (kept in step with the server) */
export const FREE_THEME_FOR: Record<string, ThemeId> = {
  obsidian: 'editorial',
  aurora: 'ink',
  magazine: 'minimal',
  brutalist: 'bold',
  'neon-tokyo': 'bold',
  craft: 'warm',
};

export const THEME_LABEL: Record<string, string> = {
  obsidian: 'Obsidian', aurora: 'Aurora', magazine: 'Magazine', brutalist: 'Brutalist', 'neon-tokyo': 'Neon Tokyo', craft: 'Craft',
  editorial: 'Editorial', ink: 'Ink', minimal: 'Minimal', bold: 'Bold', warm: 'Warm',
};

export interface StarterLimits { products: number | null; services: number | null }

export function useStarterLimits(): StarterLimits | null {
  const api = useApi();
  const q = useQuery({
    queryKey: ['wizard', 'plan-limits'],
    queryFn: () => api.get<{ starter: StarterLimits }>('/wizard/plan-limits'),
    staleTime: 5 * 60_000,
  });
  return q.data?.starter ?? null;
}

export interface PlanIssue {
  kind: 'theme' | 'products' | 'services';
  label: string;
}

/** What the store has chosen that the free Starter plan doesn't include (nothing, once Pro or Business is picked) */
export function planIssues(state: Pick<WizardState, 'plan' | 'themeId' | 'products' | 'services' | 'mode'>, limits: StarterLimits | null): PlanIssue[] {
  if (state.plan !== 'starter') return [];
  const issues: PlanIssue[] = [];
  if (PREMIUM_THEME_IDS.has(state.themeId)) issues.push({ kind: 'theme', label: `the ${THEME_LABEL[state.themeId] ?? state.themeId} theme` });
  if (limits?.products != null && state.mode !== 'book' && state.products.length > limits.products) {
    issues.push({ kind: 'products', label: `${state.products.length} products (Starter includes ${limits.products})` });
  }
  if (limits?.services != null && state.mode !== 'store' && state.services.length > limits.services) {
    issues.push({ kind: 'services', label: `${state.services.length} services (Starter includes ${limits.services})` });
  }
  return issues;
}
