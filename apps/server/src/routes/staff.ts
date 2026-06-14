import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';
import { enrichWithUrls } from '../services/storage';

const app = new Hono();

const availabilityWindowSchema = z.object({
  start: z.string(),
  end: z.string(),
});

const availabilitySchema = z.object({
  mon: z.array(availabilityWindowSchema).optional(),
  tue: z.array(availabilityWindowSchema).optional(),
  wed: z.array(availabilityWindowSchema).optional(),
  thu: z.array(availabilityWindowSchema).optional(),
  fri: z.array(availabilityWindowSchema).optional(),
  sat: z.array(availabilityWindowSchema).optional(),
  sun: z.array(availabilityWindowSchema).optional(),
});

const staffSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  avatar_key: z.string().nullable().optional(),
  availability: availabilitySchema.optional(),
  is_active: z.boolean().optional(),
  service_ids: z.array(z.string().uuid()).optional(),
});

const updateStaffSchema = staffSchema.partial();

app.use('*', requireAuth, requireTenant);

async function getServiceIds(staffId: string): Promise<string[]> {
  const rows = await db`SELECT service_id FROM staff_services WHERE staff_id = ${staffId}`;
  return rows.map((r) => r.service_id as string);
}

async function setServiceIds(staffId: string, serviceIds: string[]): Promise<void> {
  await db`DELETE FROM staff_services WHERE staff_id = ${staffId}`;
  for (const serviceId of serviceIds) {
    await db`
      INSERT INTO staff_services (staff_id, service_id)
      VALUES (${staffId}, ${serviceId})
      ON CONFLICT DO NOTHING
    `;
  }
}

// GET /api/staff
app.get('/', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const rows = await db`
    SELECT * FROM staff WHERE tenant_id = ${tenant.id} ORDER BY created_at ASC
  `;
  const enriched = await Promise.all(
    rows.map(async (r) => ({
      ...(await enrichWithUrls(r)),
      service_ids: await getServiceIds(r.id as string),
    }))
  );
  return c.json({ staff: enriched });
});

// GET /api/staff/:id
app.get('/:id', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const id = c.req.param('id');
  const rows = await db`
    SELECT * FROM staff WHERE id = ${id} AND tenant_id = ${tenant.id} LIMIT 1
  `;
  if (!rows[0]) return c.json({ error: 'Staff member not found' }, 404);
  const enriched = await enrichWithUrls(rows[0]);
  const service_ids = await getServiceIds(id);
  return c.json({ staff: { ...enriched, service_ids } });
});

// POST /api/staff
app.post('/', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const body = await c.req.json().catch(() => ({}));
  const parsed = staffSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }
  const d = parsed.data;

  const insertValues: Record<string, unknown> = {
    tenant_id: tenant.id,
    name: d.name,
    email: d.email ?? null,
    phone: d.phone ?? null,
    bio: d.bio ?? null,
    avatar_key: d.avatar_key ?? null,
    is_active: d.is_active ?? true,
  };
  if (d.availability !== undefined) {
    insertValues.availability = JSON.stringify(d.availability);
  }

  const keys = Object.keys(insertValues);
  const rows = await db`
    INSERT INTO staff ${db(insertValues, ...keys)}
    RETURNING *
  `;

  const staffRow = rows[0];
  if (d.service_ids) {
    await setServiceIds(staffRow.id as string, d.service_ids);
  }

  const enriched = await enrichWithUrls(staffRow);
  return c.json({ staff: { ...enriched, service_ids: d.service_ids ?? [] } }, 201);
});

// PATCH /api/staff/:id
app.patch('/:id', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parsed = updateStaffSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }
  const d = parsed.data;

  const updates: Record<string, unknown> = {};
  if (d.name !== undefined) updates.name = d.name;
  if (d.email !== undefined) updates.email = d.email;
  if (d.phone !== undefined) updates.phone = d.phone;
  if (d.bio !== undefined) updates.bio = d.bio;
  if (d.avatar_key !== undefined) updates.avatar_key = d.avatar_key;
  if (d.is_active !== undefined) updates.is_active = d.is_active;
  if (d.availability !== undefined) updates.availability = JSON.stringify(d.availability);

  const keys = Object.keys(updates);
  let staffRow;
  if (keys.length > 0) {
    const rows = await db`
      UPDATE staff
      SET ${db(updates, ...keys)}
      WHERE id = ${id} AND tenant_id = ${tenant.id}
      RETURNING *
    `;
    if (!rows[0]) return c.json({ error: 'Staff member not found' }, 404);
    staffRow = rows[0];
  } else {
    const existing = await db`SELECT * FROM staff WHERE id = ${id} AND tenant_id = ${tenant.id} LIMIT 1`;
    if (!existing[0]) return c.json({ error: 'Staff member not found' }, 404);
    staffRow = existing[0];
  }

  if (d.service_ids !== undefined) {
    await setServiceIds(id, d.service_ids);
  }

  const enriched = await enrichWithUrls(staffRow);
  const service_ids = await getServiceIds(id);
  return c.json({ staff: { ...enriched, service_ids } });
});

// DELETE /api/staff/:id
app.delete('/:id', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const id = c.req.param('id');
  const rows = await db`
    DELETE FROM staff WHERE id = ${id} AND tenant_id = ${tenant.id} RETURNING id
  `;
  if (!rows[0]) return c.json({ error: 'Staff member not found' }, 404);
  return c.json({ success: true });
});

export default app;
