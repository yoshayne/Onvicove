import { createHmac, timingSafeEqual } from 'crypto';

function secret(): string {
  return process.env.IMPERSONATE_SECRET || process.env.CLERK_SECRET_KEY + '_impersonate';
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

export interface ImpersonatePayload {
  tenant_id: string;
  admin_email: string;
  exp: number;
}

export function generateImpersonationToken(tenantId: string, adminEmail: string): string {
  const header = b64url(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload: ImpersonatePayload = {
    tenant_id: tenantId,
    admin_email: adminEmail,
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
  };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = b64url(createHmac('sha256', secret()).update(`${header}.${body}`).digest());
  return `${header}.${body}.${sig}`;
}

export function verifyImpersonationToken(token: string): ImpersonatePayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expectedSig = b64url(createHmac('sha256', secret()).update(`${header}.${body}`).digest());
    const sigBuf = Buffer.from(sig, 'base64url');
    const expBuf = Buffer.from(expectedSig, 'base64url');
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
    const payload: ImpersonatePayload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
