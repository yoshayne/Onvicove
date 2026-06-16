import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';
import { sendOrderShipped } from '../services/email';

const app = new Hono();

const updateOrderSchema = z.object({
  status: z.enum(['pending', 'paid', 'fulfilled', 'refunded', 'cancelled']).optional(),
  fulfillment_status: z.enum(['unfulfilled', 'fulfilled', 'partial']).optional(),
  notes: z.string().nullable().optional(),
  tracking_number: z.string().nullable().optional(),
  tracking_url: z.string().url().nullable().optional(),
});

app.use('*', requireAuth, requireTenant);

// GET /api/orders
app.get('/', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const status = c.req.query('status');

  const orders = status
    ? await db`
        SELECT * FROM orders
        WHERE tenant_id = ${tenant.id} AND status = ${status}
        ORDER BY created_at DESC
      `
    : await db`
        SELECT * FROM orders
        WHERE tenant_id = ${tenant.id}
        ORDER BY created_at DESC
      `;

  return c.json({ orders });
});

// GET /api/orders/:id
app.get('/:id', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const id = c.req.param('id');

  const orders = await db`
    SELECT * FROM orders WHERE id = ${id} AND tenant_id = ${tenant.id} LIMIT 1
  `;
  if (!orders[0]) return c.json({ error: 'Order not found' }, 404);

  const items = await db`
    SELECT * FROM order_items WHERE order_id = ${id}
  `;

  return c.json({ order: orders[0], items });
});

// PATCH /api/orders/:id
app.patch('/:id', async (c) => {
  const tenant = c.get('tenant') as { id: string; company_name: string };
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parsed = updateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }

  const updates = parsed.data;
  const keys = Object.keys(updates);
  if (keys.length === 0) {
    const existing = await db`SELECT * FROM orders WHERE id = ${id} AND tenant_id = ${tenant.id} LIMIT 1`;
    if (!existing[0]) return c.json({ error: 'Order not found' }, 404);
    return c.json({ order: existing[0] });
  }

  const before = await db`SELECT tracking_number FROM orders WHERE id = ${id} AND tenant_id = ${tenant.id} LIMIT 1`;

  const rows = await db`
    UPDATE orders
    SET ${db(updates as Record<string, unknown>, ...keys)}, updated_at = NOW()
    WHERE id = ${id} AND tenant_id = ${tenant.id}
    RETURNING *
  `;

  if (!rows[0]) return c.json({ error: 'Order not found' }, 404);
  const order = rows[0];

  // Send shipped email when tracking number is newly added
  if (updates.tracking_number && !before[0]?.tracking_number) {
    sendOrderShipped({
      toEmail: order.customer_email as string,
      toName: order.customer_name as string,
      orderNumber: order.order_number as string,
      companyName: tenant.company_name,
      trackingNumber: updates.tracking_number,
      trackingUrl: (order.tracking_url as string | null) ?? null,
    }).catch((err) => console.error('Shipped email error:', err));
  }

  return c.json({ order });
});

export default app;
