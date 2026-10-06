import { redis } from '../db/client';

/** Fixed-window limiter backed by Redis. Fails open if Redis is unavailable. */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  try {
    const redisKey = `rl:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) await redis.expire(redisKey, windowSeconds);
    return count <= max;
  } catch {
    return true;
  }
}
