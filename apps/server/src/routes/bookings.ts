import { Hono } from 'hono';
import { fromZonedTime } from 'date-fns-tz';
import { getBaseUrl } from '../lib/baseUrl';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';
import { createBookingPaymentIntent, usableStripeIds, computePlatformFee } from '../services/stripe';
import { getCustomerBaseUrl } from '../lib/baseUrl';
import { sendPaymentLinkEmail, sendBookingCancelled, sendTenantBookingCancelled, sendBookingConfirmation, sendTenantNewBooking } from '../services/email';
import { slotsForService, holdsTime } from '../services/slots';
import { formatBookingTime } from '../lib/time';
import { manageUrlFor, newManageToken } from '../services/bookingManage';
import { sendReminderForBooking } from '../services/reminders';
import { queueCalendarSync } from '../services/calendarSync';
import { refundStorePayment } from '../services/stripe';
import { sendBookingRefunded } from '../services/email';

const app = new Hono();

const updateBookingSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']).optional(),
  internal_notes: z.string().nullable().optional(),
  // Edit-booking form (these used to be dropped silently, so edits never saved)
  customer_name: z.string().min(1).optional(),
  customer_email: z.string().email().optional(),
  customer_phone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  amount_cents: z.number().int().min(0).optional(),
  // Move the appointment: wall-clock date and times in the business's timezone
  // The end follows from the service's length unless one is given
  reschedule: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  }).optional(),
  /** Where it happens (shown to the customer in emails) */
  location: z.string().max(300).nullable().optional(),
  /** One-off length in minutes, instead of the type's usual length */
  duration_minutes: z.number().int().min(5).max(1440).optional(),
  /** Change the type of booking (its length then sets the end time) */
  service_id: z.string().uuid().optional(),
  /** Change the professional (null = anyone) */
  staff_id: z.string().uuid().nullable().optional(),
  /** Email the customer about a change to time / service / professional (default yes) */
  notify: z.boolean().optional(),
  /** Move it even if it overlaps another booking */
  force: z.boolean().optional(),
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

// GET /api/bookings/availability?service_id=&date=YYYY-MM-DD&staff_id= (optional)
app.get('/availability', async (c) => {
  const tenant = c.get('tenant') as { id: string; timezone?: string };
  const serviceId = c.req.query('service_id');
  const date = c.req.query('date');
  const staffId = c.req.query('staff_id');

  if (!serviceId || !date) {
    return c.json({ error: 'service_id and date are required' }, 400);
  }

  const services = await db`SELECT * FROM services WHERE id = ${serviceId} AND tenant_id = ${tenant.id} LIMIT 1`;
  if (!services[0]) return c.json({ error: 'Service not found' }, 404);

  const result = await slotsForService({ tenant: { ...(tenant as object), booking_notice_minutes: 0 } as never, service: services[0] as never, date, staffId });
  return c.json({ slots: result.slots, staffId: result.staffId, timezone: result.timezone, reason: result.reason, city_label: result.cityLabel, blocked_label: result.blockedLabel });
});

// GET /api/bookings — filters: status, date_from, date_to
app.get('/', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const status = c.req.query('status');
  const dateFrom = c.req.query('date_from');
  const dateTo = c.req.query('date_to');

  // Everything, including unpaid attempts (status 'awaiting_payment'), so the owner can see who tried to book
  const conditions = [db`b.tenant_id = ${tenant.id}`];
  if (status) conditions.push(db`b.status = ${status}`);
  // Unpaid attempts older than 14 days are noise: only shown when filtering for them explicitly
  else conditions.push(db`NOT (b.status = 'awaiting_payment' AND b.created_at < NOW() - INTERVAL '14 days')`);
  if (dateFrom) conditions.push(db`b.start_time >= ${dateFrom}`);
  if (dateTo) conditions.push(db`b.start_time <= ${dateTo}`);

  const whereClause = conditions.reduce((acc, cond) => db`${acc} AND ${cond}`);

  const bookings = await db`
    SELECT b.*, s.name AS service_name, st.name AS staff_name
    FROM bookings b
    LEFT JOIN services s ON s.id = b.service_id
    LEFT JOIN staff st ON st.id = b.staff_id
    WHERE ${whereClause}
    ORDER BY b.start_time ASC
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
      AND ${holdsTime()}
      AND start_time < ${d.end_time}
      AND end_time > ${d.start_time}
      LIMIT 1
    `;
    if (conflicts[0]) {
      return c.json({ error: 'This time slot conflicts with an existing booking' }, 409);
    }
  }

  const amountCents = service[0].price_cents as number;

  const tenantFull = tenant as unknown as { id: string; company_name: string; booking_mode?: string; clerk_user_id?: string };
  const bookingStatus = d.status ?? (tenantFull.booking_mode === 'manual' ? 'pending' : 'confirmed');

  const rows = await db`
    INSERT INTO bookings (
      tenant_id, service_id, staff_id, customer_id, customer_name, customer_email,
      customer_phone, start_time, end_time, notes, status, amount_cents
    ) VALUES (
      ${tenant.id}, ${d.service_id}, ${d.staff_id ?? null}, ${d.customer_id ?? null},
      ${d.customer_name}, ${d.customer_email}, ${d.customer_phone ?? null},
      ${d.start_time}, ${d.end_time}, ${d.notes ?? null},
      ${bookingStatus}, ${amountCents}
    )
    RETURNING *
  `;
  const booking = rows[0];

  if (bookingStatus === 'confirmed' && d.customer_email) {
    const fmt = (t: string) => formatBookingTime(t, (tenant as unknown as { timezone?: string }).timezone);
    const baseUrl = getBaseUrl();
    sendBookingConfirmation({
      toEmail: d.customer_email,
      toName: d.customer_name,
      serviceName: service[0].name as string,
      startTime: fmt(d.start_time),
      endTime: fmt(d.end_time),
      companyName: tenantFull.company_name,
        manageUrl: await manageUrlFor(tenant, booking.id as string),
        cancelWindowHours: (tenant as unknown as { cancel_window_hours?: number }).cancel_window_hours ?? 24,
      tenantId: tenant.id,
      bookingId: booking.id as string,
    }).catch((err) => console.error('Dashboard booking confirmation email error:', err));
    if (tenantFull.clerk_user_id) {
      const ownerRows = await db`SELECT email FROM users WHERE clerk_user_id = ${tenantFull.clerk_user_id} LIMIT 1`;
      const tenantEmail = ownerRows[0]?.email as string | null;
      if (tenantEmail) {
        sendTenantNewBooking({
          tenantEmail,
          companyName: tenantFull.company_name,
          serviceName: service[0].name as string,
          customerName: d.customer_name,
          customerEmail: d.customer_email,
          startTime: fmt(d.start_time),
          endTime: fmt(d.end_time),
          dashboardUrl: `${baseUrl}/dashboard/bookings`,
        }).catch((err) => console.error('Dashboard tenant new booking email error:', err));
      }
    }
  }

  queueCalendarSync(booking.id as string);
  return c.json({ booking }, 201);
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

  const { reschedule, force, notify, duration_minutes: customMinutes, ...fields } = parsed.data;
  const updates: Record<string, unknown> = { ...fields };
  const tz = ((tenant as unknown as { timezone?: string }).timezone) || 'America/New_York';
  let movedTo: { start: string; end: string } | null = null;
  let changedWhat = false;

  if (reschedule || customMinutes || fields.service_id || fields.staff_id !== undefined) {
    const curRows = await db`
      SELECT b.*, s.duration_minutes AS current_minutes
      FROM bookings b JOIN services s ON s.id = b.service_id
      WHERE b.id = ${id} AND b.tenant_id = ${tenant.id} LIMIT 1
    `;
    const cur = curRows[0];
    if (!cur) return c.json({ error: 'Booking not found' }, 404);

    let minutes = cur.current_minutes as number;
    if (fields.service_id && fields.service_id !== cur.service_id) {
      const sv = await db`SELECT duration_minutes FROM services WHERE id = ${fields.service_id} AND tenant_id = ${tenant.id} LIMIT 1`;
      if (!sv[0]) return c.json({ error: 'That service was not found' }, 404);
      minutes = sv[0].duration_minutes as number;
      changedWhat = true;
    }
    if (customMinutes) minutes = customMinutes;
    let staffId = (cur.staff_id as string | null) ?? null;
    if (fields.staff_id !== undefined) {
      if (fields.staff_id) {
        const st = await db`SELECT 1 FROM staff WHERE id = ${fields.staff_id} AND tenant_id = ${tenant.id} LIMIT 1`;
        if (!st[0]) return c.json({ error: 'That team member was not found' }, 404);
      }
      if (fields.staff_id !== staffId) changedWhat = true;
      staffId = fields.staff_id;
    }

    const currentStart = new Date(cur.start_time as string);
    const currentEnd = new Date(cur.end_time as string);
    const newStart = reschedule ? fromZonedTime(`${reschedule.date} ${reschedule.start}:00`, tz) : currentStart;
    let newEnd: Date;
    if (reschedule?.end) {
      newEnd = fromZonedTime(`${reschedule.date} ${reschedule.end}:00`, tz);
      if (newEnd <= newStart) newEnd = new Date(newEnd.getTime() + 24 * 3600_000);
    } else if (reschedule || customMinutes || (fields.service_id && fields.service_id !== cur.service_id)) {
      newEnd = new Date(newStart.getTime() + minutes * 60_000); // the service's length decides how long it runs
    } else {
      newEnd = currentEnd;
    }

    const timeChanged = newStart.getTime() !== currentStart.getTime() || newEnd.getTime() !== currentEnd.getTime();
    if (timeChanged || fields.staff_id !== undefined) {
      if (!force) {
        const clash = await db`
          SELECT 1 FROM bookings
          WHERE tenant_id = ${tenant.id} AND id <> ${id} AND ${holdsTime()}
            AND (${staffId}::uuid IS NULL OR staff_id = ${staffId}::uuid OR staff_id IS NULL)
            AND start_time < ${newEnd.toISOString()} AND end_time > ${newStart.toISOString()}
          LIMIT 1
        `;
        if (clash[0]) return c.json({ error: 'That time overlaps another booking.', conflict: true }, 409);
      }
    }
    if (timeChanged) {
      movedTo = { start: newStart.toISOString(), end: newEnd.toISOString() };
      updates.start_time = movedTo.start;
      updates.end_time = movedTo.end;
      updates.reminder_sent = false;
      changedWhat = true;
    }
  }
  // A new price changes what our fee is on any later payment for this booking
  if (typeof fields.amount_cents === 'number') {
    updates.platform_fee_cents = await computePlatformFee(fields.amount_cents, tenant.id);
  }
  const keys = Object.keys(updates);
  if (keys.length === 0) {
    const existing = await db`SELECT * FROM bookings WHERE id = ${id} AND tenant_id = ${tenant.id} LIMIT 1`;
    if (!existing[0]) return c.json({ error: 'Booking not found' }, 404);
    return c.json({ booking: existing[0] });
  }

  const before = await db`SELECT status, location FROM bookings WHERE id = ${id} AND tenant_id = ${tenant.id} LIMIT 1`;

  const rows = await db`
    UPDATE bookings
    SET ${db(updates as Record<string, unknown>, ...keys)}, updated_at = NOW()
    WHERE id = ${id} AND tenant_id = ${tenant.id}
    RETURNING *
  `;

  if (!rows[0]) return c.json({ error: 'Booking not found' }, 404);
  const booking = rows[0];
  if (updates.start_time) await db`DELETE FROM booking_reminders WHERE booking_id = ${id}`;
  if (fields.location !== undefined && (fields.location ?? null) !== ((before[0]?.location as string | null) ?? null)) changedWhat = true;

  // The owner changed a confirmed appointment (time, type or professional): tell the customer
  if (changedWhat && notify !== false && booking.status === 'confirmed' && booking.customer_email) {
    const svc = await db`SELECT name FROM services WHERE id = ${booking.service_id} LIMIT 1`;
    sendBookingConfirmation({
      toEmail: booking.customer_email as string,
      toName: booking.customer_name as string,
      serviceName: (svc[0]?.name as string) ?? 'your appointment',
      startTime: formatBookingTime(booking.start_time as string, tz),
      endTime: formatBookingTime(booking.end_time as string, tz),
      companyName: tenant.company_name,
      tenantId: tenant.id,
      bookingId: booking.id as string,
      manageUrl: await manageUrlFor(tenant, booking.id as string),
      cancelWindowHours: (tenant as unknown as { cancel_window_hours?: number }).cancel_window_hours ?? 24,
      location: booking.location as string | null,
    }).catch((err) => console.error('Changed booking email error:', err));
  }

  const statusChanged = updates.status && before[0]?.status !== updates.status;
  // Cancelling an attempt that was never paid doesn't email anyone (the customer never had a booking)
  const wasUnpaid = before[0]?.status === 'awaiting_payment';
  if (statusChanged && (updates.status === 'cancelled' || updates.status === 'confirmed') && !(wasUnpaid && updates.status === 'cancelled')) {
    const [svcRows, tenantUserRows] = await Promise.all([
      db`SELECT name FROM services WHERE id = ${booking.service_id} LIMIT 1`,
      db`SELECT u.email FROM users u JOIN tenants t ON t.clerk_user_id = u.clerk_user_id WHERE t.id = ${tenant.id} LIMIT 1`,
    ]);
    const serviceName = (svcRows[0]?.name as string) ?? 'your appointment';
    const fmt = (t: string) => formatBookingTime(t, (tenant as unknown as { timezone?: string }).timezone);
    const startTime = fmt(booking.start_time as string);
    const endTime = fmt(booking.end_time as string);
    const baseUrl = getBaseUrl();

    if (updates.status === 'confirmed') {
      sendBookingConfirmation({
        toEmail: booking.customer_email as string,
        toName: booking.customer_name as string,
        serviceName,
        startTime,
        endTime,
        companyName: tenant.company_name,
        manageUrl: await manageUrlFor(tenant, booking.id as string),
        cancelWindowHours: (tenant as unknown as { cancel_window_hours?: number }).cancel_window_hours ?? 24,
        tenantId: tenant.id,
        bookingId: booking.id as string,
      }).catch((err) => console.error('Booking confirmed email error:', err));
    }

    if (updates.status === 'cancelled') {
    sendBookingCancelled({
      toEmail: booking.customer_email as string,
      toName: booking.customer_name as string,
      serviceName,
      startTime,
      endTime,
      companyName: tenant.company_name,
    }).catch((err) => console.error('Booking cancelled customer email error:', err));
    if (tenantUserRows[0]?.email) {
      sendTenantBookingCancelled({
        tenantEmail: tenantUserRows[0].email as string,
        companyName: tenant.company_name,
        serviceName,
        customerName: booking.customer_name as string,
        customerEmail: booking.customer_email as string,
        startTime,
      }).catch((err) => console.error('Booking cancelled tenant email error:', err));
    }
    }
    void baseUrl; // used in confirmed branch above
  }

  queueCalendarSync(booking.id as string);
  return c.json({ booking });
});

// GET /api/bookings/:id/payment-info — remaining balance + card-on-file info
app.get('/:id/payment-info', async (c) => {
  const tenant = c.get('tenant') as { id: string; currency: string; stripe_account_id: string | null };
  const id = c.req.param('id');

  const rows = await db`
    SELECT b.*, c.card_brand, c.card_last4, c.stripe_customer_id, c.stripe_payment_method_id, c.stripe_account_id AS customer_stripe_account_id
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
    has_card: !!usableStripeIds({ stripe_customer_id: booking.stripe_customer_id as string | null, stripe_payment_method_id: booking.stripe_payment_method_id as string | null, stripe_account_id: booking.customer_stripe_account_id as string | null }, tenant.stripe_account_id ?? '').paymentMethodId,
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
    SELECT b.*, c.stripe_customer_id, c.stripe_account_id AS customer_stripe_account_id
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
    stripeCustomerId: usableStripeIds({ stripe_customer_id: booking.stripe_customer_id as string | null, stripe_account_id: booking.customer_stripe_account_id as string | null }, tenant.stripe_account_id).customerId,
  });

  return c.json({ client_secret: paymentIntent.client_secret, amount: remainingCents });
});

// POST /api/bookings/:id/charge-saved-card — off-session charge using card on file
app.post('/:id/charge-saved-card', async (c) => {
  const tenant = c.get('tenant') as { id: string; currency: string; stripe_account_id: string | null };
  const id = c.req.param('id');

  const rows = await db`
    SELECT b.*, c.stripe_customer_id, c.stripe_payment_method_id, c.stripe_account_id AS customer_stripe_account_id
    FROM bookings b
    LEFT JOIN customers c ON c.id = b.customer_id
    WHERE b.id = ${id} AND b.tenant_id = ${tenant.id} LIMIT 1
  `;
  const booking = rows[0];
  if (!booking) return c.json({ error: 'Booking not found' }, 404);
  if (!tenant.stripe_account_id) return c.json({ error: 'This business has not connected Stripe yet' }, 400);
  // A card saved before the switch to direct charges lives on the platform account and can't be charged for the store
  const saved = usableStripeIds({
    stripe_customer_id: booking.stripe_customer_id as string | null,
    stripe_payment_method_id: booking.stripe_payment_method_id as string | null,
    stripe_account_id: booking.customer_stripe_account_id as string | null,
  }, tenant.stripe_account_id);
  if (!saved.customerId || !saved.paymentMethodId) {
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
    stripeCustomerId: saved.customerId,
    paymentMethodId: saved.paymentMethodId,
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
    baseUrl: getCustomerBaseUrl(tenant),
  });

  return c.json({ sent: true });
});

const recordPaymentSchema = z.object({
  amount_cents: z.number().int().min(1),
  method: z.enum(['cash', 'check', 'zelle', 'venmo', 'cashapp', 'other']),
  note: z.string().max(300).nullable().optional(),
});

/** What's been paid and refunded on a booking, newest first */
async function paymentHistory(tenantId: string, bookingId: string) {
  return db`
    SELECT id, amount_cents, method, note, created_at FROM booking_payments
    WHERE tenant_id = ${tenantId} AND booking_id = ${bookingId} ORDER BY created_at DESC
  `;
}

// GET /api/bookings/:id/payments — payment history + reminder history for the edit window
app.get('/:id/payments', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const id = c.req.param('id');
  const rows = await db`SELECT amount_cents, deposit_paid_cents FROM bookings WHERE id = ${id} AND tenant_id = ${tenant.id} LIMIT 1`;
  if (!rows[0]) return c.json({ error: 'Booking not found' }, 404);
  const reminders = await db`SELECT hours_before, sent_at FROM booking_reminders WHERE booking_id = ${id} ORDER BY sent_at DESC`;
  // Money that went through Stripe and can still be refunded to the customer's card
  const card = await db`
    SELECT COALESCE(SUM(gross_amount_cents), 0)::int AS net FROM platform_transactions
    WHERE tenant_id = ${tenant.id} AND reference_type = 'booking' AND reference_id = ${id}
  `;
  return c.json({
    amount_cents: rows[0].amount_cents ?? 0,
    paid_cents: rows[0].deposit_paid_cents ?? 0,
    card_refundable_cents: Math.max(card[0]?.net as number ?? 0, 0),
    payments: await paymentHistory(tenant.id, id),
    reminders,
  });
});

// POST /api/bookings/:id/record-payment — the customer paid in person / another way
app.post('/:id/record-payment', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const id = c.req.param('id');
  const parsed = recordPaymentSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  const { amount_cents, method, note } = parsed.data;

  const rows = await db`
    UPDATE bookings
    SET deposit_paid_cents = COALESCE(deposit_paid_cents, 0) + ${amount_cents},
        status = CASE WHEN status IN ('awaiting_payment', 'pending') AND COALESCE(deposit_paid_cents, 0) + ${amount_cents} >= COALESCE(amount_cents, 0) THEN 'confirmed' ELSE status END,
        updated_at = NOW()
    WHERE id = ${id} AND tenant_id = ${tenant.id} RETURNING *
  `;
  if (!rows[0]) return c.json({ error: 'Booking not found' }, 404);
  await db`INSERT INTO booking_payments (tenant_id, booking_id, amount_cents, method, note) VALUES (${tenant.id}, ${id}, ${amount_cents}, ${method}, ${note ?? null})`;
  return c.json({ booking: rows[0] });
});

const refundBookingSchema = z.object({
  /** Leave out to refund everything that was paid */
  amount_cents: z.number().int().min(1).optional(),
  /** Also cancel the appointment */
  cancel: z.boolean().optional(),
  notify: z.boolean().optional(),
});

// POST /api/bookings/:id/refund — give money back: to the card for what was paid through Stripe, the rest is recorded as handed back by the owner
app.post('/:id/refund', async (c) => {
  const tenant = c.get('tenant') as { id: string; company_name: string; stripe_account_id: string | null };
  const id = c.req.param('id');
  const parsed = refundBookingSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);

  const rows = await db`
    SELECT b.*, s.name AS service_name FROM bookings b JOIN services s ON s.id = b.service_id
    WHERE b.id = ${id} AND b.tenant_id = ${tenant.id} LIMIT 1
  `;
  const booking = rows[0];
  if (!booking) return c.json({ error: 'Booking not found' }, 404);
  const paid = (booking.deposit_paid_cents as number | null) ?? 0;
  if (paid <= 0) return c.json({ error: 'Nothing has been paid on this booking.' }, 400);
  const amount = parsed.data.amount_cents ?? paid;
  if (amount > paid) return c.json({ error: `You can refund at most $${(paid / 100).toFixed(2)}.` }, 400);

  // Card payments first (newest first), each limited to what is left of it
  const charges = await db`
    SELECT t.id, t.gross_amount_cents, t.platform_fee_cents, t.stripe_transfer_id,
           t.gross_amount_cents + COALESCE((SELECT SUM(r.gross_amount_cents) FROM platform_transactions r WHERE r.refund_of = t.id), 0) AS left_cents
    FROM platform_transactions t
    WHERE t.tenant_id = ${tenant.id} AND t.reference_type = 'booking' AND t.reference_id = ${id}
      AND t.gross_amount_cents > 0 AND t.stripe_transfer_id LIKE 'pi\_%'
    ORDER BY t.created_at DESC
  `;
  let remaining = amount;
  let toCard = 0;
  for (const ch of charges) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, ch.left_cents as number);
    if (take <= 0) continue;
    let result;
    try {
      result = await refundStorePayment(ch.stripe_transfer_id as string, tenant.stripe_account_id ?? null, take);
    } catch (err) {
      return c.json({ error: `Stripe refund failed: ${String(err)}${toCard ? ` (the first $${(toCard / 100).toFixed(2)} was already refunded)` : ''}` }, 502);
    }
    const gross = ch.gross_amount_cents as number;
    const fee = Math.round(((ch.platform_fee_cents as number) * take) / gross);
    await db`
      INSERT INTO platform_transactions (tenant_id, reference_id, reference_type, gross_amount_cents, platform_fee_cents, stripe_fee_cents, net_to_tenant_cents, stripe_transfer_id, refund_of)
      VALUES (${tenant.id}, ${id}, 'booking', ${-take}, ${-fee}, 0, ${-(take - fee)}, ${result.refund.id}, ${ch.id})
    `;
    await db`INSERT INTO booking_payments (tenant_id, booking_id, amount_cents, method, note, stripe_ref) VALUES (${tenant.id}, ${id}, ${-take}, 'card refund', 'Refunded to the customer\'s card', ${result.refund.id})`;
    toCard += take;
    remaining -= take;
  }
  if (remaining > 0) {
    await db`INSERT INTO booking_payments (tenant_id, booking_id, amount_cents, method, note) VALUES (${tenant.id}, ${id}, ${-remaining}, 'refund', 'Returned by the business (not through Stripe)')`;
  }

  const updated = await db`
    UPDATE bookings SET deposit_paid_cents = GREATEST(COALESCE(deposit_paid_cents, 0) - ${amount}, 0),
      status = ${parsed.data.cancel ? 'cancelled' : (booking.status as string)}, updated_at = NOW()
    WHERE id = ${id} RETURNING *
  `;
  if (parsed.data.notify !== false && booking.customer_email) {
    sendBookingRefunded({
      toEmail: booking.customer_email as string,
      toName: booking.customer_name as string,
      serviceName: booking.service_name as string,
      amountCents: amount,
      companyName: tenant.company_name,
      tenantId: tenant.id,
      bookingId: id,
    }).catch((err) => console.error('Booking refund email error:', err));
  }
  return c.json({ booking: updated[0], refunded_to_card_cents: toCard, refunded_other_cents: remaining });
});

// POST /api/bookings/:id/resend-confirmation
app.post('/:id/resend-confirmation', async (c) => {
  const tenant = c.get('tenant') as { id: string; company_name: string; timezone?: string; cancel_window_hours?: number };
  const id = c.req.param('id');
  const rows = await db`
    SELECT b.*, s.name AS service_name FROM bookings b JOIN services s ON s.id = b.service_id
    WHERE b.id = ${id} AND b.tenant_id = ${tenant.id} LIMIT 1
  `;
  const b = rows[0];
  if (!b) return c.json({ error: 'Booking not found' }, 404);
  await sendBookingConfirmation({
    toEmail: b.customer_email as string,
    toName: b.customer_name as string,
    serviceName: b.service_name as string,
    startTime: formatBookingTime(b.start_time as string, tenant.timezone),
    endTime: formatBookingTime(b.end_time as string, tenant.timezone),
    companyName: tenant.company_name,
    tenantId: tenant.id,
    bookingId: id,
    manageUrl: await manageUrlFor(tenant, id),
    cancelWindowHours: tenant.cancel_window_hours ?? 24,
    location: b.location as string | null,
  });
  return c.json({ sent: true });
});

// POST /api/bookings/:id/send-reminder — send the reminder now
app.post('/:id/send-reminder', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const sent = await sendReminderForBooking(c.req.param('id'), { tenantId: tenant.id });
  if (!sent) return c.json({ error: 'Booking not found' }, 404);
  return c.json({ sent: true });
});

export default app;
