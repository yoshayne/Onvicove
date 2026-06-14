import { useEffect, useState } from 'react';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';

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

const STORAGE_KEY = 'onvicove_page_sections_home';

export default function PageBuilder() {
  const [sections, setSections] = useState<SectionItem[]>(DEFAULT_SECTIONS);
  const [saved, setSaved] = useState(false);

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Page Builder</h1>
        <Button onClick={handleSave}>{saved ? 'Saved' : 'Save layout'}</Button>
      </div>
      <p className="text-sm text-slate-500">
        Reorder and toggle the sections shown on your storefront home page. Use the arrows to
        change order and the toggle to show or hide a section.
      </p>

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
  );
}
