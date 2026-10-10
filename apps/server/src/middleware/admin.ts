import type { Context, Next } from 'hono';
import { createClerkClient } from '@clerk/backend';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

// Remember who passed the admin check for a few minutes: the admin screens fire several requests at once and each
// one used to ask Clerk again.
const adminCache = new Map<string, { email: string; expires: number }>();
const ADMIN_CACHE_MS = 5 * 60 * 1000;

export async function requireAdmin(c: Context, next: Next) {
  const clerkUserId = c.get('clerkUserId') as string;
  const allowed = adminEmails();

  if (allowed.length === 0) {
    return c.json({ error: 'Admin access is not configured' }, 403);
  }

  const cached = adminCache.get(clerkUserId);
  if (cached && cached.expires > Date.now() && allowed.includes(cached.email)) {
    c.set('adminEmail', cached.email);
    await next();
    return;
  }

  try {
    const user = await clerkClient.users.getUser(clerkUserId);
    const emails = user.emailAddresses.map((e) => e.emailAddress.toLowerCase());
    if (!emails.some((e) => allowed.includes(e))) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const adminEmail = emails.find((e) => allowed.includes(e))!;
    adminCache.set(clerkUserId, { email: adminEmail, expires: Date.now() + ADMIN_CACHE_MS });
    c.set('adminEmail', adminEmail);
    await next();
  } catch (err) {
    console.error('Admin check failed:', err);
    return c.json({ error: 'Forbidden' }, 403);
  }
}

/**
 * Same rule as requireAdmin (email on ADMIN_EMAILS), plus ADMIN_CLERK_IDS for anyone listed by Clerk id.
 * Returns the admin's email (for the audit log), or null when this user isn't an admin.
 */
export async function getAdminEmail(clerkUserId: string): Promise<string | null> {
  const ids = (process.env.ADMIN_CLERK_IDS ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  const allowed = adminEmails();
  if (!ids.includes(clerkUserId) && allowed.length === 0) return null;
  try {
    const user = await clerkClient.users.getUser(clerkUserId);
    const emails = user.emailAddresses.map((e) => e.emailAddress.toLowerCase());
    const match = emails.find((e) => allowed.includes(e));
    if (match) return match;
    return ids.includes(clerkUserId) ? emails[0] ?? clerkUserId : null;
  } catch (err) {
    console.error('Admin check failed:', err);
    return ids.includes(clerkUserId) ? clerkUserId : null;
  }
}

export async function isAdminUser(clerkUserId: string): Promise<boolean> {
  return (await getAdminEmail(clerkUserId)) !== null;
}
