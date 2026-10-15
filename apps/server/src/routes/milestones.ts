import { Hono } from 'hono';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';
import { FREE_FLYER_RUNS, generateFlyers, listMilestones } from '../services/milestones';

const app = new Hono();
app.use('*', requireAuth, requireTenant);

// GET /api/milestones — milestones with their flyers (free; one free redo)
app.get('/', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  return c.json({ milestones: await listMilestones(tenant.id) });
});

// POST /api/milestones/:id/flyers — make the flyers (first time) or redo them (the one free redo); runs in the background
app.post('/:id/flyers', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const rows = await db`SELECT id, flyer_runs FROM milestones WHERE id = ${c.req.param('id')} AND tenant_id = ${tenant.id} LIMIT 1`;
  if (!rows[0]) return c.json({ error: 'Milestone not found' }, 404);
  if ((rows[0].flyer_runs as number) >= FREE_FLYER_RUNS) return c.json({ error: "You've used your free redo for this flyer." }, 400);
  generateFlyers(rows[0].id as string).catch((err) => console.error('Flyer generation failed:', err));
  return c.json({ started: true }, 202);
});

export default app;
