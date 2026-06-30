import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';

const app = new Hono();
app.use('*', requireAuth, requireTenant);

// GET /api/page-sections/:page — tenant's own sections for a page (e.g. "home")
app.get('/:page', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const page = c.req.param('page');
  const rows = await db`
    SELECT sections FROM page_sections WHERE tenant_id = ${tenant.id} AND page = ${page} LIMIT 1
  `;
  return c.json({ sections: rows[0]?.sections ?? [] });
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
    VALUES (${tenant.id}, ${page}, ${JSON.stringify(parsed.data)}, NOW())
    ON CONFLICT (tenant_id, page) DO UPDATE SET sections = EXCLUDED.sections, updated_at = NOW()
  `;
  return c.json({ sections: parsed.data });
});

export default app;
