import type { Context, Next } from 'hono';
import { redis } from '../db/client';

export async function rateLimitPublic(c: Context, next: Next) {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0].trim()
    || c.req.header('x-real-ip')
    || 'unknown';

  const key = `ratelimit:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 60);
  }

  if (count > 100) {
    return c.json({ error: 'Too many requests' }, 429);
  }

  await next();
}
