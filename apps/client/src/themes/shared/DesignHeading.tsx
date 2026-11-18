import { createContext, useContext, type CSSProperties, type ReactNode } from 'react';
import type { SectionDesign } from './sectionDesign';

/** Set once by ThemeRenderer: the owner's per-section design choices (Pro and Business), keyed by section id */
export const SectionDesignContext = createContext<Record<string, SectionDesign>>({});

export const useSectionDesign = (id: string): SectionDesign => useContext(SectionDesignContext)[id] ?? {};

/**
 * A section heading that follows the owner's design choices: their own heading text, a short intro under it,
 * and left / center / right alignment. With no choices made it renders exactly what the theme had.
 */
export function DesignHeading({ id, className = '', style, children }: { id: string; className?: string; style?: CSSProperties; children: ReactNode }) {
  const d = useSectionDesign(id);
  const title = d.title?.trim() || children;
  const intro = d.intro?.trim();
  const themeAlign = /\btext-center\b/.test(className) ? 'center' : /\btext-right\b/.test(className) ? 'right' : 'left';
  const align = d.align ?? themeAlign;
  return (
    <>
      <h2 className={className} style={{ ...style, ...(d.align ? { textAlign: d.align } : {}), ...(intro ? { marginBottom: '0.75rem' } : {}) }}>{title}</h2>
      {intro && (
        <p className={`mb-10 max-w-2xl text-base opacity-70 ${align === 'center' ? 'mx-auto' : align === 'right' ? 'ml-auto' : ''}`} style={{ textAlign: align }}>{intro}</p>
      )}
    </>
  );
}

/** For sections whose theme has no heading of its own (the team): shows one only when the owner has written a title or intro */
export function OptionalDesignHeading({ id }: { id: string }) {
  const d = useSectionDesign(id);
  const title = d.title?.trim();
  const intro = d.intro?.trim();
  if (!title && !intro) return null;
  const align = d.align ?? 'center';
  return (
    <div className="mx-auto mb-10 max-w-5xl" style={{ textAlign: align }}>
      {title && <h2 className="text-3xl font-bold md:text-4xl">{title}</h2>}
      {intro && <p className={`mt-3 max-w-2xl text-base opacity-70 ${align === 'center' ? 'mx-auto' : align === 'right' ? 'ml-auto' : ''}`}>{intro}</p>}
    </div>
  );
}

/**
 * The owner's choices for the hero text on the older themes: a headline and a supporting line that replace the
 * theme's own, left / center / right alignment of the text block, and extra or less space around it.
 */
export function useHeroDesign() {
  const d = useSectionDesign('hero');
  const style: CSSProperties = {};
  if (d.spacing === 'compact') { style.paddingTop = 16; style.paddingBottom = 16; }
  if (d.spacing === 'roomy') { style.paddingTop = 96; style.paddingBottom = 96; }
  return { title: d.title?.trim() || undefined, intro: d.intro?.trim() || undefined, align: d.align, style };
}
