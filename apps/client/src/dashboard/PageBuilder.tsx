import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, X } from 'lucide-react';
import { useApi } from '../lib/api';
import type { Tenant } from '../types';
import type { ThemeId } from '../types';
import Button from '../components/shared/Button';
import Spinner from '../components/shared/Spinner';
import ThemeRenderer from '../themes/ThemeRenderer';
import type { ThemeData } from '../themes/types';
import type { PageContent, ContentFieldSchema } from '../themes/content';
import { contentSchema as minimalSchema } from '../themes/minimal/config';

// Schema registry — add entries as more themes are wired for editable text.
const schemaByTheme: Partial<Record<ThemeId, ContentFieldSchema[]>> = {
  minimal: minimalSchema,
};

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
    paymentsEnabled: true,
  };
}

// Groups a flat field list by section name, preserving insertion order.
function groupBySection(fields: ContentFieldSchema[]): [string, ContentFieldSchema[]][] {
  const map = new Map<string, ContentFieldSchema[]>();
  for (const f of fields) {
    if (!map.has(f.section)) map.set(f.section, []);
    map.get(f.section)!.push(f);
  }
  return [...map.entries()];
}

// ── Desktop: browser-chrome wrapper around the live inline-edit preview ────────
function DesktopPreview({
  tenant,
  themeData,
  content,
  viewport,
  onViewport,
  onEdit,
}: {
  tenant: Tenant;
  themeData: ThemeData;
  content: PageContent;
  viewport: Viewport;
  onViewport: (v: Viewport) => void;
  onEdit: (key: string, value: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-green-400" />
          <span className="ml-3 truncate text-xs text-slate-400">/{tenant.slug}</span>
        </div>
        <div className="flex rounded-lg border border-slate-200 p-0.5">
          <button
            type="button"
            onClick={() => onViewport('desktop')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              viewport === 'desktop' ? 'bg-slate-900 text-white' : 'text-slate-600'
            }`}
          >
            Desktop
          </button>
          <button
            type="button"
            onClick={() => onViewport('mobile')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              viewport === 'mobile' ? 'bg-slate-900 text-white' : 'text-slate-600'
            }`}
          >
            Mobile
          </button>
        </div>
      </div>
      <div className="flex justify-center overflow-auto p-4" style={{ maxHeight: '72vh' }}>
        <div
          className="origin-top bg-white shadow-sm transition-all"
          style={{
            width: viewport === 'mobile' ? 390 : '100%',
            maxWidth: viewport === 'mobile' ? 390 : 1280,
          }}
        >
          <ThemeRenderer
            themeId={tenant.theme_id}
            theme={themeData}
            content={content}
            editing
            onEditContent={onEdit}
            products={[]}
            services={[]}
            staff={[]}
          />
        </div>
      </div>
    </div>
  );
}

// ── Mobile: field-by-section form panel ───────────────────────────────────────
function MobileFieldsPanel({
  schema,
  content,
  onChange,
}: {
  schema: ContentFieldSchema[];
  content: PageContent;
  onChange: (key: string, value: string) => void;
}) {
  const sections = groupBySection(schema);
  const [open, setOpen] = useState<string | null>(sections[0]?.[0] ?? null);

  return (
    <div className="flex flex-col gap-3">
      {sections.map(([section, fields]) => (
        <div key={section} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setOpen(open === section ? null : section)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-sm font-semibold text-slate-900">{section}</span>
            <span className="text-xs text-slate-400">{open === section ? '▲' : '▼'}</span>
          </button>
          {open === section && (
            <div className="flex flex-col gap-4 border-t border-slate-100 px-4 pb-4 pt-3">
              {fields.map((field) => (
                <label key={field.key} className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-600">{field.label}</span>
                  <input
                    type="text"
                    value={content[field.key] ?? field.fallback}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Mobile: slide-up preview sheet ────────────────────────────────────────────
function PreviewSheet({
  tenant,
  themeData,
  content,
  onClose,
}: {
  tenant: Tenant;
  themeData: ThemeData;
  content: PageContent;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Scrim */}
      <div className="flex-shrink-0 bg-black/40 py-4 px-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Preview</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/20 p-1.5 text-white hover:bg-white/30"
            aria-label="Close preview"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      {/* Sheet */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-t-2xl bg-white">
        <div className="flex items-center gap-1.5 border-b border-slate-200 bg-white px-4 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          <span className="ml-2 truncate text-xs text-slate-400">/{tenant.slug}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ThemeRenderer
            themeId={tenant.theme_id}
            theme={themeData}
            content={content}
            products={[]}
            services={[]}
            staff={[]}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
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
  const [previewOpen, setPreviewOpen] = useState(false);

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
  const schema = data?.tenant ? (schemaByTheme[data.tenant.theme_id] ?? []) : [];

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

  const hasSchema = schema.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Page Builder</h1>
          <p className="hidden text-sm text-slate-500 lg:block">
            Click any highlighted text in the preview to edit it inline.
          </p>
          <p className="text-sm text-slate-500 lg:hidden">
            Edit your storefront text below, then preview or save.
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Mobile: fields + floating preview button */}
      <div className="lg:hidden">
        {hasSchema ? (
          <MobileFieldsPanel schema={schema} content={content} onChange={handleEdit} />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            Inline text editing isn&apos;t available for this theme yet — switch to the{' '}
            <strong>Minimal</strong> theme to try it out.
          </div>
        )}

        {/* Floating preview button */}
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-slate-700 active:scale-95 transition-transform"
        >
          <Eye size={16} />
          Preview
        </button>

        {/* Slide-up preview sheet */}
        {previewOpen && (
          <PreviewSheet
            tenant={data.tenant}
            themeData={themeData}
            content={content}
            onClose={() => setPreviewOpen(false)}
          />
        )}
      </div>

      {/* Desktop: inline click-to-edit preview */}
      <div className="hidden lg:block">
        {hasSchema ? (
          <div className="mb-2 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 px-4 py-2 text-xs text-indigo-700">
            <span className="font-semibold">Tip:</span> click any dashed-outlined text in the
            preview to edit it. Links and buttons won&apos;t navigate while you&apos;re editing.
          </div>
        ) : (
          <div className="mb-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
            Inline text editing isn&apos;t available for this theme yet. Switch to the{' '}
            <strong>Minimal</strong> theme to try it out.
          </div>
        )}
        <DesktopPreview
          tenant={data.tenant}
          themeData={themeData}
          content={content}
          viewport={viewport}
          onViewport={setViewport}
          onEdit={handleEdit}
        />
      </div>
    </div>
  );
}
