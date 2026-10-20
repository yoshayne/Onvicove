import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';
import { cancelRecurring, RecurringError } from '../services/recurring';
import { refundLedgerCharges } from '../services/refunds';
import { sendBookingRefunded } from '../services/email';

const app = new Hono();
app.use('*', requireAuth, requireTenant);

// GET /api/recurring — the store's monthly plans
app.get('/', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const rows = await db`
    SELECT r.id, r.customer_name, r.customer_email, r.service_name, r.kind, r.frequency, r.amount_cents, r.status, r.failed_attempts,
           r.cancel_at_period_end, r.current_period_end, r.created_at, r.canceled_at, r.ended_reason,
           COALESCE((SELECT SUM(t.gross_amount_cents) FROM platform_transactions t WHERE t.reference_type = 'subscription' AND t.reference_id = r.id), 0)::int AS paid_cents
    FROM recurring_subscriptions r
    WHERE r.tenant_id = ${tenant.id} AND r.status <> 'incomplete'
    ORDER BY (r.status = 'canceled'), r.created_at DESC LIMIT 500`;
  return c.json({ plans: rows });
});

const cancelSchema = z.object({ immediately: z.boolean().optional() });

// POST /api/recurring/:id/cancel — at the end of the paid period by default, or right now
app.post('/:id/cancel', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const parsed = cancelSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);
  const own = await db`SELECT 1 FROM recurring_subscriptions WHERE id = ${c.req.param('id')} AND tenant_id = ${tenant.id}`;
  if (!own[0]) return c.json({ error: 'Plan not found' }, 404);
  try {
    const r = await cancelRecurring(c.req.param('id'), { immediately: !!parsed.data.immediately, by: 'owner' });
    return c.json({ ok: true, ends_on: r.endsOn });
  } catch (err) {
    if (err instanceof RecurringError) return c.json({ error: err.message }, err.status as 409);
    throw err;
  }
});

const refundSchema = z.object({ amount_cents: z.number().int().min(1).optional(), notify: z.boolean().optional() });

// POST /api/recurring/:id/refund — at the store's discretion: the latest payment by default, or any amount up to what is refundable
app.post('/:id/refund', async (c) => {
  const tenant = c.get('tenant') as { id: string; company_name: string; stripe_account_id: string | null };
  const parsed = refundSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);
  const plan = (await db`SELECT * FROM recurring_subscriptions WHERE id = ${c.req.param('id')} AND tenant_id = ${tenant.id}`)[0];
  if (!plan) return c.json({ error: 'Plan not found' }, 404);

  const refundable = (await db`
    SELECT t.gross_amount_cents + COALESCE((SELECT SUM(r.gross_amount_cents) FROM platform_transactions r WHERE r.refund_of = t.id), 0) AS left_cents, t.gross_amount_cents
    FROM platform_transactions t
    WHERE t.tenant_id = ${tenant.id} AND t.reference_type = 'subscription' AND t.reference_id = ${plan.id as string} AND t.gross_amount_cents > 0
    ORDER BY t.created_at DESC`);
  const totalLeft = refundable.reduce((n, r) => n + Math.max(r.left_cents as number, 0), 0);
  if (totalLeft <= 0) return c.json({ error: 'There is nothing left to refund on this plan.' }, 400);
  const latest = refundable.find((r) => (r.left_cents as number) > 0);
  const amount = parsed.data.amount_cents ?? Math.min(latest ? (latest.left_cents as number) : totalLeft, totalLeft);
  if (amount > totalLeft) return c.json({ error: `You can refund at most $${(totalLeft / 100).toFixed(2)}.` }, 400);

  const result = await refundLedgerCharges({ tenantId: tenant.id, stripeAccountId: tenant.stripe_account_id, referenceType: 'subscription', referenceId: plan.id as string, amountCents: amount });
  if (result.error) return c.json({ error: result.error }, 502);
  if (parsed.data.notify !== false) {
    sendBookingRefunded({ toEmail: plan.customer_email as string, toName: plan.customer_name as string, serviceName: plan.service_name as string, amountCents: result.toCardCents, companyName: tenant.company_name, tenantId: tenant.id })
      .catch((err) => console.error('Recurring refund email error:', err));
  }
  return c.json({ ok: true, refunded_cents: result.toCardCents });
});

export default app;
