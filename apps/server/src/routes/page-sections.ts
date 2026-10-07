import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';
import { getSignedFileUrl } from '../services/storage';

const app = new Hono();

app.use('*', requireAuth, requireTenant);

const sectionSchema = z.object({
  id: z.string(),
  type: z.string(),
  label: z.string().optional(),
  enabled: z.boolean(),
}).passthrough();

const upsertSectionsSchema = z.object({
  sections: z.array(sectionSchema),
});

// GET /api/page-sections/:page
app.get('/:page', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const page = c.req.param('page');

  const rows = await db`
    SELECT sections FROM page_sections
    WHERE tenant_id = ${tenant.id} AND page = ${page}
    LIMIT 1
  `;

  const sections = rows[0]?.sections ?? [];

  // Re-sign gallery image URLs so they never expire in the UI
  await Promise.all(
    sections.map(async (section: any) => {
      if (section.type !== 'gallery' || !Array.isArray(section.images)) return;
      await Promise.all(
        section.images.map(async (img: any) => {
          if (img.key) img.url = await getSignedFileUrl(img.key);
        })
      );
    })
  );

  return c.json({ sections });
});

// PUT /api/page-sections/:page — replace all sections for a page
app.put('/:page', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const page = c.req.param('page');

  const body = await c.req.json().catch(() => ({}));
  const parsed = upsertSectionsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid sections', details: parsed.error.flatten() }, 400);
  }

  // Gallery image tags: trim, cap lengths/counts, drop case-insensitive duplicates
  for (const section of parsed.data.sections as any[]) {
    if (section.type !== 'gallery' || !Array.isArray(section.images)) continue;
    for (const img of section.images) {
      if (!Array.isArray(img.tags)) { delete img.tags; continue; }
      const seen = new Set<string>();
      img.tags = img.tags
        .filter((t: unknown): t is string => typeof t === 'string')
        .map((t: string) => t.replace(/\s+/g, ' ').trim().slice(0, 30))
        .filter((t: string) => {
          const key = t.toLowerCase();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, 10);
      if (img.tags.length === 0) delete img.tags;
    }
  }

  const rows = await db`
    INSERT INTO page_sections (tenant_id, page, sections)
    VALUES (${tenant.id}, ${page}, ${db.json(parsed.data.sections as never)})
    ON CONFLICT (tenant_id, page)
    DO UPDATE SET sections = EXCLUDED.sections, updated_at = NOW()
    RETURNING sections
  `;

  return c.json({ sections: rows[0].sections });
});

export default app;
