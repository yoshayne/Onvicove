import type { Context, Next } from 'hono';
import { db } from '../db/client';
import { verifyImpersonationToken } from '../lib/impersonate-token';

export async function requireTenant(c: Context, next: Next) {
  // Admin impersonation: X-Impersonate-Token overrides normal Clerk tenant lookup
  const impToken = c.req.header('X-Impersonate-Token');
  if (impToken) {
    const payload = verifyImpersonationToken(impToken);
    if (!payload) return c.json({ error: 'Invalid or expired impersonation token' }, 401);

    const result = await db`SELECT * FROM tenants WHERE id = ${payload.tenant_id} LIMIT 1`;
    if (!result[0]) return c.json({ error: 'Impersonated tenant not found' }, 404);

    c.set('tenant', result[0]);
    c.set('impersonating', true);
    c.set('impersonatingAdminEmail', payload.admin_email);
    await next();
    return;
  }

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
