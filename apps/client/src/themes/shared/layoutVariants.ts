export interface LayoutVariant {
  id: string;
  name: string;
  description: string;
  previewLines: string[]; // ASCII-style description for mini preview
}

/** Layout variants available per theme. If a theme id isn't listed, it uses its own defaults. */
export const THEME_LAYOUT_VARIANTS: Record<string, LayoutVariant[]> = {
  editorial: [
    {
      id: 'classic',
      name: 'Classic',
      description: 'Full-width hero, centered text overlay',
      previewLines: ['████████████', '  TITLE  ', '▤ ▤ ▤ ▤'],
    },
    {
      id: 'split',
      name: 'Split',
      description: 'Brand name left, hero photo right',
      previewLines: ['NAME | IMAGE', '▤ ▤ | ▤ ▤', '▤ ▤ | ▤ ▤'],
    },
    {
      id: 'magazine',
      name: 'Magazine',
      description: 'Large feature card + grid below',
      previewLines: ['█████ | ▤ ▤', '█████ | ▤ ▤', '▤ ▤  ▤ ▤'],
    },
  ],
  minimal: [
    {
      id: 'classic',
      name: 'Classic',
      description: 'Full-width hero, 3-column grid',
      previewLines: ['████████████', '▤ ▤ ▤', '▤ ▤ ▤'],
    },
    {
      id: 'list',
      name: 'List',
      description: 'Minimal hero, horizontal product rows',
      previewLines: ['NAME', '— product —', '— product —'],
    },
    {
      id: 'centered',
      name: 'Centered',
      description: 'Centered hero text, 2-column products',
      previewLines: ['  TITLE  ', '▤ ▤', '▤ ▤'],
    },
  ],
  warm: [
    {
      id: 'classic',
      name: 'Classic',
      description: 'Full-width hero, grid products',
      previewLines: ['████████████', '▤ ▤ ▤', '▤ ▤ ▤'],
    },
    {
      id: 'artisan',
      name: 'Artisan',
      description: 'Serif hero, large product feature',
      previewLines: ['NAME | IMAGE', '▤▤▤  |  ▤▤', '────────────'],
    },
    {
      id: 'editorial',
      name: 'Editorial',
      description: 'Staggered alternating layout',
      previewLines: ['████ IMAGE █', 'TEXT | GRID', 'GRID | TEXT'],
    },
  ],
};

export function getLayoutVariants(themeId: string): LayoutVariant[] {
  return THEME_LAYOUT_VARIANTS[themeId] ?? [];
}

export function getLayoutVariant(themeId: string, layoutId?: string): LayoutVariant | undefined {
  const variants = getLayoutVariants(themeId);
  return variants.find((v) => v.id === layoutId) ?? variants[0];
}
