import type { Context } from 'hono';

/** Global error handler. Stripe errors carry a customer-safe message, so show it instead of a bare "Internal server error". */
export function handleError(err: unknown, c: Context) {
  console.error('Unhandled error:', err);
  const e = err as { type?: string; message?: string };
  if (typeof e?.type === 'string' && e.type.startsWith('Stripe') && e.message) {
    return c.json({ error: `We couldn't process the payment: ${e.message}` }, 502);
  }
  return c.json({ error: 'Internal server error' }, 500);
}
