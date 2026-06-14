import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import type { Tenant, ThemeId } from '../types';
import Spinner from '../components/shared/Spinner';
import Badge from '../components/shared/Badge';
import Button from '../components/shared/Button';

interface ThemeOption {
  id: ThemeId;
  name: string;
  colors: { bg: string; surface: string; text: string; accent: string };
}

const THEMES: ThemeOption[] = [
  {
    id: 'editorial',
    name: 'Editorial',
    colors: { bg: '#ffffff', surface: '#f5f5f5', text: '#111111', accent: '#d4a96a' },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    colors: { bg: '#ffffff', surface: '#fafafa', text: '#1f1f1f', accent: '#000000' },
  },
  {
    id: 'bold',
    name: 'Bold',
    colors: { bg: '#0a0a0a', surface: '#161616', text: '#ffffff', accent: '#e8ff00' },
  },
  {
    id: 'warm',
    name: 'Warm',
    colors: { bg: '#fdf8f3', surface: '#f5e8d8', text: '#3d2314', accent: '#8b5e3c' },
  },
  {
    id: 'classic',
    name: 'Classic',
    colors: { bg: '#ffffff', surface: '#f5f5f5', text: '#1a3a5c', accent: '#c8a850' },
  },
  {
    id: 'bright',
    name: 'Bright',
    colors: { bg: '#ffffff', surface: '#eef6ff', text: '#10243e', accent: '#ff5a5f' },
  },
];

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
    return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Failed to load theme.</div>;
  }

  const activeTheme = data.tenant.theme_id;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-slate-900">Themes</h1>
      <p className="text-sm text-slate-500">
        Choose a storefront theme. This changes the look and feel of your public storefront.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {THEMES.map((theme) => (
          <div
            key={theme.id}
            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">{theme.name}</span>
              {activeTheme === theme.id && <Badge tone="success">Active</Badge>}
            </div>
            <div
              className="flex h-24 overflow-hidden rounded-lg border border-slate-200"
              style={{ backgroundColor: theme.colors.bg }}
            >
              <div className="flex w-1/2 flex-col items-start gap-1 p-2" style={{ color: theme.colors.text }}>
                <div className="h-2 w-3/4 rounded" style={{ backgroundColor: theme.colors.text }} />
                <div className="h-2 w-1/2 rounded opacity-60" style={{ backgroundColor: theme.colors.text }} />
                <div
                  className="mt-2 h-4 w-12 rounded"
                  style={{ backgroundColor: theme.colors.accent }}
                />
              </div>
              <div className="w-1/2" style={{ backgroundColor: theme.colors.surface }} />
            </div>
            <Button
              size="sm"
              variant={activeTheme === theme.id ? 'secondary' : 'primary'}
              disabled={activeTheme === theme.id}
              isLoading={updateMutation.isPending && updateMutation.variables === theme.id}
              onClick={() => updateMutation.mutate(theme.id)}
            >
              {activeTheme === theme.id ? 'Currently active' : 'Use this theme'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
