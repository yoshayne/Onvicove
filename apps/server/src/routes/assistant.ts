import { Hono } from 'hono';
import { z } from 'zod';
import { redis } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';
import { actionSchema, applyActions, ApplyError, askModel, AssistantUnavailable, planActions, undoChange, type AssistantTenant } from '../services/calendarAssistant';

const app = new Hono();
app.use('*', requireAuth, requireTenant);

const DAILY_LIMIT = 40; // requests per store per day: keeps the cost small

const chatSchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(1500) })).min(1).max(12),
});

// POST /api/assistant/calendar — turn a plain-English request into a proposed change (nothing is applied yet)
app.post('/calendar', async (c) => {
  const tenant = c.get('tenant') as unknown as AssistantTenant;
  const parsed = chatSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success || parsed.data.messages[parsed.data.messages.length - 1].role !== 'user') return c.json({ error: 'Tell me what you would like to change.' }, 400);

  const key = `assistant:${tenant.id}:${new Date().toISOString().slice(0, 10)}`;
  const used = await redis.incr(key).catch(() => 0);
  if (used === 1) await redis.expire(key, 90_000).catch(() => undefined);
  if (used > DAILY_LIMIT) return c.json({ error: "You've reached today's limit for the assistant. You can still edit your calendar by hand." }, 429);

  try {
    const { reply, actions, rejected } = await askModel(tenant, parsed.data.messages);
    const planned = await planActions(tenant, actions);
    const fallback = rejected && planned.length === 0 ? "I couldn't turn that into a calendar change. Could you say which days, which hours, and whether it ends?" : '';
    return c.json({ reply: reply || fallback, planned });
  } catch (err) {
    if (err instanceof AssistantUnavailable) return c.json({ error: err.message }, 503);
    console.error('Calendar assistant error:', err);
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

const applySchema = z.object({ actions: z.array(actionSchema).min(1).max(10), request_text: z.string().max(1500).optional() });

// POST /api/assistant/calendar/apply — the owner confirmed
app.post('/calendar/apply', async (c) => {
  const tenant = c.get('tenant') as unknown as AssistantTenant;
  const parsed = applySchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Invalid change' }, 400);
  try {
    const result = await applyActions(tenant, parsed.data.actions, parsed.data.request_text ?? '');
    return c.json({ change_id: result.changeId, applied: result.applied });
  } catch (err) {
    if (err instanceof ApplyError) return c.json({ error: err.message }, 400);
    throw err;
  }
});

// POST /api/assistant/calendar/undo/:id
app.post('/calendar/undo/:id', async (c) => {
  const tenant = c.get('tenant') as unknown as AssistantTenant;
  const ok = await undoChange(tenant.id, c.req.param('id'));
  if (!ok) return c.json({ error: 'Nothing to undo' }, 404);
  return c.json({ ok: true });
});

export default app;
