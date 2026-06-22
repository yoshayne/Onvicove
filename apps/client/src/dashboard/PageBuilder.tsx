import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import type { Tenant } from '../types';
import Button from '../components/shared/Button';
import Spinner from '../components/shared/Spinner';
import ThemeRenderer from '../themes/ThemeRenderer';
import type { ThemeData } from '../themes/types';
import type { PageContent } from '../themes/content';

type Viewport = 'desktop' | 'mobile';

function mapTheme(tenant: Tenant): ThemeData {
  return {
    companyName: tenant.company_name,
    tagline: tenant.tagline ?? undefined,
    logoUrl: tenant.logo_url,
    heroImageUrl: tenant.hero_image_url,
    brandColor: tenant.brand_color ?? undefined,
    mode: tenant.mode,
    currency: tenant.currency,
    city: tenant.city ?? undefined,
    industry: tenant.industry ?? undefined,
    themeId: tenant.theme_id,
    slug: tenant.slug,
    // Editing preview is decoupled from real payments; show the enabled CTA labels.
    paymentsEnabled: true,
  };
}

export default function PageBuilder() {
  const api = useApi();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => api.get<{ tenant: Tenant }>('/tenants/me'),
  });

  const [content, setContent] = useState<PageContent>({});
  const [dirty, setDirty] = useState(false);
  const [viewport, setViewport] = useState<Viewport>('desktop');

  // Initialise editable content once the tenant loads.
  useEffect(() => {
    if (data?.tenant) {
      setContent(data.tenant.page_content ?? {});
      setDirty(false);
    }
  }, [data?.tenant]);

  const saveMutation = useMutation({
    mutationFn: (next: PageContent) =>
      api.put<{ tenant: Tenant }>('/tenants/me/page-content', { page_content: next }),
    onSuccess: (res) => {
      queryClient.setQueryData(['tenant', 'me'], res);
      setDirty(false);
    },
  });

  const themeData = useMemo(() => (data?.tenant ? mapTheme(data.tenant) : null), [data?.tenant]);

  function handleEdit(key: string, value: string) {
    setContent((prev) => {
      if (prev[key] === value) return prev;
      return { ...prev, [key]: value };
    });
    setDirty(true);
  }

  function handleReset() {
    setContent(data?.tenant?.page_content ?? {});
    setDirty(false);
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !data?.tenant || !themeData) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Failed to load your storefront.</div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Page Builder</h1>
          <p className="text-sm text-slate-500">
            Click any text in the live preview below to edit it, then save to publish to your
            storefront.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 p-0.5">
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                viewport === 'desktop' ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`}
            >
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                viewport === 'mobile' ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`}
            >
              Mobile
            </button>
          </div>
          {dirty && (
            <Button variant="secondary" size="sm" onClick={handleReset} disabled={saveMutation.isPending}>
              Discard
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => saveMutation.mutate(content)}
            disabled={!dirty || saveMutation.isPending}
            isLoading={saveMutation.isPending}
          >
            {saveMutation.isSuccess && !dirty ? 'Saved' : 'Save changes'}
          </Button>
        </div>
      </div>

      {saveMutation.isError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Couldn&apos;t save your changes. Please try again.
        </div>
      )}

      <div className="rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 px-4 py-2 text-xs text-indigo-700">
        <span className="font-semibold">Editing mode:</span> highlighted text is editable. Buttons and
        links won&apos;t navigate while you edit. Inline editing is available on the Minimal theme so
        far — more themes coming.
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        <div className="flex items-center gap-1.5 border-b border-slate-200 bg-white px-4 py-2">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-green-400" />
          <span className="ml-3 truncate text-xs text-slate-400">/{data.tenant.slug}</span>
        </div>
        <div className="flex justify-center overflow-auto p-4" style={{ maxHeight: '75vh' }}>
          <div
            className="ssd-editor-preview origin-top bg-white shadow-sm transition-all"
            style={{
              width: viewport === 'mobile' ? 390 : '100%',
              maxWidth: viewport === 'mobile' ? 390 : 1280,
            }}
          >
            <ThemeRenderer
              themeId={data.tenant.theme_id}
              theme={themeData}
              content={content}
              editing
              onEditContent={handleEdit}
              products={[]}
              services={[]}
              staff={[]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
