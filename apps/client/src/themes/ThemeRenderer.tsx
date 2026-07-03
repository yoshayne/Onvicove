import { lazy, Suspense } from 'react';
import type { ComponentType, CSSProperties } from 'react';
import type { ThemeId, ThemeProps } from './types';
import type { GallerySectionData } from './shared/Gallery';

const themeMap: Record<ThemeId, () => Promise<{ default: ComponentType<ThemeProps> }>> = {
  editorial: () => import('./editorial/Storefront'),
  minimal: () => import('./minimal/Storefront'),
  bold: () => import('./bold/Storefront'),
  warm: () => import('./warm/Storefront'),
  classic: () => import('./classic/Storefront'),
  bright: () => import('./bright/Storefront'),
  obsidian: () => import('./obsidian/Storefront'),
  aurora: () => import('./aurora/Storefront'),
  magazine: () => import('./magazine/Storefront'),
  brutalist: () => import('./brutalist/Storefront'),
  'neon-tokyo': () => import('./neon-tokyo/Storefront'),
  craft: () => import('./craft/Storefront'),
};

interface ThemeRendererProps extends ThemeProps {
  themeId: ThemeId;
  /** Gallery sections to render after the storefront body. */
  galleries?: GallerySectionData[];
}

export default function ThemeRenderer({ themeId, galleries, visibleSections, ...props }: ThemeRendererProps) {
  const loader = themeMap[themeId] ?? themeMap.editorial;
  const Storefront = lazy(loader);

  const style = props.theme.brandColor
    ? ({ '--brand-color': props.theme.brandColor } as CSSProperties)
    : undefined;

  return (
    <div style={style}>
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
        <Storefront {...props} visibleSections={visibleSections} galleries={galleries} />
      </Suspense>
    </div>
  );
}
