import type { Context, Next } from 'hono';
import { createClerkClient } from '@clerk/backend';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin(c: Context, next: Next) {
  const clerkUserId = c.get('clerkUserId') as string;
  const allowed = adminEmails();

  if (allowed.length === 0) {
    return c.json({ error: 'Admin access is not configured' }, 403);
  }

  try {
    const user = await clerkClient.users.getUser(clerkUserId);
    const emails = user.emailAddresses.map((e) => e.emailAddress.toLowerCase());
    if (!emails.some((e) => allowed.includes(e))) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    c.set('adminEmail', emails.find((e) => allowed.includes(e)));
    await next();
  } catch (err) {
    console.error('Admin check failed:', err);
    return c.json({ error: 'Forbidden' }, 403);
  }
}
