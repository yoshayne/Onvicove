import { Hono } from 'hono';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';
import { blockConflicts, createTimeBlock, describeBlock, listTimeBlocks, timeBlockInput } from '../services/timeBlocks';

const app = new Hono();
app.use('*', requireAuth, requireTenant);

// GET /api/time-blocks — repeating and part-of-day time off
app.get('/', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const blocks = await listTimeBlocks(tenant.id);
  return c.json({ time_blocks: blocks.map((b) => ({ ...b, description: describeBlock(b) })) });
});

// POST /api/time-blocks
app.post('/', async (c) => {
  const tenant = c.get('tenant') as { id: string; timezone?: string | null };
  const parsed = timeBlockInput.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Invalid time off' }, 400);
  const conflicts = await blockConflicts(tenant.id, tenant.timezone || 'America/New_York', parsed.data);
  const block = await createTimeBlock(tenant.id, parsed.data, 'manual');
  // Existing bookings are never cancelled by blocking time: tell the owner about them
  return c.json({ time_block: { ...block, description: describeBlock(block) }, existing_bookings: conflicts.count }, 201);
});

// DELETE /api/time-blocks/:id
app.delete('/:id', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  await db`DELETE FROM time_blocks WHERE id = ${c.req.param('id')} AND tenant_id = ${tenant.id}`;
  return c.json({ ok: true });
});

export default app;
