import { lazy, Suspense } from 'react';
import type { ComponentType } from 'react';
import type { ThemeId, ThemeProps } from './types';

const themeMap: Record<ThemeId, () => Promise<{ default: ComponentType<ThemeProps> }>> = {
  editorial: () => import('./editorial/Storefront'),
  minimal: () => import('./minimal/Storefront'),
  bold: () => import('./bold/Storefront'),
  warm: () => import('./warm/Storefront'),
  classic: () => import('./classic/Storefront'),
  bright: () => import('./bright/Storefront'),
};

interface ThemeRendererProps extends ThemeProps {
  themeId: ThemeId;
}

export default function ThemeRenderer({ themeId, ...props }: ThemeRendererProps) {
  const loader = themeMap[themeId] ?? themeMap.editorial;
  const Storefront = lazy(loader);

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <Storefront {...props} />
    </Suspense>
  );
}
