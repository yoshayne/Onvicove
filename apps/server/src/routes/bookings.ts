import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';
import { createBookingPaymentIntent } from '../services/stripe';
import { sendPaymentLinkEmail, sendBookingCancelled } from '../services/email';

const app = new Hono();

const updateBookingSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']).optional(),
  internal_notes: z.string().nullable().optional(),
});

const createBookingSchema = z.object({
  service_id: z.string().uuid(),
  staff_id: z.string().uuid().nullable().optional(),
  customer_id: z.string().uuid().nullable().optional(),
  customer_name: z.string().min(1),
  customer_email: z.string().email(),
  customer_phone: z.string().nullable().optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  notes: z.string().nullable().optional(),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']).optional(),
});

app.use('*', requireAuth, requireTenant);

// GET /api/bookings — filters: status, date_from, date_to
app.get('/', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const status = c.req.query('status');
  const dateFrom = c.req.query('date_from');
  const dateTo = c.req.query('date_to');

  const conditions = [db`tenant_id = ${tenant.id}`];
  if (status) conditions.push(db`status = ${status}`);
  if (dateFrom) conditions.push(db`start_time >= ${dateFrom}`);
  if (dateTo) conditions.push(db`start_time <= ${dateTo}`);

  const whereClause = conditions.reduce((acc, cond) => db`${acc} AND ${cond}`);

  const bookings = await db`
    SELECT * FROM bookings
    WHERE ${whereClause}
    ORDER BY start_time ASC
  `;

  return c.json({ bookings });
});

// GET /api/bookings/:id
app.get('/:id', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const id = c.req.param('id');
  const rows = await db`
    SELECT * FROM bookings WHERE id = ${id} AND tenant_id = ${tenant.id} LIMIT 1
  `;
  if (!rows[0]) return c.json({ error: 'Booking not found' }, 404);
  return c.json({ booking: rows[0] });
});

// POST /api/bookings — create with conflict detection
app.post('/', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const body = await c.req.json().catch(() => ({}));
  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }
  const d = parsed.data;

  if (new Date(d.start_time) >= new Date(d.end_time)) {
    return c.json({ error: 'start_time must be before end_time' }, 400);
  }

  const service = await db`
    SELECT * FROM services WHERE id = ${d.service_id} AND tenant_id = ${tenant.id} LIMIT 1
  `;
  if (!service[0]) return c.json({ error: 'Service not found' }, 404);

  if (d.staff_id) {
    const conflicts = await db`
      SELECT id FROM bookings
      WHERE staff_id = ${d.staff_id}
      AND tenant_id = ${tenant.id}
      AND status NOT IN ('cancelled', 'no_show')
      AND start_time < ${d.end_time}
      AND end_time > ${d.start_time}
      LIMIT 1
    `;
    if (conflicts[0]) {
      return c.json({ error: 'This time slot conflicts with an existing booking' }, 409);
    }
  }

  const amountCents = service[0].price_cents as number;

  const rows = await db`
    INSERT INTO bookings (
      tenant_id, service_id, staff_id, customer_id, customer_name, customer_email,
      customer_phone, start_time, end_time, notes, status, amount_cents
    ) VALUES (
      ${tenant.id}, ${d.service_id}, ${d.staff_id ?? null}, ${d.customer_id ?? null},
      ${d.customer_name}, ${d.customer_email}, ${d.customer_phone ?? null},
      ${d.start_time}, ${d.end_time}, ${d.notes ?? null},
      ${d.status ?? (tenant as unknown as { booking_mode?: string }).booking_mode === 'manual' ? 'pending' : 'confirmed'},
      ${amountCents}
    )
    RETURNING *
  `;

  return c.json({ booking: rows[0] }, 201);
});

// PATCH /api/bookings/:id
app.patch('/:id', async (c) => {
  const tenant = c.get('tenant') as { id: string; company_name: string };
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parsed = updateBookingSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }

  const updates = parsed.data;
  const keys = Object.keys(updates);
  if (keys.length === 0) {
    const existing = await db`SELECT * FROM bookings WHERE id = ${id} AND tenant_id = ${tenant.id} LIMIT 1`;
    if (!existing[0]) return c.json({ error: 'Booking not found' }, 404);
    return c.json({ booking: existing[0] });
  }

  const before = await db`SELECT status FROM bookings WHERE id = ${id} AND tenant_id = ${tenant.id} LIMIT 1`;

  const rows = await db`
    UPDATE bookings
    SET ${db(updates as Record<string, unknown>, ...keys)}, updated_at = NOW()
    WHERE id = ${id} AND tenant_id = ${tenant.id}
    RETURNING *
  `;

  if (!rows[0]) return c.json({ error: 'Booking not found' }, 404);
  const booking = rows[0];

  if (updates.status === 'cancelled' && before[0]?.status !== 'cancelled') {
    const svcRows = await db`SELECT name FROM services WHERE id = ${booking.service_id} LIMIT 1`;
    sendBookingCancelled({
      toEmail: booking.customer_email as string,
      toName: booking.customer_name as string,
      serviceName: (svcRows[0]?.name as string) ?? 'your appointment',
      startTime: new Date(booking.start_time as string).toLocaleString(),
      endTime: new Date(booking.end_time as string).toLocaleString(),
      companyName: tenant.company_name,
    }).catch((err) => console.error('Booking cancelled email error:', err));
  }

  return c.json({ booking });
});

// GET /api/bookings/:id/payment-info — remaining balance + card-on-file info
app.get('/:id/payment-info', async (c) => {
  const tenant = c.get('tenant') as { id: string; currency: string; stripe_account_id: string | null };
  const id = c.req.param('id');

  const rows = await db`
    SELECT b.*, c.card_brand, c.card_last4, c.stripe_customer_id, c.stripe_payment_method_id
    FROM bookings b
    LEFT JOIN customers c ON c.id = b.customer_id
    WHERE b.id = ${id} AND b.tenant_id = ${tenant.id} LIMIT 1
  `;
  const booking = rows[0];
  if (!booking) return c.json({ error: 'Booking not found' }, 404);

  const remainingCents = Math.max((booking.amount_cents as number ?? 0) - (booking.deposit_paid_cents as number ?? 0), 0);

  return c.json({
    remaining_cents: remainingCents,
    amount_cents: booking.amount_cents,
    deposit_paid_cents: booking.deposit_paid_cents ?? 0,
    has_card: !!booking.stripe_payment_method_id,
    card_brand: booking.card_brand,
    card_last4: booking.card_last4,
    currency: tenant.currency,
  });
});

// POST /api/bookings/:id/balance-intent — create PaymentIntent for remaining balance (in-person collection)
app.post('/:id/balance-intent', async (c) => {
  const tenant = c.get('tenant') as { id: string; currency: string; stripe_account_id: string | null };
  const id = c.req.param('id');

  const rows = await db`
    SELECT b.*, c.stripe_customer_id
    FROM bookings b
    LEFT JOIN customers c ON c.id = b.customer_id
    WHERE b.id = ${id} AND b.tenant_id = ${tenant.id} LIMIT 1
  `;
  const booking = rows[0];
  if (!booking) return c.json({ error: 'Booking not found' }, 404);
  if (!tenant.stripe_account_id) return c.json({ error: 'This business has not connected Stripe yet' }, 400);

  const remainingCents = Math.max((booking.amount_cents as number ?? 0) - (booking.deposit_paid_cents as number ?? 0), 0);
  if (remainingCents <= 0) return c.json({ error: 'No remaining balance' }, 400);

  const paymentIntent = await createBookingPaymentIntent({
    amountCents: remainingCents,
    currency: tenant.currency || 'usd',
    stripeAccountId: tenant.stripe_account_id,
    tenantId: tenant.id,
    bookingId: id,
    referenceType: 'booking_balance',
    stripeCustomerId: booking.stripe_customer_id as string | null,
  });

  return c.json({ client_secret: paymentIntent.client_secret, amount: remainingCents });
});

// POST /api/bookings/:id/charge-saved-card — off-session charge using card on file
app.post('/:id/charge-saved-card', async (c) => {
  const tenant = c.get('tenant') as { id: string; currency: string; stripe_account_id: string | null };
  const id = c.req.param('id');

  const rows = await db`
    SELECT b.*, c.stripe_customer_id, c.stripe_payment_method_id
    FROM bookings b
    LEFT JOIN customers c ON c.id = b.customer_id
    WHERE b.id = ${id} AND b.tenant_id = ${tenant.id} LIMIT 1
  `;
  const booking = rows[0];
  if (!booking) return c.json({ error: 'Booking not found' }, 404);
  if (!tenant.stripe_account_id) return c.json({ error: 'This business has not connected Stripe yet' }, 400);
  if (!booking.stripe_customer_id || !booking.stripe_payment_method_id) {
    return c.json({ error: 'No card on file for this customer' }, 400);
  }

  const remainingCents = Math.max((booking.amount_cents as number ?? 0) - (booking.deposit_paid_cents as number ?? 0), 0);
  if (remainingCents <= 0) return c.json({ error: 'No remaining balance' }, 400);

  const paymentIntent = await createBookingPaymentIntent({
    amountCents: remainingCents,
    currency: tenant.currency || 'usd',
    stripeAccountId: tenant.stripe_account_id,
    tenantId: tenant.id,
    bookingId: id,
    referenceType: 'booking_balance',
    stripeCustomerId: booking.stripe_customer_id as string,
    paymentMethodId: booking.stripe_payment_method_id as string,
  });

  return c.json({ status: paymentIntent.status, amount: remainingCents });
});

// POST /api/bookings/:id/send-payment-link — emails the customer a link to pay the remaining balance
app.post('/:id/send-payment-link', async (c) => {
  const tenant = c.get('tenant') as { id: string; company_name: string };
  const id = c.req.param('id');

  const rows = await db`
    SELECT b.*, s.name AS service_name
    FROM bookings b
    JOIN services s ON s.id = b.service_id
    WHERE b.id = ${id} AND b.tenant_id = ${tenant.id} LIMIT 1
  `;
  const booking = rows[0];
  if (!booking) return c.json({ error: 'Booking not found' }, 404);

  const remainingCents = Math.max((booking.amount_cents as number ?? 0) - (booking.deposit_paid_cents as number ?? 0), 0);
  if (remainingCents <= 0) return c.json({ error: 'No remaining balance' }, 400);

  await sendPaymentLinkEmail({
    toEmail: booking.customer_email as string,
    toName: booking.customer_name as string,
    serviceName: booking.service_name as string,
    amountCents: remainingCents,
    companyName: tenant.company_name,
    bookingId: id,
  });

  return c.json({ sent: true });
});

export default app;
