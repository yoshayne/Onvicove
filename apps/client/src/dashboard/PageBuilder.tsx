import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Monitor, Tablet, Smartphone, ExternalLink, Save, RefreshCw,
  GripVertical, Eye, EyeOff, ChevronDown, ChevronRight, Plus,
  Home, ShoppingBag, Sparkles, Info, Image as ImageIcon, Users,
  Star, MapPin, Trash2, Upload, Lock, RotateCcw, Check,
  Palette, Type, Phone, Mail, Clock,
  type LucideIcon,
} from 'lucide-react';
import { useApi } from '../lib/api';
import type { Tenant } from '../types';
import Spinner from '../components/shared/Spinner';
import { GALLERY_LAYOUTS } from '../themes/shared/Gallery';
import type { GalleryLayout, GalleryImageData } from '../themes/shared/Gallery';

// ── Types ─────────────────────────────────────────────────────────────────────

type SectionType =
  | 'hero' | 'featured-products' | 'services' | 'about'
  | 'gallery' | 'staff' | 'testimonials' | 'contact';

interface Section {
  id: string;
  type: SectionType | string;
  enabled: boolean;
  // gallery-specific
  title?: string;
  layout?: GalleryLayout;
  images?: GalleryImageData[];
}

type Device = 'desktop' | 'tablet' | 'mobile';
type EditorTab = 'sections' | 'content' | 'theme';

// ── Theme catalog (mirrors Themes.tsx) ────────────────────────────────────────

interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
  colors: string[];
  premium?: boolean;
}

type ThemeId = 'editorial' | 'minimal' | 'bold' | 'warm' | 'classic' | 'bright' | 'obsidian' | 'aurora' | 'magazine' | 'brutalist' | 'neon-tokyo' | 'craft';

const THEMES: ThemeOption[] = [
  { id: 'editorial',   name: 'Editorial',   description: 'Dark luxury, serif headlines',     colors: ['#1a1a1a', '#d4a96a', '#ffffff'] },
  { id: 'minimal',     name: 'Minimal',     description: 'Swiss grid, clean whitespace',     colors: ['#ffffff', '#111111', '#f8f8f8'] },
  { id: 'bold',        name: 'Bold',        description: 'Streetwear, neon accents',         colors: ['#0a0a0a', '#e8ff00', '#ffffff'] },
  { id: 'warm',        name: 'Warm',        description: 'Wellness & artisan feel',          colors: ['#fdf8f3', '#8b5e3c', '#3d2314'] },
  { id: 'classic',     name: 'Classic',     description: 'Professional & formal',            colors: ['#1a3a5c', '#c8a850', '#ffffff'] },
  { id: 'bright',      name: 'Bright',      description: 'Gen Z, playful pastels',           colors: ['#ff3cac', '#f0f0ff', '#ffffff'] },
  { id: 'obsidian',    name: 'Obsidian',    description: 'Black luxury, gold accents',       colors: ['#000000', '#c9a84c', '#111111'], premium: true },
  { id: 'aurora',      name: 'Aurora',      description: 'Gradient & glassmorphism',         colors: ['#0d0d1a', '#a78bfa', '#1a0533'], premium: true },
  { id: 'magazine',    name: 'Magazine',    description: 'Editorial asymmetric grid',        colors: ['#f8f6f1', '#1a1a1a', '#eeece7'], premium: true },
  { id: 'brutalist',   name: 'Brutalist',   description: 'Raw, bold, unconventional',        colors: ['#ffffff', '#000000', '#0000ff'], premium: true },
  { id: 'neon-tokyo',  name: 'Neon Tokyo',  description: 'Cyberpunk neon energy',            colors: ['#050510', '#ff2d9b', '#0a0a20'], premium: true },
  { id: 'craft',       name: 'Craft',       description: 'Handmade paper textures',          colors: ['#f5f0e8', '#5c4a32', '#ece5d8'], premium: true },
];

const BRAND_COLOR_PRESETS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#0ea5e9', '#64748b', '#000000',
];

// ── Section metadata ──────────────────────────────────────────────────────────

const SECTION_META: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  hero:               { label: 'Hero Banner',        icon: Home,      color: 'bg-violet-100 text-violet-600' },
  'featured-products':{ label: 'Featured Products',  icon: ShoppingBag, color: 'bg-blue-100 text-blue-600' },
  services:           { label: 'Services List',      icon: Sparkles,  color: 'bg-orange-100 text-orange-600' },
  about:              { label: 'About Section',      icon: Info,      color: 'bg-green-100 text-green-600' },
  gallery:            { label: 'Gallery',            icon: ImageIcon, color: 'bg-pink-100 text-pink-600' },
  staff:              { label: 'Meet the Team',      icon: Users,     color: 'bg-teal-100 text-teal-600' },
  testimonials:       { label: 'Testimonials',       icon: Star,      color: 'bg-yellow-100 text-yellow-600' },
  contact:            { label: 'Contact / Location', icon: MapPin,    color: 'bg-red-100 text-red-600' },
};

const ADDABLE_SECTIONS: SectionType[] = ['hero', 'featured-products', 'services', 'about', 'gallery', 'staff', 'testimonials', 'contact'];

const DEFAULT_SECTIONS: Section[] = [
  { id: 'hero',              type: 'hero',               enabled: true  },
  { id: 'featured-products', type: 'featured-products',  enabled: true  },
  { id: 'services',          type: 'services',           enabled: true  },
  { id: 'about',             type: 'about',              enabled: true  },
  { id: 'gallery-default',   type: 'gallery',            enabled: false, layout: 'grid', images: [] },
  { id: 'staff',             type: 'staff',              enabled: false },
  { id: 'testimonials',      type: 'testimonials',       enabled: false },
  { id: 'contact',           type: 'contact',            enabled: true  },
];

const DEVICE_WIDTHS: Record<Device, string> = {
  desktop: '100%',
  tablet:  '768px',
  mobile:  '390px',
};

// ── Gallery inline editor ─────────────────────────────────────────────────────

function GalleryEditor({
  section, onChange, uploadingFor, onUpload, onRemoveImage, onUpdateCaption,
}: {
  section: Section;
  onChange: (patch: Partial<Section>) => void;
  uploadingFor: string | null;
  onUpload: (id: string, files: FileList) => void;
  onRemoveImage: (id: string, index: number) => void;
  onUpdateCaption: (id: string, index: number, caption: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-3 pb-3 pt-3">
      <select
        value={section.layout ?? 'grid'}
        onChange={(e) => onChange({ layout: e.target.value as GalleryLayout })}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
      >
        {GALLERY_LAYOUTS.map((l) => (
          <option key={l.id} value={l.id}>{l.label} — {l.description}</option>
        ))}
      </select>

      <div className="grid grid-cols-4 gap-1.5">
        {(section.images ?? []).map((img, i) => (
          <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200">
            <img src={img.url} alt={img.caption ?? ''} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onRemoveImage(section.id, i)}
              className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Trash2 size={9} />
            </button>
            <input
              type="text"
              value={img.caption ?? ''}
              onChange={(e) => onUpdateCaption(section.id, i, e.target.value)}
              placeholder="Caption"
              className="absolute inset-x-0 bottom-0 bg-black/50 px-1 py-0.5 text-[9px] text-white placeholder:text-white/50 focus:outline-none"
            />
          </div>
        ))}
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-slate-300 text-slate-400 hover:border-violet-400 hover:text-violet-500">
          {uploadingFor === section.id ? <Spinner size="sm" /> : <Upload size={14} />}
          <span className="text-[9px] font-medium">Add photos</span>
          <input
            type="file" accept="image/*" multiple className="hidden"
            disabled={uploadingFor === section.id}
            onChange={(e) => { if (e.target.files?.length) onUpload(section.id, e.target.files); e.target.value = ''; }}
          />
        </label>
      </div>
    </div>
  );
}

// ── Section row ───────────────────────────────────────────────────────────────

function SectionRow({
  section, isDragging, isDragOver, isExpanded,
  onDragStart, onDragOver, onDrop, onDragEnd,
  onToggle, onExpand,
  uploadingFor, onGalleryChange, onUpload, onRemoveImage, onUpdateCaption,
}: {
  section: Section;
  isDragging: boolean;
  isDragOver: boolean;
  isExpanded: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onToggle: () => void;
  onExpand: () => void;
  uploadingFor: string | null;
  onGalleryChange: (patch: Partial<Section>) => void;
  onUpload: (id: string, files: FileList) => void;
  onRemoveImage: (id: string, index: number) => void;
  onUpdateCaption: (id: string, index: number, caption: string) => void;
}) {
  const meta = SECTION_META[section.type] ?? { label: section.type, icon: Home, color: 'bg-slate-100 text-slate-500' };
  const Icon = meta.icon;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`rounded-xl border bg-white transition-all duration-150 ${
        isDragOver ? 'border-violet-400 shadow-md shadow-violet-100' : 'border-slate-200'
      } ${isDragging ? 'opacity-40 scale-98' : ''}`}
    >
      {/* Row header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Drag handle */}
        <div className="shrink-0 cursor-grab text-slate-300 hover:text-slate-400 active:cursor-grabbing">
          <GripVertical size={16} />
        </div>

        {/* Icon */}
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${meta.color}`}>
          <Icon size={13} />
        </div>

        {/* Label */}
        <span className="flex-1 text-sm font-semibold text-slate-800">{meta.label}</span>

        {/* Eye toggle */}
        <button
          type="button"
          onClick={onToggle}
          className={`rounded-md p-1 transition-colors ${
            section.enabled ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-300 hover:text-slate-400'
          }`}
          aria-label={section.enabled ? 'Hide section' : 'Show section'}
        >
          {section.enabled ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>

        {/* Expand chevron */}
        <button
          type="button"
          onClick={onExpand}
          className="rounded-md p-1 text-slate-400 transition-colors hover:text-slate-600"
          aria-label="Toggle section settings"
        >
          {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        section.type === 'gallery' ? (
          <GalleryEditor
            section={section}
            onChange={onGalleryChange}
            uploadingFor={uploadingFor}
            onUpload={onUpload}
            onRemoveImage={onRemoveImage}
            onUpdateCaption={onUpdateCaption}
          />
        ) : (
          <div className="border-t border-slate-100 px-3 py-3">
            {section.type === 'hero' && (
              <p className="text-xs text-slate-500">Edit hero text in the <strong>Content</strong> tab above.</p>
            )}
            {section.type === 'about' && (
              <p className="text-xs text-slate-500">Edit about section copy in the <strong>Content</strong> tab above.</p>
            )}
            {section.type === 'contact' && (
              <p className="text-xs text-slate-500">Edit contact details &amp; hours in the <strong>Content</strong> tab above.</p>
            )}
            {!['hero', 'about', 'contact'].includes(section.type) && (
              <p className="text-xs text-slate-400">This section pulls live data from your products, services, or staff.</p>
            )}
          </div>
        )
      )}
    </div>
  );
}

// ── Add section popover ───────────────────────────────────────────────────────

function AddSectionMenu({
  existing, onAdd, onClose,
}: {
  existing: Section[];
  onAdd: (type: SectionType) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  // Gallery can be added multiple times; others only once
  const available = ADDABLE_SECTIONS.filter(
    (t) => t === 'gallery' || !existing.some((s) => s.type === t)
  );

  return (
    <div ref={ref} className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-10">
      <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Add a section</p>
      {available.length === 0 ? (
        <p className="px-2 py-2 text-xs text-slate-400">All sections already added.</p>
      ) : (
        available.map((type) => {
          const meta = SECTION_META[type];
          const Icon = meta.icon;
          return (
            <button
              key={type}
              type="button"
              onClick={() => { onAdd(type); onClose(); }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-50"
            >
              <div className={`flex h-6 w-6 items-center justify-center rounded-md ${meta.color}`}>
                <Icon size={12} />
              </div>
              <span className="font-medium text-slate-700">{meta.label}</span>
            </button>
          );
        })
      )}
    </div>
  );
}

// ── Content field component ───────────────────────────────────────────────────

function ContentField({
  label, value, onChange, multiline = false, placeholder = '',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  const cls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none';
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      {multiline ? (
        <textarea rows={3} className={cls} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input type="text" className={cls} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PageBuilder() {
  const api = useApi();
  const queryClient = useQueryClient();

  // ── State ──────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<EditorTab>('sections');
  const [device, setDevice] = useState<Device>('desktop');
  const [sections, setSections] = useState<Section[]>(DEFAULT_SECTIONS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Content tab state
  const [contentFields, setContentFields] = useState({
    tagline: '',
    'about.text': '',
    'contact.email': '',
    'contact.phone': '',
    'contact.address': '',
    'contact.hours': '',
  });
  const [contentDirty, setContentDirty] = useState(false);
  const [contentSaving, setContentSaving] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [heroImageOpacity, setHeroImageOpacity] = useState(100);
  const [heroUploading, setHeroUploading] = useState(false);
  const [heroUploadError, setHeroUploadError] = useState<string | null>(null);
  const heroOpacitySaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Theme tab state
  const [selectedThemeId, setSelectedThemeId] = useState<ThemeId | null>(null);
  const [brandColor, setBrandColor] = useState('');
  const [themeDirty, setThemeDirty] = useState(false);
  const [themeSaving, setThemeSaving] = useState(false);

  // ── Data ───────────────────────────────────────────────────────────────────
  const tenantQ = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => api.get<{ tenant: Tenant }>('/tenants/me'),
  });

  const pageSectionsQ = useQuery({
    queryKey: ['page-sections', 'home'],
    queryFn: () => api.get<{ sections: Section[] }>('/page-sections/home'),
  });

  // Initialize content fields from tenant
  useEffect(() => {
    const t = tenantQ.data?.tenant;
    if (!t) return;
    const pc = (t.page_content as Record<string, string>) ?? {};
    setContentFields({
      tagline: t.tagline ?? '',
      'about.text': pc['about.text'] ?? '',
      'contact.email': pc['contact.email'] ?? '',
      'contact.phone': pc['contact.phone'] ?? '',
      'contact.address': pc['contact.address'] ?? '',
      'contact.hours': pc['contact.hours'] ?? '',
    });
    setHeroImageUrl(t.hero_image_url ?? null);
    if (pc['hero.image_opacity'] !== undefined) setHeroImageOpacity(Number(pc['hero.image_opacity']));
    // Initialize theme tab (only on first load — don't reset while user is editing)
    if (!themeDirty) {
      setSelectedThemeId((t.theme_id as ThemeId) ?? 'editorial');
      setBrandColor(t.brand_color ?? '');
    }
  }, [tenantQ.data]);

  // Initialize sections from API
  useEffect(() => {
    if (!pageSectionsQ.data) return;
    let raw = pageSectionsQ.data.sections ?? [];
    // Guard: server bug (now fixed) could double-encode sections as a JSON string
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw as unknown as string); } catch { raw = []; }
    }
    if (!Array.isArray(raw)) { setSections(DEFAULT_SECTIONS); return; }
    if (raw.length === 0) { setSections(DEFAULT_SECTIONS); return; }

    const hasThemeSections = raw.some((s) => s.type !== 'gallery');
    if (hasThemeSections) {
      setSections(raw);
    } else {
      // Legacy: only gallery sections stored — merge with defaults
      const themeDefaults = DEFAULT_SECTIONS.filter((s) => s.type !== 'gallery');
      const galleries = raw;
      setSections([
        ...themeDefaults.slice(0, 4),
        ...galleries,
        ...themeDefaults.slice(5),
      ]);
    }
  }, [pageSectionsQ.data]);

  const saveMutation = useMutation({
    mutationFn: (next: Section[]) =>
      api.put<{ sections: Section[] }>('/page-sections/home', { sections: next }),
    onSuccess: () => {
      setIsDirty(false);
      setLastSaved(new Date());
      setPreviewKey((k) => k + 1);
    },
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  function mutateSections(fn: (prev: Section[]) => Section[]) {
    setSections((prev) => fn(prev));
    setIsDirty(true);
  }

  function handleSave() {
    saveMutation.mutate(sections);
  }

  function handleReset() {
    if (!confirm('Reset to default sections? This cannot be undone.')) return;
    setSections(DEFAULT_SECTIONS);
    setIsDirty(true);
  }

  function setContent(key: keyof typeof contentFields, value: string) {
    setContentFields((prev) => ({ ...prev, [key]: value }));
    setContentDirty(true);
  }

  async function handleHeroImageUpload(file: File) {
    setHeroUploading(true);
    setHeroUploadError(null);
    try {
      const res = await api.upload<{ key: string; url: string }>('/uploads', file);
      await api.patch('/tenants/me', { hero_image_key: res.key });
      setHeroImageUrl(res.url);
      setPreviewKey((k) => k + 1);
      queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] });
    } catch (err) {
      setHeroUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setHeroUploading(false);
    }
  }

  async function handleHeroImageRemove() {
    setHeroUploading(true);
    try {
      await api.patch('/tenants/me', { hero_image_key: null });
      setHeroImageUrl(null);
      setPreviewKey((k) => k + 1);
      queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] });
    } finally {
      setHeroUploading(false);
    }
  }

  async function handleContentSave() {
    setContentSaving(true);
    try {
      const { tagline, ...pageContentFields } = contentFields;
      await Promise.all([
        api.patch('/tenants/me', { tagline: tagline || null }),
        api.put('/tenants/me/page-content', {
          page_content: {
            ...Object.fromEntries(
              Object.entries(pageContentFields).filter(([, v]) => v.trim() !== '')
            ),
            'hero.image_opacity': String(heroImageOpacity),
          },
        }),
      ]);
      setContentDirty(false);
      setPreviewKey((k) => k + 1);
      queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] });
    } finally {
      setContentSaving(false);
    }
  }

  async function handleThemeSave() {
    if (!selectedThemeId) return;
    setThemeSaving(true);
    try {
      await api.patch('/tenants/me', {
        theme_id: selectedThemeId,
        brand_color: brandColor || null,
      });
      setThemeDirty(false);
      setPreviewKey((k) => k + 1);
      queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] });
    } finally {
      setThemeSaving(false);
    }
  }

  // Drag-and-drop
  function handleDragStart(index: number) { setDragIndex(index); }
  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }
  function handleDrop(index: number) {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    // Compute new order synchronously so we can save it immediately
    const next = [...sections];
    const [removed] = next.splice(dragIndex, 1);
    next.splice(index, 0, removed);
    setSections(next);
    setIsDirty(false);
    setDragIndex(null);
    setDragOverIndex(null);
    // Auto-save + refresh preview so the reorder is visible immediately
    saveMutation.mutate(next);
  }
  function handleDragEnd() { setDragIndex(null); setDragOverIndex(null); }

  // Toggle section visibility — auto-save so preview reflects the change immediately
  function toggleSection(id: string) {
    const next = sections.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
    setSections(next);
    setIsDirty(false);
    saveMutation.mutate(next);
  }

  // Expand / collapse
  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  // Add section
  function addSection(type: SectionType) {
    const newSection: Section = {
      id: crypto.randomUUID(),
      type,
      enabled: true,
      ...(type === 'gallery' ? { layout: 'grid', images: [] } : {}),
    };
    mutateSections((prev) => [...prev, newSection]);
  }

  // Gallery mutations
  function updateGallery(id: string, patch: Partial<Section>) {
    mutateSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function uploadGalleryImages(id: string, files: FileList) {
    setUploadingFor(id);
    try {
      for (const file of Array.from(files)) {
        const res = await api.upload<{ url: string }>('/uploads', file);
        setSections((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, images: [...(s.images ?? []), { url: res.url }] } : s
          )
        );
      }
      setIsDirty(true);
    } finally {
      setUploadingFor(null);
    }
  }

  function removeGalleryImage(id: string, index: number) {
    mutateSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, images: s.images?.filter((_, i) => i !== index) } : s))
    );
  }

  function updateGalleryCaption(id: string, index: number, caption: string) {
    mutateSections((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, images: s.images?.map((img, i) => (i === index ? { ...img, caption } : img)) }
          : s
      )
    );
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const tenant = tenantQ.data?.tenant;
  const siteHref = tenant?.custom_domain_verified && tenant?.custom_domain
    ? `https://${tenant.custom_domain}`
    : tenant?.slug ? `/${tenant.slug}` : null;
  const isPublished = !!(tenant?.wizard_completed && tenant?.is_active);

  const statusLabel = saveMutation.isPending
    ? 'Saving...'
    : isDirty
    ? 'Unsaved changes'
    : lastSaved
    ? 'All changes saved'
    : pageSectionsQ.isLoading
    ? 'Loading...'
    : 'All changes saved';

  const statusColor = saveMutation.isPending
    ? 'text-slate-400'
    : isDirty
    ? 'text-amber-500'
    : 'text-emerald-600';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Page Builder</h1>
          <p className="text-xs text-slate-400">Design and customize your storefront</p>
        </div>

        {/* Device toggle */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {(['desktop', 'tablet', 'mobile'] as Device[]).map((d) => {
            const icons: Record<Device, LucideIcon> = { desktop: Monitor, tablet: Tablet, mobile: Smartphone };
            const labels: Record<Device, string> = { desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile' };
            const Icon = icons[d];
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDevice(d)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  device === d
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon size={13} />
                {labels[d]}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {siteHref && (
            <a
              href={siteHref} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ExternalLink size={13} />
              Open in new tab
            </a>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending || !isDirty}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saveMutation.isPending ? <Spinner size="sm" /> : <Save size={13} />}
            Save changes
          </button>
        </div>
      </div>

      {/* ── Main split panel ─────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left panel ─────────────────────────────────────────────────── */}
        <div className="flex w-[360px] shrink-0 flex-col border-r border-slate-200 bg-white overflow-hidden">

          {/* Tab switcher */}
          <div className="flex shrink-0 border-b border-slate-200 px-2">
            {(['sections', 'content', 'theme'] as EditorTab[]).map((t) => {
              const tabIcons: Record<EditorTab, LucideIcon> = { sections: Home, content: Type, theme: Palette };
              const tabLabels: Record<EditorTab, string> = { sections: 'Sections', content: 'Content', theme: 'Theme' };
              const TabIcon = tabIcons[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors capitalize ${
                    tab === t
                      ? 'border-b-2 border-violet-600 text-violet-600'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <TabIcon size={13} />
                  {tabLabels[t]}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">

            {/* ── Sections tab ── */}
            {tab === 'sections' && (
              <div className="flex flex-col gap-0 p-4">
                <p className="mb-3 text-xs text-slate-400">Drag to reorder sections on your homepage.</p>

                <div className="flex flex-col gap-2">
                  {sections.map((section, index) => (
                    <SectionRow
                      key={section.id}
                      section={section}
                      isDragging={dragIndex === index}
                      isDragOver={dragOverIndex === index && dragIndex !== index}
                      isExpanded={expandedId === section.id}
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={() => handleDrop(index)}
                      onDragEnd={handleDragEnd}
                      onToggle={() => toggleSection(section.id)}
                      onExpand={() => toggleExpand(section.id)}
                      uploadingFor={uploadingFor}
                      onGalleryChange={(patch) => updateGallery(section.id, patch)}
                      onUpload={uploadGalleryImages}
                      onRemoveImage={removeGalleryImage}
                      onUpdateCaption={updateGalleryCaption}
                    />
                  ))}

                  {/* Add section */}
                  <div className="relative mt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddMenu((v) => !v)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-2.5 text-xs font-semibold text-slate-500 transition-colors hover:border-violet-400 hover:text-violet-600"
                    >
                      <Plus size={13} />
                      Add Section
                    </button>
                    {showAddMenu && (
                      <AddSectionMenu
                        existing={sections}
                        onAdd={addSection}
                        onClose={() => setShowAddMenu(false)}
                      />
                    )}
                  </div>
                </div>

                {/* Section tips */}
                <div className="mt-4 rounded-xl bg-slate-50 p-3.5">
                  <p className="mb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Section Tips</p>
                  <ul className="flex flex-col gap-1.5">
                    {[
                      { icon: GripVertical, text: 'Drag sections to change the order.' },
                      { icon: Eye,          text: 'Click the eye icon to show or hide.' },
                      { icon: ChevronRight, text: 'Click a section to customize its content.' },
                    ].map((tip, i) => (
                      <li key={i} className="flex items-center gap-2 text-[11px] text-slate-400">
                        <tip.icon size={12} className="shrink-0" />
                        {tip.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* ── Content tab ── */}
            {tab === 'content' && (
              <div className="flex flex-col gap-0 p-4">
                <p className="mb-4 text-xs text-slate-400">Edit the text that appears on your storefront. Changes update immediately on save.</p>

                {/* Hero */}
                <div className="mb-4 rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50 px-3 py-2.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-100">
                      <Home size={12} className="text-violet-600" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">Hero Section</span>
                  </div>
                  <div className="flex flex-col gap-3 p-3">
                    {/* Hero image uploader */}
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Background image
                      </label>
                      {heroImageUrl ? (
                        <div className="relative overflow-hidden rounded-lg border border-slate-200">
                          <img src={heroImageUrl} alt="Hero" className="h-28 w-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                            <label className="cursor-pointer rounded-md bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-white">
                              {heroUploading ? 'Uploading…' : 'Replace'}
                              <input type="file" accept="image/*" className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleHeroImageUpload(f); }}
                                disabled={heroUploading} />
                            </label>
                            <button type="button" onClick={handleHeroImageRemove} disabled={heroUploading}
                              className="rounded-md bg-red-500/90 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-500">
                              Remove
                            </button>
                          </div>
                          {heroUploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                              <Spinner size="sm" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <label className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 py-6 transition-colors hover:border-violet-400 hover:bg-violet-50 ${heroUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                          {heroUploading ? <Spinner size="sm" /> : <Upload size={18} className="text-slate-400" />}
                          <span className="text-xs text-slate-500">{heroUploading ? 'Uploading…' : 'Click to upload hero image'}</span>
                          <input type="file" accept="image/*" className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleHeroImageUpload(f); }}
                            disabled={heroUploading} />
                        </label>
                      )}
                      {heroUploadError && <p className="mt-1 text-xs text-red-600">{heroUploadError}</p>}
                    </div>

                    {/* Opacity slider — only shown when image is set */}
                    {heroImageUrl && (
                      <div>
                        <label className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          <span>Image opacity</span>
                          <span className="font-mono text-slate-700">{heroImageOpacity}%</span>
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={heroImageOpacity}
                          draggable={false}
                          onDragStart={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setHeroImageOpacity(val);
                            // Instant preview via postMessage
                            iframeRef.current?.contentWindow?.postMessage({ type: 'hero-opacity', value: val / 100 }, '*');
                            // Debounced auto-save
                            if (heroOpacitySaveTimer.current) clearTimeout(heroOpacitySaveTimer.current);
                            heroOpacitySaveTimer.current = setTimeout(async () => {
                              try {
                                await api.put('/tenants/me/page-content', {
                                  page_content: { 'hero.image_opacity': String(val) },
                                });
                                setPreviewKey((k) => k + 1);
                              } catch { /* silent */ }
                            }, 600);
                          }}
                          className="w-full accent-violet-600"
                        />
                        <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                          <span>Hidden</span>
                          <span>Full</span>
                        </div>
                      </div>
                    )}

                    <ContentField
                      label="Tagline / subtext"
                      value={contentFields.tagline}
                      onChange={(v) => setContent('tagline', v)}
                      placeholder="Your brand's main message…"
                    />
                  </div>
                </div>

                {/* About */}
                <div className="mb-4 rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50 px-3 py-2.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-green-100">
                      <Info size={12} className="text-green-600" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">About Section</span>
                  </div>
                  <div className="flex flex-col gap-3 p-3">
                    <ContentField
                      label="About text"
                      value={contentFields['about.text']}
                      onChange={(v) => setContent('about.text', v)}
                      multiline
                      placeholder="Tell visitors about your business…"
                    />
                  </div>
                </div>

                {/* Contact */}
                <div className="mb-4 rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50 px-3 py-2.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-100">
                      <MapPin size={12} className="text-red-500" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">Contact &amp; Hours</span>
                  </div>
                  <div className="flex flex-col gap-3 p-3">
                    <ContentField
                      label="Email"
                      value={contentFields['contact.email']}
                      onChange={(v) => setContent('contact.email', v)}
                      placeholder="hello@yourbusiness.com"
                    />
                    <ContentField
                      label="Phone"
                      value={contentFields['contact.phone']}
                      onChange={(v) => setContent('contact.phone', v)}
                      placeholder="+1 (555) 000-0000"
                    />
                    <ContentField
                      label="Address"
                      value={contentFields['contact.address']}
                      onChange={(v) => setContent('contact.address', v)}
                      placeholder="123 Main St, City, State"
                    />
                    <ContentField
                      label="Business hours"
                      value={contentFields['contact.hours']}
                      onChange={(v) => setContent('contact.hours', v)}
                      placeholder="Mon–Fri 9am–6pm"
                    />
                  </div>
                </div>

                {/* Save button */}
                <button
                  type="button"
                  onClick={handleContentSave}
                  disabled={contentSaving || !contentDirty}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-2.5 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {contentSaving ? <Spinner size="sm" /> : <Save size={14} />}
                  {contentSaving ? 'Saving…' : contentDirty ? 'Save content' : 'All saved'}
                </button>

                <p className="mt-3 text-center text-[11px] text-slate-400">
                  Contact info appears in your storefront footer.
                </p>
              </div>
            )}

            {/* ── Theme tab ── */}
            {tab === 'theme' && (
              <div className="flex flex-col gap-0">
                {/* Save bar */}
                {themeDirty && (
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-violet-200 bg-violet-50 px-4 py-2.5">
                    <span className="text-xs font-medium text-violet-700">Unsaved theme changes</span>
                    <button
                      type="button"
                      onClick={handleThemeSave}
                      disabled={themeSaving}
                      className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                      {themeSaving ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
                      {themeSaving ? 'Saving…' : 'Apply'}
                    </button>
                  </div>
                )}

                {/* Brand color */}
                <div className="border-b border-slate-100 px-4 py-4">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Brand Color</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {BRAND_COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => { setBrandColor(c); setThemeDirty(true); }}
                        className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                        style={{
                          backgroundColor: c,
                          borderColor: brandColor === c ? '#6366f1' : 'transparent',
                          boxShadow: brandColor === c ? '0 0 0 2px white, 0 0 0 4px #6366f1' : 'inset 0 0 0 1px rgba(0,0,0,0.1)',
                        }}
                        title={c}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-8 w-8 shrink-0 rounded-lg border border-slate-200"
                      style={{ backgroundColor: brandColor || '#6366f1' }}
                    />
                    <input
                      type="color"
                      value={brandColor || '#6366f1'}
                      onChange={(e) => { setBrandColor(e.target.value); setThemeDirty(true); }}
                      className="h-8 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-1 py-0.5"
                      title="Custom color"
                    />
                    {brandColor && (
                      <button
                        type="button"
                        onClick={() => { setBrandColor(''); setThemeDirty(true); }}
                        className="shrink-0 text-xs text-slate-400 hover:text-slate-600"
                        title="Clear"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {brandColor && (
                    <p className="mt-1.5 text-[10px] text-slate-400 font-mono">{brandColor}</p>
                  )}
                </div>

                {/* Theme list */}
                <div className="px-4 py-4">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Theme</p>
                  <div className="flex flex-col gap-2">
                    {THEMES.map((t) => {
                      const isSelected = selectedThemeId === t.id;
                      const isPro = tenantQ.data?.tenant?.plan === 'pro' || tenantQ.data?.tenant?.plan === 'business';
                      const isLocked = t.premium && !isPro;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          disabled={isLocked}
                          onClick={() => {
                            if (isLocked) return;
                            setSelectedThemeId(t.id);
                            setThemeDirty(true);
                          }}
                          className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                            isSelected
                              ? 'border-violet-400 bg-violet-50 ring-1 ring-violet-400'
                              : isLocked
                              ? 'border-slate-100 bg-slate-50 opacity-50'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {/* Color swatch strip */}
                          <div className="flex shrink-0 overflow-hidden rounded-md" style={{ width: 36, height: 36 }}>
                            {t.colors.map((c, i) => (
                              <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />
                            ))}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-800 leading-tight">{t.name}</p>
                            <p className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate">{t.description}</p>
                          </div>
                          <div className="shrink-0">
                            {isLocked ? (
                              <span className="text-[9px] font-bold uppercase text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full">Pro</span>
                            ) : isSelected ? (
                              <Check size={14} className="text-violet-600" />
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ── Right panel: live preview ───────────────────────────────────── */}
        <div className="flex flex-1 flex-col bg-slate-100 overflow-hidden">

          {/* Preview URL bar */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Lock size={12} className="text-emerald-500" />
              <span className="text-xs font-medium text-slate-600">
                {tenant?.custom_domain_verified && tenant?.custom_domain
                  ? `https://${tenant.custom_domain}`
                  : tenant?.slug
                  ? `${tenant.slug}.shopsuitedirect.com`
                  : 'your-store.shopsuitedirect.com'}
              </span>
              {isPublished && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                  Live
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPreviewKey((k) => k + 1)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              aria-label="Refresh preview"
            >
              <RefreshCw size={13} />
            </button>
          </div>

          {/* iframe area */}
          <div className="flex flex-1 items-start justify-center overflow-auto p-4">
            <div
              className="h-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg transition-all duration-300"
              style={{ width: DEVICE_WIDTHS[device], minWidth: device === 'desktop' ? '600px' : undefined }}
            >
              {siteHref ? (
                <iframe
                  ref={iframeRef}
                  key={previewKey}
                  src={siteHref}
                  title="Storefront preview"
                  className="h-full w-full border-0"
                  style={{ minHeight: 'calc(100vh - 200px)' }}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Spinner size="lg" />
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ── Bottom status bar ─────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-white px-5 py-2.5">
        <div className="flex items-center gap-1.5">
          {!isDirty && !saveMutation.isPending && (
            <Check size={13} className="text-emerald-500" />
          )}
          {isDirty && !saveMutation.isPending && (
            <div className="h-2 w-2 rounded-full bg-amber-400" />
          )}
          {saveMutation.isPending && <Spinner size="sm" />}
          <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-red-500 transition-colors"
        >
          <RotateCcw size={11} />
          Reset to default
        </button>
      </div>

    </div>
  );
}
