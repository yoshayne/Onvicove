import { useState } from 'react';
import { collectTags } from '../themes/shared/Gallery';
import type { GalleryImageData } from '../themes/shared/Gallery';

const MAX_TAG_LENGTH = 30;
const MAX_TAGS_PER_IMAGE = 10;

function cleanTag(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, MAX_TAG_LENGTH);
}

/** Which photos are selected for tagging; plain click selects one, Shift/Ctrl-click or "Select multiple" adds more. */
export function useImageSelection(count: number) {
  const [selected, setSelected] = useState<number[]>([]);
  const [multi, setMulti] = useState(false);

  function toggle(i: number, additive = false) {
    setSelected((prev) => {
      if (additive || multi) return prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i];
      return prev.length === 1 && prev[0] === i ? [] : [i];
    });
  }
  function toggleMulti() {
    setMulti((m) => !m);
    if (multi) setSelected((p) => p.slice(0, 1));
  }

  return {
    selected: selected.filter((i) => i < count),
    multi,
    toggle,
    toggleMulti,
    clear: () => setSelected([]),
  };
}

export function TagSummary({ images, multi, onToggleMulti }: { images: GalleryImageData[]; multi: boolean; onToggleMulti: () => void }) {
  if (images.length < 2) return null;
  const tagCount = collectTags(images).length;
  return (
    <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
      <span>
        {tagCount > 0
          ? `Visitors can filter by ${tagCount} tag${tagCount === 1 ? '' : 's'}`
          : 'Select photos to tag them — visitors get a filter bar'}
      </span>
      <button
        type="button"
        onClick={onToggleMulti}
        className={`shrink-0 rounded-md px-2 py-0.5 font-medium transition-colors ${multi ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:text-violet-600'}`}
      >
        {multi ? 'Done selecting' : 'Select multiple'}
      </button>
    </div>
  );
}

/** Tag editor for the currently selected photos. Adds/removes apply to every selected photo. */
export function TagPanel({
  images, selected, onChange, onClear, listId, onCaptionChange,
}: {
  images: GalleryImageData[];
  selected: number[];
  onChange: (images: GalleryImageData[]) => void;
  onClear: () => void;
  listId: string;
  onCaptionChange?: (index: number, caption: string) => void;
}) {
  const [tagInput, setTagInput] = useState('');
  if (selected.length === 0) return null;

  const allTags = collectTags(images);
  // Tags on any selected photo; removing one removes it from all of them.
  const selTags = collectTags(selected.map((i) => images[i]));
  const first = selected.length === 1 ? images[selected[0]] : null;

  function patchSelected(fn: (tags: string[]) => string[]) {
    onChange(images.map((img, i) => (selected.includes(i) ? { ...img, tags: fn(img.tags ?? []) } : img)));
  }

  function addTags(raw: string) {
    const incoming = raw.split(',').map(cleanTag).filter(Boolean);
    if (incoming.length === 0) return;
    patchSelected((tags) => {
      const next = [...tags];
      for (const t of incoming) {
        if (next.length >= MAX_TAGS_PER_IMAGE) break;
        if (!next.some((x) => x.toLowerCase() === t.toLowerCase())) {
          // Reuse existing casing so "weddings" and "Weddings" don't split the filter
          next.push(allTags.find((x) => x.toLowerCase() === t.toLowerCase()) ?? t);
        }
      }
      return next;
    });
    setTagInput('');
  }

  function removeTag(tag: string) {
    patchSelected((tags) => tags.filter((t) => t.toLowerCase() !== tag.toLowerCase()));
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-violet-200 bg-violet-50/50 p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-violet-800">
          {selected.length === 1 ? 'Selected photo' : `${selected.length} photos selected`}
        </span>
        <button type="button" onClick={onClear} className="text-[11px] text-slate-500 hover:text-slate-700">Clear</button>
      </div>

      {first && onCaptionChange && (
        <input
          type="text"
          value={first.caption ?? ''}
          onChange={(e) => onCaptionChange(selected[0], e.target.value)}
          placeholder="Caption (optional)"
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      )}

      <div className="flex flex-wrap gap-1.5">
        {selTags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-2 py-0.5 text-[11px] font-medium text-white">
            {t}
            <button type="button" onClick={() => removeTag(t)} aria-label={`Remove tag ${t}`} className="text-white/70 hover:text-white">×</button>
          </span>
        ))}
        {selTags.length === 0 && <span className="text-[11px] text-slate-400">No tags yet</span>}
      </div>

      <input
        type="text"
        list={listId}
        value={tagInput}
        onChange={(e) => {
          const v = e.target.value;
          if (v.includes(',')) addTags(v); else setTagInput(v);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); addTags(tagInput); }
          if (e.key === 'Backspace' && !tagInput && selTags.length) removeTag(selTags[selTags.length - 1]);
        }}
        onBlur={() => addTags(tagInput)}
        placeholder={selected.length > 1 ? `Add a tag to all ${selected.length} (e.g. Weddings)` : 'Add a tag — e.g. Portraits, Weddings'}
        maxLength={MAX_TAG_LENGTH}
        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-400"
      />
      <datalist id={listId}>
        {allTags.filter((t) => !selTags.includes(t)).map((t) => <option key={t} value={t} />)}
      </datalist>
      <p className="text-[10px] text-slate-400">Press Enter to add. Tap Select multiple (or Shift/Ctrl-click) to tag several photos at once.</p>
    </div>
  );
}
