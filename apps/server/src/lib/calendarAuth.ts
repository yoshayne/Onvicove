import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

// ── Refresh tokens are stored encrypted when CALENDAR_TOKEN_KEY is set (recommended) ──
function tokenKey(): Buffer | null {
  const k = process.env.CALENDAR_TOKEN_KEY;
  return k ? createHash('sha256').update(k).digest() : null;
}

export function sealToken(token: string): string {
  const key = tokenKey();
  if (!key) return `plain:${token}`;
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([c.update(token, 'utf8'), c.final()]);
  return `enc:${Buffer.concat([iv, body, c.getAuthTag()]).toString('base64')}`;
}

/** Returns null if the token can't be opened (for example the key changed): the store then reconnects */
export function openToken(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (stored.startsWith('plain:')) return stored.slice(6);
  if (!stored.startsWith('enc:')) return stored; // tokens saved before encryption existed
  const key = tokenKey();
  if (!key) return null;
  try {
    const buf = Buffer.from(stored.slice(4), 'base64');
    const d = createDecipheriv('aes-256-gcm', key, buf.subarray(0, 12));
    d.setAuthTag(buf.subarray(buf.length - 16));
    return Buffer.concat([d.update(buf.subarray(12, buf.length - 16)), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}

// ── The "state" sent to Google/Microsoft and back: signed, tied to one store, short-lived ──
function stateSecret(): string {
  return process.env.CALENDAR_STATE_SECRET || process.env.IMPERSONATE_SECRET || `${process.env.CLERK_SECRET_KEY}_calstate`;
}

export function signState(tenantId: string, provider: 'google' | 'outlook'): string {
  const payload = Buffer.from(JSON.stringify({ t: tenantId, p: provider, e: Date.now() + 10 * 60_000 })).toString('base64url');
  const sig = createHmac('sha256', stateSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyState(state: string | undefined, provider: 'google' | 'outlook'): string | null {
  if (!state) return null;
  const [payload, sig] = state.split('.');
  if (!payload || !sig) return null;
  const expected = createHmac('sha256', stateSecret()).update(payload).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const d = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { t: string; p: string; e: number };
    return d.p === provider && d.e > Date.now() ? d.t : null;
  } catch {
    return null;
  }
}
