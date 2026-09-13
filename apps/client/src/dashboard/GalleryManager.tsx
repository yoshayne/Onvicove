import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import { GALLERY_LAYOUTS } from '../themes/shared/Gallery';
import type { GalleryLayout, GalleryImageData } from '../themes/shared/Gallery';
import Spinner from '../components/shared/Spinner';
import Button from '../components/shared/Button';
import {
  Plus, Trash2, Upload, GripVertical, Check, ImageIcon, Pencil, X,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GallerySection {
  id: string;
  type: 'gallery';
  enabled: boolean;
  title?: string;
  layout?: GalleryLayout;
  images?: GalleryImageData[];
}

interface AnySection {
  id: string;
  type: string;
  enabled: boolean;
  [key: string]: unknown;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() {
  return `gallery-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Drag-to-reorder image grid ────────────────────────────────────────────────

function ImageGrid({
  images,
  uploading,
  onReorder,
  onRemove,
  onCaptionChange,
  onUpload,
}: {
  images: GalleryImageData[];
  uploading: boolean;
  onReorder: (images: GalleryImageData[]) => void;
  onRemove: (index: number) => void;
  onCaptionChange: (index: number, caption: string) => void;
  onUpload: (files: FileList) => void;
}) {
  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  function handleDragStart(i: number) { dragIndex.current = i; }
  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    setDragOver(i);
  }
  function handleDrop(i: number) {
    const from = dragIndex.current;
    if (from === null || from === i) { setDragOver(null); return; }
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(i, 0, moved);
    onReorder(next);
    dragIndex.current = null;
    setDragOver(null);
  }
  function handleDragEnd() { dragIndex.current = null; setDragOver(null); }

  // Drop-zone drag-over for file drops
  const [dropZoneActive, setDropZoneActive] = useState(false);
  function handleDropZoneDragOver(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    setDropZoneActive(true);
  }
  function handleDropZoneDrop(e: React.DragEvent) {
    e.preventDefault();
    setDropZoneActive(false);
    if (e.dataTransfer.files.length) onUpload(e.dataTransfer.files);
  }

  return (
    <div>
      {/* Drop zone + grid */}
      <div
        className={`relative grid gap-3 rounded-2xl border-2 border-dashed p-4 transition-colors ${
          dropZoneActive ? 'border-violet-400 bg-violet-50' : 'border-slate-200 bg-slate-50'
        }`}
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}
        onDragOver={handleDropZoneDragOver}
        onDragLeave={() => setDropZoneActive(false)}
        onDrop={handleDropZoneDrop}
      >
        {images.map((img, i) => (
          <div
            key={i}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDrop={() => handleDrop(i)}
            onDragEnd={handleDragEnd}
            className={`group relative aspect-square overflow-hidden rounded-xl border-2 bg-white transition-all ${
              dragOver === i ? 'border-violet-400 opacity-50 scale-95' : 'border-transparent'
            }`}
          >
            <img src={img.url} alt={img.caption ?? ''} className="h-full w-full object-cover" />

            {/* Drag handle */}
            <div className="absolute left-1 top-1 cursor-grab rounded-md bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <GripVertical size={12} />
            </div>

            {/* Delete */}
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
            >
              <Trash2 size={11} />
            </button>

            {/* Caption */}
            <input
              type="text"
              value={img.caption ?? ''}
              onChange={(e) => onCaptionChange(i, e.target.value)}
              placeholder="Add caption…"
              className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-[11px] text-white placeholder:text-white/50 focus:bg-black/75 focus:outline-none"
            />
          </div>
        ))}

        {/* Upload tile */}
        <label className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors ${
          uploading ? 'border-slate-200 bg-white' : 'border-slate-300 bg-white hover:border-violet-400 hover:bg-violet-50'
        }`}>
          {uploading ? (
            <Spinner size="md" />
          ) : (
            <>
              <Upload size={20} className="text-slate-400" />
              <span className="text-xs font-medium text-slate-500">Add photos</span>
              <span className="text-[10px] text-slate-400">or drag &amp; drop</span>
            </>
          )}
          <input
            type="file" accept="image/*" multiple className="hidden"
            disabled={uploading}
            onChange={(e) => { if (e.target.files?.length) onUpload(e.target.files); e.target.value = ''; }}
          />
        </label>

        {/* Empty state hint */}
        {images.length === 0 && !uploading && (
          <div className="col-span-full flex flex-col items-center gap-2 py-8 text-center">
            <ImageIcon size={36} className="text-slate-200" />
            <p className="text-sm font-medium text-slate-400">No photos yet</p>
            <p className="text-xs text-slate-400">Click "Add photos" or drag images here</p>
          </div>
        )}
      </div>

      {images.length > 0 && (
        <p className="mt-2 text-right text-xs text-slate-400">
          {images.length} photo{images.length !== 1 ? 's' : ''} · drag to reorder
        </p>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GalleryManager() {
  const api = useApi();
  const queryClient = useQueryClient();

  const { data: sectionsData, isLoading } = useQuery({
    queryKey: ['page-sections', 'home'],
    queryFn: () => api.get<{ sections: AnySection[] }>('/page-sections/home'),
  });

  const [allSections, setAllSections] = useState<AnySection[]>([]);
  const [activeGalleryId, setActiveGalleryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameRef = useRef<HTMLInputElement>(null);

  // Initialise local state from fetched data
  useEffect(() => {
    if (!sectionsData) return;
    const raw = sectionsData.sections ?? [];
    setAllSections(raw);
    // Auto-select the first gallery
    const first = raw.find((s) => s.type === 'gallery');
    if (first) setActiveGalleryId((prev) => prev ?? first.id);
  }, [sectionsData]);

  useEffect(() => {
    if (renamingId && renameRef.current) renameRef.current.focus();
  }, [renamingId]);

  const galleries = allSections.filter((s) => s.type === 'gallery') as GallerySection[];
  const active = galleries.find((g) => g.id === activeGalleryId) ?? galleries[0] ?? null;

  // ── Mutations on local state ─────────────────────────────────────────────

  function patchGallery(id: string, patch: Partial<GallerySection>) {
    setAllSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    setIsDirty(true);
  }

  function addGallery() {
    const newSection: GallerySection = {
      id: uid(),
      type: 'gallery',
      enabled: true,
      title: `Gallery ${galleries.length + 1}`,
      layout: 'grid',
      images: [],
    };
    setAllSections((prev) => [...prev, newSection as AnySection]);
    setActiveGalleryId(newSection.id);
    setIsDirty(true);
  }

  function deleteGallery(id: string) {
    const remaining = galleries.filter((g) => g.id !== id);
    setAllSections((prev) => prev.filter((s) => s.id !== id));
    setActiveGalleryId(remaining[remaining.length - 1]?.id ?? null);
    setIsDirty(true);
  }

  function startRename(g: GallerySection) {
    setRenamingId(g.id);
    setRenameValue(g.title ?? '');
  }

  function commitRename(id: string) {
    patchGallery(id, { title: renameValue.trim() || 'Untitled gallery' });
    setRenamingId(null);
  }

  // ── Image operations ─────────────────────────────────────────────────────

  const uploadImages = useCallback(async (galleryId: string, files: FileList) => {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const res = await api.upload<{ key: string; url: string }>('/uploads', file);
        setAllSections((prev) =>
          prev.map((s) =>
            s.id === galleryId
              ? { ...s, images: [...((s as GallerySection).images ?? []), { key: res.key, url: res.url }] }
              : s
          )
        );
      }
      setIsDirty(true);
    } finally {
      setUploading(false);
    }
  }, [api]);

  function removeImage(galleryId: string, index: number) {
    setAllSections((prev) =>
      prev.map((s) =>
        s.id === galleryId
          ? { ...s, images: (s as GallerySection).images?.filter((_, i) => i !== index) }
          : s
      )
    );
    setIsDirty(true);
  }

  function reorderImages(galleryId: string, images: GalleryImageData[]) {
    patchGallery(galleryId, { images });
  }

  function updateCaption(galleryId: string, index: number, caption: string) {
    setAllSections((prev) =>
      prev.map((s) =>
        s.id === galleryId
          ? {
              ...s,
              images: (s as GallerySection).images?.map((img, i) =>
                i === index ? { ...img, caption } : img
              ),
            }
          : s
      )
    );
    setIsDirty(true);
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    try {
      const res = await api.put<{ sections: AnySection[] }>('/page-sections/home', { sections: allSections });
      setAllSections(res.sections);
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['page-sections', 'home'] });
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gallery</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Upload photos, choose a layout, and drag to reorder
          </p>
        </div>
        <Button
          onClick={handleSave}
          isLoading={saving}
          disabled={!isDirty}
          className={isDirty ? '' : 'opacity-50'}
        >
          <Check size={15} className="mr-1" />
          Save changes
        </Button>
      </div>

      {/* Gallery tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {galleries.map((g) => (
          <div key={g.id} className="relative flex items-center">
            {renamingId === g.id ? (
              <input
                ref={renameRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => commitRename(g.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename(g.id);
                  if (e.key === 'Escape') setRenamingId(null);
                }}
                className="rounded-full border border-violet-400 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                style={{ minWidth: 80, maxWidth: 200 }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setActiveGalleryId(g.id)}
                className={`group flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                  activeGalleryId === g.id
                    ? 'border-violet-400 bg-violet-50 text-violet-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {g.title || 'Untitled'}
                <span className="text-[10px] text-slate-400 font-normal ml-0.5">
                  {g.images?.length ?? 0}
                </span>
                {activeGalleryId === g.id && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); startRename(g); }}
                    className="ml-0.5 rounded-full p-0.5 text-violet-400 hover:text-violet-700"
                    title="Rename"
                  >
                    <Pencil size={10} />
                  </button>
                )}
              </button>
            )}
            {galleries.length > 1 && activeGalleryId === g.id && (
              <button
                type="button"
                onClick={() => deleteGallery(g.id)}
                className="ml-1 rounded-full border border-red-200 bg-white p-1 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Delete gallery"
              >
                <X size={11} />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addGallery}
          className="flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-violet-400 hover:text-violet-600 transition-colors"
        >
          <Plus size={12} />
          New gallery
        </button>
      </div>

      {/* No galleries yet */}
      {galleries.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 py-24 text-center">
          <ImageIcon size={40} className="text-slate-200" />
          <div>
            <p className="font-semibold text-slate-500">No galleries yet</p>
            <p className="mt-1 text-sm text-slate-400">Click "New gallery" to create one</p>
          </div>
          <Button onClick={addGallery}>
            <Plus size={14} className="mr-1" />
            New gallery
          </Button>
        </div>
      )}

      {/* Active gallery editor */}
      {active && (
        <div className="flex flex-col gap-5">
          {/* Layout + visibility */}
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Layout</label>
              <select
                value={active.layout ?? 'grid'}
                onChange={(e) => patchGallery(active.id, { layout: e.target.value as GalleryLayout })}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                {GALLERY_LAYOUTS.map((l) => (
                  <option key={l.id} value={l.id}>{l.label} — {l.description}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visible on site</label>
              <button
                type="button"
                onClick={() => patchGallery(active.id, { enabled: !active.enabled })}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                  active.enabled ? 'bg-violet-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform ${
                    active.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {active.layout === 'before-after' && (
              <p className="w-full text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                Before/After mode uses only the first 2 photos.
              </p>
            )}
          </div>

          {/* Image grid */}
          <ImageGrid
            images={active.images ?? []}
            uploading={uploading}
            onReorder={(imgs) => reorderImages(active.id, imgs)}
            onRemove={(i) => removeImage(active.id, i)}
            onCaptionChange={(i, cap) => updateCaption(active.id, i, cap)}
            onUpload={(files) => uploadImages(active.id, files)}
          />
        </div>
      )}

      {/* Sticky save bar when dirty */}
      {isDirty && (
        <div className="sticky bottom-4 flex justify-center">
          <div className="flex items-center gap-3 rounded-full bg-slate-900 px-5 py-2.5 shadow-xl">
            <span className="text-sm font-medium text-white">Unsaved changes</span>
            <Button
              size="sm"
              onClick={handleSave}
              isLoading={saving}
              className="bg-violet-500 hover:bg-violet-600 text-white border-0"
            >
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
