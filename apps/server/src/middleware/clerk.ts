import { verifyToken } from '@clerk/backend';
import type { Context, Next } from 'hono';

export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '').trim();

  if (!token) {
    return c.json({ error: 'Unauthorized — no token' }, 401);
  }

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    c.set('clerkUserId', payload.sub);
    await next();
  } catch {
    return c.json({ error: 'Unauthorized — invalid token' }, 401);
  }
}
