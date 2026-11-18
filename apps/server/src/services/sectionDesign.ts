/** Keep only the design choices we offer (see client themes/shared/sectionDesign.ts), with text trimmed and limited */
const ALIGN = ['left', 'center', 'right'];
const SPACING = ['compact', 'normal', 'roomy'];
const BG = ['default', 'soft', 'contrast', 'accent'];

export function cleanDesign(d: unknown): Record<string, string> | undefined {
  if (!d || typeof d !== 'object') return undefined;
  const o = d as Record<string, unknown>;
  const out: Record<string, string> = {};
  if (typeof o.align === 'string' && ALIGN.includes(o.align)) out.align = o.align;
  if (typeof o.spacing === 'string' && SPACING.includes(o.spacing)) out.spacing = o.spacing;
  if (typeof o.bg === 'string' && BG.includes(o.bg)) out.bg = o.bg;
  if (typeof o.title === 'string' && o.title.trim()) out.title = o.title.trim().slice(0, 80);
  if (typeof o.intro === 'string' && o.intro.trim()) out.intro = o.intro.trim().slice(0, 300);
  return Object.keys(out).length ? out : undefined;
}

/** Design choices are a Pro and Business feature: free stores' sections carry none */
export function applyDesignPlan<T extends { design?: unknown }>(sections: T[], plan: string | undefined): T[] {
  return sections.map((s) => {
    const { design, ...rest } = s;
    const cleaned = plan && plan !== 'starter' ? cleanDesign(design) : undefined;
    return (cleaned ? { ...rest, design: cleaned } : rest) as T;
  });
}
