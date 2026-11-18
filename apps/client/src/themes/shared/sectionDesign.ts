/**
 * Owner-chosen look for one section of the page (Page Builder > Sections > the arrow on a section).
 * Everything is a choice from a short list, so a page can't be made unreadable or break on a phone.
 */
export interface SectionDesign {
  /** Where the heading, intro and (hero) text sit */
  align?: 'left' | 'center' | 'right';
  spacing?: 'compact' | 'normal' | 'roomy';
  /** default = the theme; soft = the theme's second shade; contrast = the opposite of the theme; accent = the brand colour; photo = the owner's photo under a dark veil */
  bg?: 'default' | 'soft' | 'contrast' | 'accent' | 'photo';
  /** The background photo's file (saved) and its current link (added by the server when the page is read) */
  bgImageKey?: string;
  bgImageUrl?: string;
  /** Replaces the section heading ("Services", "Meet the team"...) */
  title?: string;
  /** A short line under the heading */
  intro?: string;
}

export const DESIGN_ALIGN = ['left', 'center', 'right'] as const;
export const DESIGN_SPACING = ['compact', 'normal', 'roomy'] as const;
export const DESIGN_BG = ['default', 'soft', 'contrast', 'accent', 'photo'] as const;

/** Themes that draw their sections with the shared booking-first page, which also supports section backgrounds */
export const DESIGN_THEMES = ['barber', 'studio', 'ink', 'roster'] as const;

/** 'full': heading, alignment, spacing and background. 'basic': heading, intro, alignment and spacing (every other theme). */
export type DesignLevel = 'full' | 'basic';
export const designLevel = (themeId: string | undefined | null): DesignLevel => ((DESIGN_THEMES as readonly string[]).includes(themeId ?? '') ? 'full' : 'basic');

/** Keep only values from the lists above, with the text trimmed and limited */
export function cleanDesign(d: unknown): SectionDesign | undefined {
  if (!d || typeof d !== 'object') return undefined;
  const o = d as Record<string, unknown>;
  const pick = <T extends string>(v: unknown, list: readonly T[]) => (typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : undefined);
  const out: SectionDesign = {
    align: pick(o.align, DESIGN_ALIGN),
    spacing: pick(o.spacing, DESIGN_SPACING),
    bg: pick(o.bg, DESIGN_BG),
    title: typeof o.title === 'string' && o.title.trim() ? o.title.trim().slice(0, 80) : undefined,
    intro: typeof o.intro === 'string' && o.intro.trim() ? o.intro.trim().slice(0, 300) : undefined,
    bgImageKey: typeof o.bgImageKey === 'string' ? o.bgImageKey : undefined,
    bgImageUrl: typeof o.bgImageUrl === 'string' && /^https?:\/\//i.test(o.bgImageUrl) ? o.bgImageUrl : undefined,
  };
  // A photo background needs its photo
  if (out.bg === 'photo' && !out.bgImageUrl) out.bg = undefined;
  return Object.values(out).some((v) => v !== undefined) ? out : undefined;
}
