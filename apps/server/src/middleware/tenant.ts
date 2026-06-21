import type { Context, Next } from 'hono';
import { db } from '../db/client';

export async function requireTenant(c: Context, next: Next) {
  const clerkUserId = c.get('clerkUserId') as string;

  const result = await db`
    SELECT * FROM tenants
    WHERE clerk_user_id = ${clerkUserId}
    AND is_active = true
    ORDER BY wizard_completed DESC, updated_at DESC
    LIMIT 1
  `;

  if (!result[0]) {
    return c.json({ error: 'No tenant account found' }, 404);
  }

  c.set('tenant', result[0]);
  await next();
}
