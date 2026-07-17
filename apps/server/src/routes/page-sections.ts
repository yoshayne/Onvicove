import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';
import { getSignedFileUrl } from '../services/storage';

const app = new Hono();
app.use('*', requireAuth, requireTenant);

// Refresh any gallery image signed URLs from stored keys
async function refreshGalleryUrls(sections: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
  return Promise.all(
    sections.map(async (s) => {
      if (s.type !== 'gallery' || !Array.isArray(s.images)) return s;
      const images = await Promise.all(
        (s.images as Record<string, unknown>[]).map(async (img) => {
          if (img.key && typeof img.key === 'string') {
            return { ...img, url: await getSignedFileUrl(img.key) };
          }
          return img;
        })
      );
      return { ...s, images };
    })
  );
}

// GET /api/page-sections/:page — tenant's own sections for a page (e.g. "home")
app.get('/:page', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const page = c.req.param('page');
  const rows = await db`
    SELECT sections FROM page_sections WHERE tenant_id = ${tenant.id} AND page = ${page} LIMIT 1
  `;
  const raw = (rows[0]?.sections ?? []) as Record<string, unknown>[];
  const sections = await refreshGalleryUrls(raw);
  return c.json({ sections });
});

const sectionsSchema = z.array(z.record(z.string(), z.unknown()));

// PUT /api/page-sections/:page — upsert full sections array for a page
app.put('/:page', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const page = c.req.param('page');
  const body = await c.req.json().catch(() => null);
  const parsed = sectionsSchema.safeParse(body?.sections);
  if (!parsed.success) return c.json({ error: 'Invalid sections payload' }, 400);

  await db`
    INSERT INTO page_sections (tenant_id, page, sections, updated_at)
    VALUES (${tenant.id}, ${page}, ${db.json(parsed.data as never)}, NOW())
    ON CONFLICT (tenant_id, page) DO UPDATE SET sections = EXCLUDED.sections, updated_at = NOW()
  `;
  const sections = await refreshGalleryUrls(parsed.data);
  return c.json({ sections });
});

export default app;
