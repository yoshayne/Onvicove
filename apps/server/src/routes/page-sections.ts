import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';

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

  return c.json({ sections: rows[0]?.sections ?? [] });
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
