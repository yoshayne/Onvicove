import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { rateLimitPublic } from '../middleware/ratelimit';
import { enrichWithUrls } from '../services/storage';
import { generateOrderNumber } from '../lib/orderNumber';
import { computeAvailableSlots, getDayUtcRange } from '../services/availability';
import { computePlatformFee } from '../services/stripe';

const app = new Hono();

app.use('*', rateLimitPublic);

// GET /api/public/:slug
app.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const rows = await db`
    SELECT * FROM tenants WHERE slug = ${slug} AND is_active = TRUE LIMIT 1
  `;
  if (!rows[0]) return c.json({ error: 'Store not found' }, 404);
  return c.json({ tenant: await enrichWithUrls(rows[0]) });
});

// GET /api/public/:slug/products
app.get('/:slug/products', async (c) => {
  const slug = c.req.param('slug');
  const tenants = await db`SELECT id FROM tenants WHERE slug = ${slug} AND is_active = TRUE LIMIT 1`;
  if (!tenants[0]) return c.json({ error: 'Store not found' }, 404);

  const products = await db`
    SELECT * FROM products WHERE tenant_id = ${tenants[0].id} AND is_active = TRUE ORDER BY sort_order ASC
  `;
  return c.json({ products: await Promise.all(products.map(enrichWithUrls)) });
});

// GET /api/public/:slug/products/:id
app.get('/:slug/products/:id', async (c) => {
  const slug = c.req.param('slug');
  const id = c.req.param('id');
  const tenants = await db`SELECT id FROM tenants WHERE slug = ${slug} AND is_active = TRUE LIMIT 1`;
  if (!tenants[0]) return c.json({ error: 'Store not found' }, 404);

  const rows = await db`
    SELECT * FROM products WHERE id = ${id} AND tenant_id = ${tenants[0].id} AND is_active = TRUE LIMIT 1
  `;
  if (!rows[0]) return c.json({ error: 'Product not found' }, 404);
  return c.json({ product: await enrichWithUrls(rows[0]) });
});

// GET /api/public/:slug/services
app.get('/:slug/services', async (c) => {
  const slug = c.req.param('slug');
  const tenants = await db`SELECT id FROM tenants WHERE slug = ${slug} AND is_active = TRUE LIMIT 1`;
  if (!tenants[0]) return c.json({ error: 'Store not found' }, 404);

  const services = await db`
    SELECT * FROM services WHERE tenant_id = ${tenants[0].id} AND is_active = TRUE ORDER BY sort_order ASC
  `;
  return c.json({ services: await Promise.all(services.map(enrichWithUrls)) });
});

// GET /api/public/:slug/services/:id
app.get('/:slug/services/:id', async (c) => {
  const slug = c.req.param('slug');
  const id = c.req.param('id');
  const tenants = await db`SELECT id FROM tenants WHERE slug = ${slug} AND is_active = TRUE LIMIT 1`;
  if (!tenants[0]) return c.json({ error: 'Store not found' }, 404);

  const rows = await db`
    SELECT * FROM services WHERE id = ${id} AND tenant_id = ${tenants[0].id} AND is_active = TRUE LIMIT 1
  `;
  if (!rows[0]) return c.json({ error: 'Service not found' }, 404);
  return c.json({ service: await enrichWithUrls(rows[0]) });
});

// GET /api/public/:slug/availability?service_id=&date=YYYY-MM-DD&staff_id=
app.get('/:slug/availability', async (c) => {
  const slug = c.req.param('slug');
  const serviceId = c.req.query('service_id');
  const date = c.req.query('date');
  const staffId = c.req.query('staff_id');

  if (!serviceId || !date) {
    return c.json({ error: 'service_id and date query parameters are required' }, 400);
  }

  const tenants = await db`SELECT * FROM tenants WHERE slug = ${slug} AND is_active = TRUE LIMIT 1`;
  const tenant = tenants[0];
  if (!tenant) return c.json({ error: 'Store not found' }, 404);

  const services = await db`
    SELECT * FROM services WHERE id = ${serviceId} AND tenant_id = ${tenant.id} LIMIT 1
  `;
  const service = services[0];
  if (!service) return c.json({ error: 'Service not found' }, 404);

  let staffList;
  if (staffId) {
    staffList = await db`SELECT * FROM staff WHERE id = ${staffId} AND tenant_id = ${tenant.id} AND is_active = TRUE`;
  } else {
    staffList = await db`SELECT * FROM staff WHERE tenant_id = ${tenant.id} AND is_active = TRUE LIMIT 1`;
  }

  if (staffList.length === 0) {
    return c.json({ slots: [] });
  }

  const staff = staffList[0];
  const { start, end } = getDayUtcRange(date, tenant.timezone as string);

  const existingBookings = await db`
    SELECT start_time, end_time FROM bookings
    WHERE staff_id = ${staff.id}
    AND status NOT IN ('cancelled', 'no_show')
    AND start_time >= ${start.toISOString()}
    AND start_time <= ${end.toISOString()}
  `;

  const slots = computeAvailableSlots({
    date,
    timezone: tenant.timezone as string,
    availability: staff.availability as any,
    durationMinutes: service.duration_minutes as number,
    bufferMinutes: service.buffer_minutes as number,
    existingBookings: existingBookings.map((b) => ({ start_time: b.start_time, end_time: b.end_time })),
  });

  return c.json({ slots, staff_id: staff.id });
});

const orderItemSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().nullable().optional(),
  quantity: z.number().int().min(1),
});

const createOrderSchema = z.object({
  customer_name: z.string().min(1),
  customer_email: z.string().email(),
  customer_phone: z.string().nullable().optional(),
  items: z.array(orderItemSchema).min(1),
  shipping_address: z.record(z.unknown()).nullable().optional(),
  billing_address: z.record(z.unknown()).nullable().optional(),
  discount_code: z.string().nullable().optional(),
  shipping_cents: z.number().int().min(0).optional(),
  notes: z.string().nullable().optional(),
});

// POST /api/public/:slug/orders
app.post('/:slug/orders', async (c) => {
  const slug = c.req.param('slug');
  const body = await c.req.json().catch(() => ({}));
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }
  const d = parsed.data;

  const tenants = await db`SELECT * FROM tenants WHERE slug = ${slug} AND is_active = TRUE LIMIT 1`;
  const tenant = tenants[0];
  if (!tenant) return c.json({ error: 'Store not found' }, 404);

  let subtotal = 0;
  const itemRows: { product_id: string; variant_id: string | null; name: string; quantity: number; price_cents: number; total_cents: number }[] = [];

  for (const item of d.items) {
    const products = await db`SELECT * FROM products WHERE id = ${item.product_id} AND tenant_id = ${tenant.id} LIMIT 1`;
    const product = products[0];
    if (!product) return c.json({ error: `Product ${item.product_id} not found` }, 404);

    let priceCents = product.price_cents as number;
    if (item.variant_id) {
      const variants = await db`SELECT * FROM product_variants WHERE id = ${item.variant_id} AND product_id = ${item.product_id} LIMIT 1`;
      if (variants[0]?.price_cents != null) priceCents = variants[0].price_cents as number;
    }

    const totalCents = priceCents * item.quantity;
    subtotal += totalCents;
    itemRows.push({
      product_id: item.product_id,
      variant_id: item.variant_id ?? null,
      name: product.name as string,
      quantity: item.quantity,
      price_cents: priceCents,
      total_cents: totalCents,
    });
  }

  let discountCents = 0;
  if (d.discount_code) {
    const codes = await db`
      SELECT * FROM discount_codes
      WHERE tenant_id = ${tenant.id} AND code = ${d.discount_code} AND is_active = TRUE LIMIT 1
    `;
    const code = codes[0];
    if (code && (!code.expires_at || new Date(code.expires_at as string) > new Date())
      && (!code.usage_limit || (code.usage_count as number) < (code.usage_limit as number))
      && subtotal >= (code.minimum_order_cents as number)) {
      discountCents = code.type === 'percentage'
        ? Math.round(subtotal * (code.value as number) / 100)
        : (code.value as number);
      await db`UPDATE discount_codes SET usage_count = usage_count + 1 WHERE id = ${code.id}`;
    }
  }

  const shippingCents = d.shipping_cents ?? 0;
  const totalCents = Math.max(subtotal + shippingCents - discountCents, 0);
  const platformFee = computePlatformFee(totalCents);
  const orderNumber = await generateOrderNumber(tenant.id as string);

  // Upsert customer
  const customers = await db`
    INSERT INTO customers (tenant_id, email, first_name, last_name, phone)
    VALUES (${tenant.id}, ${d.customer_email}, ${d.customer_name.split(' ')[0]}, ${d.customer_name.split(' ').slice(1).join(' ') || null}, ${d.customer_phone ?? null})
    ON CONFLICT (tenant_id, email) DO UPDATE SET phone = COALESCE(${d.customer_phone ?? null}, customers.phone)
    RETURNING *
  `;
  const customer = customers[0];

  const orderRows = await db`
    INSERT INTO orders (
      tenant_id, customer_id, order_number, customer_name, customer_email, customer_phone,
      subtotal_cents, shipping_cents, discount_cents, total_cents, platform_fee_cents,
      shipping_address, billing_address, notes
    ) VALUES (
      ${tenant.id}, ${customer.id}, ${orderNumber}, ${d.customer_name}, ${d.customer_email}, ${d.customer_phone ?? null},
      ${subtotal}, ${shippingCents}, ${discountCents}, ${totalCents}, ${platformFee},
      ${d.shipping_address ? db.json(JSON.parse(JSON.stringify(d.shipping_address))) : null}, ${d.billing_address ? db.json(JSON.parse(JSON.stringify(d.billing_address))) : null}, ${d.notes ?? null}
    )
    RETURNING *
  `;
  const order = orderRows[0];

  for (const item of itemRows) {
    await db`
      INSERT INTO order_items (order_id, product_id, variant_id, tenant_id, name, quantity, price_cents, total_cents)
      VALUES (${order.id}, ${item.product_id}, ${item.variant_id}, ${tenant.id}, ${item.name}, ${item.quantity}, ${item.price_cents}, ${item.total_cents})
    `;
  }

  await db`
    UPDATE customers SET order_count = order_count + 1, total_spent_cents = total_spent_cents + ${totalCents}, updated_at = NOW()
    WHERE id = ${customer.id}
  `;

  return c.json({ order }, 201);
});

const createBookingSchema = z.object({
  service_id: z.string().uuid(),
  staff_id: z.string().uuid().nullable().optional(),
  customer_name: z.string().min(1),
  customer_email: z.string().email(),
  customer_phone: z.string().nullable().optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  notes: z.string().nullable().optional(),
});

// POST /api/public/:slug/bookings
app.post('/:slug/bookings', async (c) => {
  const slug = c.req.param('slug');
  const body = await c.req.json().catch(() => ({}));
  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }
  const d = parsed.data;

  const tenants = await db`SELECT * FROM tenants WHERE slug = ${slug} AND is_active = TRUE LIMIT 1`;
  const tenant = tenants[0];
  if (!tenant) return c.json({ error: 'Store not found' }, 404);

  const services = await db`SELECT * FROM services WHERE id = ${d.service_id} AND tenant_id = ${tenant.id} LIMIT 1`;
  const service = services[0];
  if (!service) return c.json({ error: 'Service not found' }, 404);

  if (new Date(d.start_time) >= new Date(d.end_time)) {
    return c.json({ error: 'start_time must be before end_time' }, 400);
  }

  if (d.staff_id) {
    const conflicts = await db`
      SELECT id FROM bookings
      WHERE staff_id = ${d.staff_id}
      AND status NOT IN ('cancelled', 'no_show')
      AND start_time < ${d.end_time}
      AND end_time > ${d.start_time}
      LIMIT 1
    `;
    if (conflicts[0]) {
      return c.json({ error: 'This time slot is no longer available' }, 409);
    }
  }

  const customers = await db`
    INSERT INTO customers (tenant_id, email, first_name, last_name, phone)
    VALUES (${tenant.id}, ${d.customer_email}, ${d.customer_name.split(' ')[0]}, ${d.customer_name.split(' ').slice(1).join(' ') || null}, ${d.customer_phone ?? null})
    ON CONFLICT (tenant_id, email) DO UPDATE SET phone = COALESCE(${d.customer_phone ?? null}, customers.phone)
    RETURNING *
  `;
  const customer = customers[0];

  const status = tenant.booking_mode === 'manual' ? 'pending' : 'confirmed';
  const amountCents = service.price_cents as number;
  const platformFee = computePlatformFee(amountCents);

  const rows = await db`
    INSERT INTO bookings (
      tenant_id, service_id, staff_id, customer_id, customer_name, customer_email,
      customer_phone, start_time, end_time, notes, status, amount_cents, platform_fee_cents
    ) VALUES (
      ${tenant.id}, ${d.service_id}, ${d.staff_id ?? null}, ${customer.id},
      ${d.customer_name}, ${d.customer_email}, ${d.customer_phone ?? null},
      ${d.start_time}, ${d.end_time}, ${d.notes ?? null}, ${status}, ${amountCents}, ${platformFee}
    )
    RETURNING *
  `;

  await db`
    UPDATE customers SET booking_count = booking_count + 1, updated_at = NOW() WHERE id = ${customer.id}
  `;

  return c.json({ booking: rows[0] }, 201);
});

const validateDiscountSchema = z.object({
  code: z.string().min(1),
  subtotal_cents: z.number().int().min(0),
});

// POST /api/public/:slug/discounts/validate
app.post('/:slug/discounts/validate', async (c) => {
  const slug = c.req.param('slug');
  const body = await c.req.json().catch(() => ({}));
  const parsed = validateDiscountSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }
  const { code, subtotal_cents } = parsed.data;

  const tenants = await db`SELECT id FROM tenants WHERE slug = ${slug} AND is_active = TRUE LIMIT 1`;
  if (!tenants[0]) return c.json({ error: 'Store not found' }, 404);

  const codes = await db`
    SELECT * FROM discount_codes WHERE tenant_id = ${tenants[0].id} AND code = ${code} AND is_active = TRUE LIMIT 1
  `;
  const discount = codes[0];

  if (!discount) return c.json({ valid: false, reason: 'Code not found' });
  if (discount.expires_at && new Date(discount.expires_at as string) < new Date()) {
    return c.json({ valid: false, reason: 'Code expired' });
  }
  if (discount.usage_limit && (discount.usage_count as number) >= (discount.usage_limit as number)) {
    return c.json({ valid: false, reason: 'Code usage limit reached' });
  }
  if (subtotal_cents < (discount.minimum_order_cents as number)) {
    return c.json({ valid: false, reason: `Minimum order of $${((discount.minimum_order_cents as number) / 100).toFixed(2)} required` });
  }

  const discountCents = discount.type === 'percentage'
    ? Math.round(subtotal_cents * (discount.value as number) / 100)
    : (discount.value as number);

  return c.json({ valid: true, discount_cents: discountCents, type: discount.type, value: discount.value });
});

export default app;
