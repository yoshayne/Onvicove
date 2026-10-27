import { db } from '../db/client';

type Kind = 'products' | 'services';

const SECTION_TYPE: Record<Kind, string> = { products: 'featured-products', services: 'services' };

/**
 * Adding a product or service is a clear signal the owner wants it on the site. Make sure the
 * store's mode includes it and the Page Builder layout carries the matching section, so a new
 * item never lands in a section that is hidden. A section the owner switched off stays off.
 */
export async function ensureStorefrontSection(tenantId: string, kind: Kind): Promise<void> {
  const wanted = kind === 'services' ? ['book', 'both'] : ['store', 'both'];
  await db`
    UPDATE tenants
    SET mode = CASE WHEN mode = ${kind === 'services' ? 'store' : 'book'} THEN 'both' ELSE mode END
    WHERE id = ${tenantId} AND mode <> ALL(${wanted})
  `;

  const rows = await db`SELECT sections FROM page_sections WHERE tenant_id = ${tenantId} AND page = 'home' LIMIT 1`;
  const sections = rows[0]?.sections;
  if (!Array.isArray(sections) || sections.length === 0) return; // no saved layout: storefront defaults apply
  const type = SECTION_TYPE[kind];
  if (sections.some((s: { type?: string }) => s?.type === type)) return;

  const next = [...sections];
  const before = next.findIndex((s: { type?: string }) => s?.type === 'about' || s?.type === 'contact');
  next.splice(before < 0 ? next.length : before, 0, { id: type, type, enabled: true });
  await db`
    UPDATE page_sections SET sections = ${db.json(next as never)}, updated_at = NOW()
    WHERE tenant_id = ${tenantId} AND page = 'home'
  `;
}
