import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Image as Images, Layout, Plus, Trash2, Upload } from 'lucide-react';
import { useApi } from '../lib/api';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';
import Spinner from '../components/shared/Spinner';
import { GALLERY_LAYOUTS } from '../themes/shared/Gallery';
import type { GallerySectionData, GalleryLayout, GalleryImageData } from '../themes/shared/Gallery';

interface SectionItem {
  id: string;
  type: string;
  label: string;
  enabled: boolean;
}

const DEFAULT_SECTIONS: SectionItem[] = [
  { id: 'hero', type: 'hero', label: 'Hero banner', enabled: true },
  { id: 'featured-products', type: 'featured-products', label: 'Featured products', enabled: true },
  { id: 'services', type: 'services', label: 'Services list', enabled: true },
  { id: 'about', type: 'about', label: 'About section', enabled: true },
  { id: 'staff', type: 'staff', label: 'Meet the team', enabled: false },
  { id: 'testimonials', type: 'testimonials', label: 'Testimonials', enabled: false },
  { id: 'contact', type: 'contact', label: 'Contact / location', enabled: true },
];

const STORAGE_KEY = 'shopsuitedirect_page_sections_home';

function emptyGallery(): GallerySectionData {
  return {
    id: crypto.randomUUID(),
    type: 'gallery',
    enabled: true,
    title: '',
    layout: 'grid',
    images: [],
  };
}

type Tab = 'layout' | 'galleries';

export default function PageBuilder() {
  const api = useApi();
  const [tab, setTab] = useState<Tab>('layout');

  const [sections, setSections] = useState<SectionItem[]>(DEFAULT_SECTIONS);
  const [saved, setSaved] = useState(false);

  const [galleries, setGalleries] = useState<GallerySectionData[]>([]);
  const [galleriesSaved, setGalleriesSaved] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as SectionItem[];
        if (Array.isArray(parsed)) setSections(parsed);
      } catch {
        // ignore invalid stored data
      }
    }
  }, []);

  const pageSectionsQuery = useQuery({
    queryKey: ['page-sections', 'home'],
    queryFn: () => api.get<{ sections: GallerySectionData[] }>('/page-sections/home'),
  });

  useEffect(() => {
    if (pageSectionsQuery.data) {
      setGalleries(pageSectionsQuery.data.sections.filter((s) => s.type === 'gallery'));
    }
  }, [pageSectionsQuery.data]);

  const saveGalleriesMutation = useMutation({
    mutationFn: (next: GallerySectionData[]) =>
      api.put<{ sections: GallerySectionData[] }>('/page-sections/home', { sections: next }),
    onSuccess: () => {
      setGalleriesSaved(true);
      setTimeout(() => setGalleriesSaved(false), 2500);
    },
  });

  function move(index: number, direction: -1 | 1) {
    setSections((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSaved(false);
  }

  function toggle(id: string) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
    setSaved(false);
  }

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
    setSaved(true);
  }

  function moveGallery(index: number, dir: -1 | 1) {
    setGalleries((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addGallery() {
    setGalleries((prev) => [...prev, emptyGallery()]);
  }

  function removeGallery(id: string) {
    setGalleries((prev) => prev.filter((g) => g.id !== id));
  }

  function updateGallery(id: string, patch: Partial<GallerySectionData>) {
    setGalleries((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  function updateGalleryImage(id: string, index: number, patch: Partial<GalleryImageData>) {
    setGalleries((prev) =>
      prev.map((g) =>
        g.id === id
          ? { ...g, images: g.images.map((img, i) => (i === index ? { ...img, ...patch } : img)) }
          : g
      )
    );
  }

  function removeGalleryImage(id: string, index: number) {
    setGalleries((prev) =>
      prev.map((g) => (g.id === id ? { ...g, images: g.images.filter((_, i) => i !== index) } : g))
    );
  }

  async function uploadGalleryImages(id: string, files: FileList) {
    setUploadingFor(id);
    try {
      for (const file of Array.from(files)) {
        const res = await api.upload<{ url: string }>('/uploads', file);
        setGalleries((prev) =>
          prev.map((g) => (g.id === id ? { ...g, images: [...g.images, { url: res.url }] } : g))
        );
      }
    } finally {
      setUploadingFor(null);
    }
  }

  function saveGalleries() {
    saveGalleriesMutation.mutate(galleries);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Page Builder</h1>
      </div>

      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab('layout')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-colors ${
            tab === 'layout' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layout size={14} />
          Sections
        </button>
        <button
          type="button"
          onClick={() => setTab('galleries')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-colors ${
            tab === 'galleries' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Images size={14} />
          Galleries
        </button>
      </div>

      {tab === 'layout' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Reorder and toggle the sections shown on your storefront home page. Use the arrows to
              change order and the toggle to show or hide a section.
            </p>
            <Button onClick={handleSave}>{saved ? 'Saved' : 'Save layout'}</Button>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2">
            {sections.map((section, index) => (
              <div
                key={section.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-900">{section.label}</span>
                  <Badge tone={section.enabled ? 'success' : 'default'}>
                    {section.enabled ? 'Visible' : 'Hidden'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 disabled:opacity-30"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === sections.length - 1}
                    className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 disabled:opacity-30"
                  >
                    Down
                  </button>
                  <Button size="sm" variant="secondary" onClick={() => toggle(section.id)}>
                    {section.enabled ? 'Hide' : 'Show'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'galleries' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Add photo galleries to your homepage. Choose a layout per gallery.
            </p>
            <Button onClick={saveGalleries} isLoading={saveGalleriesMutation.isPending}>
              {galleriesSaved ? 'Saved' : 'Save galleries'}
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            {galleries.map((g, index) => (
              <div key={g.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={g.title ?? ''}
                    onChange={(e) => updateGallery(g.id, { title: e.target.value })}
                    placeholder="Gallery title (optional)"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => moveGallery(index, -1)} disabled={index === 0}
                      className="rounded border border-slate-200 px-1.5 py-1 text-xs text-slate-600 disabled:opacity-30 hover:bg-slate-50">↑</button>
                    <button type="button" onClick={() => moveGallery(index, 1)} disabled={index === galleries.length - 1}
                      className="rounded border border-slate-200 px-1.5 py-1 text-xs text-slate-600 disabled:opacity-30 hover:bg-slate-50">↓</button>
                    <button
                      type="button"
                      onClick={() => removeGallery(g.id)}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <select
                  value={g.layout}
                  onChange={(e) => updateGallery(g.id, { layout: e.target.value as GalleryLayout })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  {GALLERY_LAYOUTS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label} — {l.description}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <Badge tone={g.enabled ? 'success' : 'default'}>{g.enabled ? 'Visible' : 'Hidden'}</Badge>
                  <Button size="sm" variant="secondary" onClick={() => updateGallery(g.id, { enabled: !g.enabled })}>
                    {g.enabled ? 'Hide' : 'Show'}
                  </Button>
                  <span className="ml-auto text-xs text-slate-400">
                    {g.images.length} photo{g.images.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {g.images.map((img, i) => (
                    <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200">
                      <img src={img.url} alt={img.caption ?? ''} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(g.id, i)}
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Trash2 size={10} />
                      </button>
                      <input
                        type="text"
                        value={img.caption ?? ''}
                        onChange={(e) => updateGalleryImage(g.id, i, { caption: e.target.value })}
                        placeholder="Caption"
                        className="absolute inset-x-0 bottom-0 bg-black/50 px-1 py-0.5 text-[10px] text-white placeholder:text-white/60 focus:outline-none"
                      />
                    </div>
                  ))}
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-500">
                    {uploadingFor === g.id ? <Spinner size="sm" /> : <Upload size={16} />}
                    <span className="text-[10px]">Add photos</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={uploadingFor === g.id}
                      onChange={(e) => {
                        if (e.target.files?.length) uploadGalleryImages(g.id, e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addGallery}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700"
            >
              <Plus size={14} />
              Add gallery
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
