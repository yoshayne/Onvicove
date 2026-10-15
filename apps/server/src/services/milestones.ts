import fetch from 'node-fetch';
import sharp from 'sharp';
import { db } from '../db/client';
import { getBaseUrl } from '../lib/baseUrl';
import { generatePromoGraphic } from './gemini';
import { getSignedFileUrl, uploadFile } from './storage';
import { sendFirstSaleMilestone } from './email';

/** One free flyer set, plus one free redo */
export const FREE_FLYER_RUNS = 2;
const STALE_MINUTES = 5;

const FORMATS = [
  { id: 'post', label: 'Instagram post', ratio: '1:1' as const, w: 1080, h: 1080, hint: '/social-promo /instagram-post — a square feed graphic' },
  { id: 'story', label: 'Story', ratio: '9:16' as const, w: 1080, h: 1920, hint: '/social-promo /instagram-story — a tall vertical Story graphic with the key text kept away from the very top and bottom' },
];

async function fetchBuffer(key: string | null | undefined): Promise<Buffer | null> {
  if (!key) return null;
  try {
    const res = await fetch(await getSignedFileUrl(key));
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export type SaleKind = 'order' | 'booking';

function promptFor(format: (typeof FORMATS)[number], d: { company: string; item: string | null; color: string; hasPhoto: boolean; hasLogo: boolean; kind: SaleKind }) {
  const booking = d.kind === 'booking';
  return [
    `Design a polished promotional social media graphic. Style shortcuts: ${format.hint}, /premium-branding, /modern-banner, celebratory but classy.`,
    booking ? 'It announces that a small service business just got its very first booking through its new website.' : 'It announces that a small business just made its very first sale on its new website.',
    d.hasPhoto
      ? (booking
        ? `The first reference image is the business's own work or space${d.item ? ` (their "${d.item}" service)` : ''}. Use it as the hero visual and keep it looking exactly like the photo: do not change or invent anything in it.`
        : `The first reference image is the real product that sold${d.item ? ` ("${d.item}")` : ''}. Feature it prominently and keep it looking exactly like the photo: do not change, redraw or invent any of its text, logos or details.`)
      : `The business offers ${d.item ?? 'its services'}; use tasteful abstract shapes, soft light and confetti in the brand color. Do not invent people, products or places.`,
    d.hasLogo ? `The ${d.hasPhoto ? 'second' : 'first'} reference image is the business logo: place it small and clean, exactly as it is.` : '',
    `Brand color: ${d.color}. Build the palette around it.`,
    `Text on the graphic, spelled EXACTLY, and nothing else: headline "${booking ? 'FIRST BOOKING!' : 'FIRST SALE!'}" in large bold type, and the business name "${d.company}" beneath it. Do not add any other words, URLs or prices.`,
    'Clean layout, generous spacing, high contrast, readable on a phone.',
  ].filter(Boolean).join(' ');
}

/** Make the flyer set for a store and item; files are stored under `prefix`. Returns format → storage key. */
export async function renderFlyerSet(
  s: { company: string; color: string | null; logoKey: string | null; itemName: string | null; itemImageKey: string | null; kind: SaleKind },
  prefix: string,
): Promise<Record<string, string>> {
  const [photo, logo] = await Promise.all([fetchBuffer(s.itemImageKey), fetchBuffer(s.logoKey)]);
  const refs = [photo, logo].filter((b): b is Buffer => !!b);
  const keys: Record<string, string> = {};
  for (const f of FORMATS) {
    const raw = await generatePromoGraphic(
      promptFor(f, { company: s.company, item: s.itemName, color: s.color || '#111111', hasPhoto: !!photo, hasLogo: !!logo, kind: s.kind }),
      refs,
      f.ratio,
    );
    const png = await sharp(raw).resize(f.w, f.h, { fit: 'cover' }).png().toBuffer();
    keys[f.id] = await uploadFile(`${prefix}/${f.id}.png`, png, 'image/png');
  }
  return keys;
}

async function regenerateFiles(milestoneId: string): Promise<void> {
  const rows = await db`
    SELECT m.*, t.company_name, t.brand_color, t.logo_key, t.hero_image_key FROM milestones m JOIN tenants t ON t.id = m.tenant_id WHERE m.id = ${milestoneId}
  `;
  const m = rows[0];
  if (!m) return;
  const run = (m.flyer_runs as number) + 1;
  const keys = await renderFlyerSet(
    { company: m.company_name as string, color: m.brand_color as string | null, logoKey: m.logo_key as string | null, itemName: m.item_name as string | null, itemImageKey: (m.item_image_key as string | null) ?? (m.reference_type === 'booking' ? (m.hero_image_key as string | null) : null), kind: m.reference_type === 'booking' ? 'booking' : 'order' },
    `milestones/${m.tenant_id}/${m.id}/run-${run}`,
  );
  await db`UPDATE milestones SET flyer_keys = ${db.json(keys as never)}, flyer_runs = ${run} WHERE id = ${milestoneId}`;
}

/** Make (or remake) the flyers in the background. Returns false when one is already being made. */
export async function generateFlyers(milestoneId: string): Promise<boolean> {
  const claimed = await db`
    UPDATE milestones SET generating_since = NOW()
    WHERE id = ${milestoneId} AND (generating_since IS NULL OR generating_since < NOW() - make_interval(mins => ${STALE_MINUTES}))
    RETURNING id
  `;
  if (!claimed[0]) return false;
  try {
    await regenerateFiles(milestoneId);
  } finally {
    await db`UPDATE milestones SET generating_since = NULL WHERE id = ${milestoneId}`;
  }
  return true;
}

/** Called after a payment settles. The store's very first paid order/booking starts the milestone. */
export async function checkFirstSale(tenantId: string, referenceType: 'order' | 'booking', referenceId: string): Promise<void> {
  const count = await db`
    SELECT COUNT(*)::int AS n FROM platform_transactions
    WHERE tenant_id = ${tenantId} AND reference_type IN ('order', 'booking') AND gross_amount_cents > 0
  `;
  if ((count[0]?.n as number) !== 1) return; // not the first (or the store sold before this feature existed)

  let item: { name: string | null; image: string | null } = { name: null, image: null };
  if (referenceType === 'order') {
    const r = await db`
      SELECT oi.name, p.image_keys->>0 AS image FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ${referenceId} ORDER BY oi.total_cents DESC LIMIT 1
    `.catch(() => []);
    item = { name: (r[0]?.name as string) ?? null, image: (r[0]?.image as string) ?? null };
  } else {
    const r = await db`SELECT s.name, s.image_keys->>0 AS image FROM bookings b JOIN services s ON s.id = b.service_id WHERE b.id = ${referenceId}`;
    item = { name: (r[0]?.name as string) ?? null, image: (r[0]?.image as string) ?? null };
  }
  const created = await db`
    INSERT INTO milestones (tenant_id, kind, item_name, item_image_key, reference_type, reference_id)
    VALUES (${tenantId}, 'first_sale', ${item.name}, ${item.image}, ${referenceType}, ${referenceId})
    ON CONFLICT (tenant_id, kind) DO NOTHING RETURNING id
  `;
  const id = created[0]?.id as string | undefined;
  if (!id) return;

  try {
    await generateFlyers(id);
  } catch (err) {
    console.error('First-sale flyer generation failed (the owner can create it from the dashboard):', err);
  }

  const info = await db`
    SELECT t.company_name, t.milestone_emails, u.email AS owner_email, u.first_name AS owner_name
    FROM tenants t LEFT JOIN users u ON u.clerk_user_id = t.clerk_user_id WHERE t.id = ${tenantId} LIMIT 1
  `;
  const t = info[0];
  if (!t?.owner_email || t.milestone_emails === false) return;
  const base = getBaseUrl();
  await sendFirstSaleMilestone({
    toEmail: t.owner_email as string,
    toName: (t.owner_name as string) || (t.company_name as string),
    companyName: t.company_name as string,
    itemName: item.name,
    kind: referenceType,
    dashboardUrl: `${base}/dashboard`,
    settingsUrl: `${base}/dashboard/settings`,
    hasFlyers: ((await db`SELECT flyer_runs FROM milestones WHERE id = ${id}`)[0]?.flyer_runs as number) > 0,
    tenantId,
  });
  await db`UPDATE milestones SET emailed_at = NOW() WHERE id = ${id}`;
}

export const FLYER_FORMATS = FORMATS;

export async function listMilestones(tenantId: string) {
  const rows = await db`SELECT * FROM milestones WHERE tenant_id = ${tenantId} ORDER BY created_at DESC`;
  return Promise.all(rows.map(async (m) => {
    const keys = (m.flyer_keys ?? {}) as Record<string, string>;
    const flyers = await Promise.all(FORMATS.filter((f) => keys[f.id]).map(async (f) => ({ format: f.id, label: f.label, url: await getSignedFileUrl(keys[f.id]) })));
    const generating = !!m.generating_since && Date.now() - new Date(m.generating_since as string).getTime() < STALE_MINUTES * 60_000;
    return {
      id: m.id as string,
      kind: m.kind as string,
      reference_type: m.reference_type as string | null,
      item_name: m.item_name as string | null,
      created_at: m.created_at as string,
      flyers,
      generating,
      redos_left: Math.max(FREE_FLYER_RUNS - (m.flyer_runs as number), 0),
      can_generate: !generating && (m.flyer_runs as number) < FREE_FLYER_RUNS,
    };
  }));
}
