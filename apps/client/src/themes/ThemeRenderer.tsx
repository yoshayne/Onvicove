import { lazy, Suspense } from 'react';
import type { ComponentType, CSSProperties } from 'react';
import type { ThemeId, ThemeProps } from './types';
import { ContentProvider } from './content';
import type { PageContent } from './content';

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
  /** Editable text overrides for this storefront. */
  content?: PageContent;
  /** When true, text becomes inline-editable (dashboard page builder). */
  editing?: boolean;
  /** Called when an editable text field is committed. */
  onEditContent?: (key: string, value: string) => void;
}

export default function ThemeRenderer({
  themeId,
  content,
  editing,
  onEditContent,
  ...props
}: ThemeRendererProps) {
  const loader = themeMap[themeId] ?? themeMap.editorial;
  const Storefront = lazy(loader);

  const style = props.theme.brandColor
    ? ({ '--brand-color': props.theme.brandColor } as CSSProperties)
    : undefined;

  return (
    <div style={style}>
      <ContentProvider content={content} editing={editing} onEdit={onEditContent}>
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
          <Storefront {...props} />
        </Suspense>
      </ContentProvider>
    </div>
  );
}
