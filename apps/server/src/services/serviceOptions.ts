import { db } from '../db/client';

export interface ServiceOptionInput {
  id?: string;
  name: string;
  price_cents: number;
  duration_minutes: number;
}

export interface ServiceOptionRow {
  id: string;
  service_id: string;
  name: string;
  price_cents: number;
  duration_minutes: number;
  sort_order: number;
}

/** Add `options` (in the owner's order) to each service row */
export async function attachOptions<T extends { id: string }>(rows: T[]): Promise<(T & { options: ServiceOptionRow[] })[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const opts = await db`SELECT id, service_id, name, price_cents, duration_minutes, sort_order FROM service_options WHERE service_id IN ${db(ids)} ORDER BY sort_order ASC, created_at ASC`;
  const by = new Map<string, ServiceOptionRow[]>();
  for (const o of opts as unknown as ServiceOptionRow[]) by.set(o.service_id, [...(by.get(o.service_id) ?? []), o]);
  return rows.map((r) => ({ ...r, options: by.get(r.id) ?? [] }));
}

/** Make a service's options exactly the given list: update the ones with an id, add new ones, remove the rest */
export async function saveOptions(tenantId: string, serviceId: string, options: ServiceOptionInput[]): Promise<void> {
  const existing = (await db`SELECT id FROM service_options WHERE service_id = ${serviceId} AND tenant_id = ${tenantId}`).map((r) => r.id as string);
  const keep = new Set(options.map((o) => o.id).filter((id): id is string => !!id && existing.includes(id)));
  for (const id of existing) if (!keep.has(id)) await db`DELETE FROM service_options WHERE id = ${id}`;
  let order = 0;
  for (const o of options) {
    if (o.id && keep.has(o.id)) {
      await db`UPDATE service_options SET name = ${o.name.trim()}, price_cents = ${o.price_cents}, duration_minutes = ${o.duration_minutes}, sort_order = ${order++} WHERE id = ${o.id}`;
    } else {
      await db`INSERT INTO service_options (tenant_id, service_id, name, price_cents, duration_minutes, sort_order) VALUES (${tenantId}, ${serviceId}, ${o.name.trim()}, ${o.price_cents}, ${o.duration_minutes}, ${order++})`;
    }
  }
}

/**
 * The service as it is actually booked. A service with options needs one chosen; its price, length and name
 * then come from that option. Without options the service is returned as it is.
 */
export async function resolveBookable<S extends { id: string; name: string; price_cents: number; duration_minutes: number }>(
  service: S,
  optionId: string | null | undefined,
): Promise<{ ok: true; service: S; option: ServiceOptionRow | null } | { ok: false; error: string }> {
  const opts = (await db`SELECT id, service_id, name, price_cents, duration_minutes, sort_order FROM service_options WHERE service_id = ${service.id} ORDER BY sort_order ASC`) as unknown as ServiceOptionRow[];
  if (opts.length === 0) return { ok: true, service, option: null };
  if (!optionId) return { ok: false, error: 'Please choose an option for this service.' };
  const option = opts.find((o) => o.id === optionId);
  if (!option) return { ok: false, error: 'That option is no longer available. Please choose again.' };
  return { ok: true, service: { ...service, price_cents: option.price_cents, duration_minutes: option.duration_minutes }, option };
}
