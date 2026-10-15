import fetch from 'node-fetch';
import { db } from '../db/client';
import { getBaseUrl, getStoreUrl } from '../lib/baseUrl';
import { renderFlyer } from './flyers/render';
import { getSignedFileUrl, uploadFile } from './storage';
import { sendFirstSaleMilestone } from './email';

/** One free flyer set, plus one free redo */
export const FREE_FLYER_RUNS = 2;
const STALE_MINUTES = 5;

const FORMATS = [
  { id: 'post', label: 'Instagram post' },
  { id: 'story', label: 'Story' },
] as const;

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

/** What we know about the store when making its flyers */
export interface FlyerStore {
  company: string;
  color: string | null;
  logoKey: string | null;
  /** The store's own photo to feature (the item's photo, else its banner) */
  photoKey: string | null;
  itemName: string | null;
  kind: SaleKind;
  industry: string | null;
  businessType: string | null;
  listingNames: string[];
  url: string | null;
}

/** Make the flyer set: the store's real photo and logo with crisp text on top. Files are stored under `prefix`. Returns format → storage key. */
export async function renderFlyerSet(s: FlyerStore, prefix: string, variant = 0): Promise<Record<string, string>> {
  const [photo, logo] = await Promise.all([fetchBuffer(s.photoKey), fetchBuffer(s.logoKey)]);
  const keys: Record<string, string> = {};
  for (const f of FORMATS) {
    const r = await renderFlyer({
      company: s.company, kind: s.kind, itemName: s.itemName, industry: s.industry, businessType: s.businessType,
      listingNames: s.listingNames, brandColor: s.color, logo, photo, url: s.url, variant,
    }, f.id);
    keys[f.id] = await uploadFile(`${prefix}/${f.id}.png`, r.png, 'image/png');
  }
  return keys;
}

/** The store's own details used on a flyer (shared by real milestones and the admin preview) */
export async function loadFlyerStore(tenantId: string, kind: SaleKind, itemName: string | null, itemImageKey: string | null): Promise<FlyerStore | null> {
  const t = (await db`SELECT slug, company_name, brand_color, logo_key, hero_image_key, industry, business_type, custom_domain, custom_domain_verified, custom_domain_status FROM tenants WHERE id = ${tenantId} LIMIT 1`)[0];
  if (!t) return null;
  const [prods, servs] = await Promise.all([
    db`SELECT name FROM products WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT 5`,
    db`SELECT name FROM services WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT 5`,
  ]);
  return {
    company: t.company_name as string,
    color: t.brand_color as string | null,
    logoKey: t.logo_key as string | null,
    photoKey: itemImageKey ?? (t.hero_image_key as string | null),
    itemName, kind,
    industry: t.industry as string | null,
    businessType: t.business_type as string | null,
    listingNames: [...prods, ...servs].map((r) => r.name as string),
    url: getStoreUrl(t) ,
  };
}

async function regenerateFiles(milestoneId: string): Promise<void> {
  const m = (await db`SELECT * FROM milestones WHERE id = ${milestoneId}`)[0];
  if (!m) return;
  const run = (m.flyer_runs as number) + 1;
  const store = await loadFlyerStore(m.tenant_id as string, m.reference_type === 'booking' ? 'booking' : 'order', m.item_name as string | null, m.item_image_key as string | null);
  if (!store) return;
  // First run uses the look chosen for this kind of business; the free redo changes only the layout (same photo, same words)
  const keys = await renderFlyerSet(store, `milestones/${m.tenant_id}/${m.id}/run-${run}`, run - 1);
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
