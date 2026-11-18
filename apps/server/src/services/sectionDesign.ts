import { getSignedFileUrl } from './storage';

/** Keep only the design choices we offer (see client themes/shared/sectionDesign.ts), with text trimmed and limited */
const ALIGN = ['left', 'center', 'right'];
const SPACING = ['compact', 'normal', 'roomy'];
const BG = ['default', 'soft', 'contrast', 'accent', 'photo'];

export function cleanDesign(d: unknown, tenantId?: string): Record<string, string> | undefined {
  if (!d || typeof d !== 'object') return undefined;
  const o = d as Record<string, unknown>;
  const out: Record<string, string> = {};
  if (typeof o.align === 'string' && ALIGN.includes(o.align)) out.align = o.align;
  if (typeof o.spacing === 'string' && SPACING.includes(o.spacing)) out.spacing = o.spacing;
  if (typeof o.bg === 'string' && BG.includes(o.bg)) out.bg = o.bg;
  // A background photo must be one of the store's own files
  if (tenantId && typeof o.bgImageKey === 'string' && o.bgImageKey.startsWith(`tenants/${tenantId}/`) && !o.bgImageKey.includes('..')) out.bgImageKey = o.bgImageKey;
  if (out.bg === 'photo' && !out.bgImageKey) delete out.bg;
  if (typeof o.title === 'string' && o.title.trim()) out.title = o.title.trim().slice(0, 80);
  if (typeof o.intro === 'string' && o.intro.trim()) out.intro = o.intro.trim().slice(0, 300);
  return Object.keys(out).length ? out : undefined;
}

// ── Custom blocks (Pro and Business): text, image and button blocks the owner adds between sections ──────────

const BLOCK_KINDS = ['text', 'image', 'cta'];
export const MAX_BLOCKS = 8;

/** Links a block's button may use: web pages, email, phone and anchors on the page. Never script URLs. */
function safeHref(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const h = v.trim().slice(0, 500);
  return /^(https?:\/\/|mailto:|tel:|#|\/)/i.test(h) ? h : undefined;
}

type RawSection = { id?: unknown; type?: unknown; enabled?: unknown; [k: string]: unknown };

/** Keep only the fields a block has, with limits, and only photos that belong to the store */
export function cleanBlock(s: RawSection, tenantId: string): Record<string, unknown> | undefined {
  if (typeof s.id !== 'string' || !s.id) return undefined;
  const kind = typeof s.kind === 'string' && BLOCK_KINDS.includes(s.kind) ? s.kind : undefined;
  if (!kind) return undefined;
  const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
  const key = typeof s.imageKey === 'string' && s.imageKey.startsWith(`tenants/${tenantId}/`) && !s.imageKey.includes('..') ? s.imageKey : undefined;
  const align = typeof s.align === 'string' && ['left', 'center', 'right'].includes(s.align) ? s.align : undefined;
  const out: Record<string, unknown> = { id: s.id.slice(0, 80), type: 'block', kind, enabled: s.enabled !== false };
  const fields: Record<string, unknown> = {
    title: str(s.title, 120), body: str(s.body, 2000), imageKey: key, imageAlt: str(s.imageAlt, 160),
    buttonLabel: str(s.buttonLabel, 40), buttonHref: safeHref(s.buttonHref), align,
  };
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) out[k] = v;
  return out;
}

/**
 * The page's sections as they may be saved or shown for this plan: design choices and custom blocks are
 * Pro and Business features, and everything is cleaned to the values we offer.
 */
export function applyPlanRules<T extends { type?: unknown }>(sections: T[], plan: string | undefined, tenantId: string): T[] {
  const paid = !!plan && plan !== 'starter';
  const out: unknown[] = [];
  let blocks = 0;
  for (const s of sections as RawSection[]) {
    if (s?.type === 'block') {
      if (!paid || blocks >= MAX_BLOCKS) continue;
      const b = cleanBlock(s, tenantId);
      if (b) { out.push(b); blocks++; }
      continue;
    }
    const { design, ...rest } = s;
    const cleaned = paid ? cleanDesign(design, tenantId) : undefined;
    out.push(cleaned ? { ...rest, design: cleaned } : rest);
  }
  return out as T[];
}

/** Give each block photo and section background photo a fresh link (links expire, so only the file name is saved) */
export async function resolveBlockImages(sections: unknown): Promise<void> {
  if (!Array.isArray(sections)) return;
  await Promise.all(sections.map(async (s: { type?: string; imageKey?: string; imageUrl?: string; design?: { bgImageKey?: string; bgImageUrl?: string } }) => {
    if (s?.type === 'block' && s.imageKey) s.imageUrl = await getSignedFileUrl(s.imageKey);
    if (s?.design?.bgImageKey) s.design.bgImageUrl = await getSignedFileUrl(s.design.bgImageKey);
  }));
}

