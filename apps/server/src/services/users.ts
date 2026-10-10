import { createClerkClient } from '@clerk/backend';
import { db } from '../db/client';
import { sendAdminNewUser } from './email';

export interface UserRecord {
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

let client: ReturnType<typeof createClerkClient> | undefined;

function adminEmailSet(): Set<string> {
  return new Set((process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean));
}

/**
 * Records a person in our users table and tells the admins about a genuinely NEW signup (once).
 * Not announced: platform admins themselves, and people whose email already belongs to an existing owner record
 * (an existing store owner signing in to a new sign-in system is not a new customer).
 * Called from the Clerk webhook and, as a safety net, from the first request of a person we have no record of.
 */
export async function registerUser(u: {
  clerk_user_id: string;
  email: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
}): Promise<'created' | 'existing'> {
  const inserted = await db`
    INSERT INTO users (clerk_user_id, email, first_name, last_name, avatar_url)
    VALUES (${u.clerk_user_id}, ${u.email}, ${u.first_name ?? null}, ${u.last_name ?? null}, ${u.avatar_url ?? null})
    ON CONFLICT (clerk_user_id) DO NOTHING
    RETURNING id
  `;
  if (!inserted[0]) return 'existing';

  const email = u.email?.toLowerCase() ?? null;
  if (!email || adminEmailSet().has(email)) return 'created';
  const known = await db`SELECT 1 FROM users WHERE lower(email) = ${email} AND clerk_user_id <> ${u.clerk_user_id} LIMIT 1`;
  if (known[0]) return 'created';

  sendAdminNewUser({ email, name: [u.first_name, u.last_name].filter(Boolean).join(' ') || null }).catch((err) =>
    console.error('Admin new-user email error:', err instanceof Error ? err.message : err),
  );
  return 'created';
}

/**
 * The person's name and email. Normally from our users table (kept in step by the Clerk webhook); if the webhook
 * hasn't delivered yet (or isn't set up on this Clerk application) ask Clerk directly, so welcome emails still go out.
 */
export async function getOrFetchUser(clerkUserId: string): Promise<UserRecord | null> {
  const rows = await db`SELECT email, first_name, last_name FROM users WHERE clerk_user_id = ${clerkUserId} LIMIT 1`;
  if (rows[0]?.email) return rows[0] as unknown as UserRecord;
  try {
    client ??= createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
    const u = await client.users.getUser(clerkUserId);
    const primary = u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId) ?? u.emailAddresses[0];
    if (!primary) return null;
    await db`
      INSERT INTO users (clerk_user_id, email, first_name, last_name, avatar_url)
      VALUES (${clerkUserId}, ${primary.emailAddress}, ${u.firstName}, ${u.lastName}, ${u.imageUrl})
      ON CONFLICT (clerk_user_id) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW()
    `;
    return { email: primary.emailAddress, first_name: u.firstName, last_name: u.lastName };
  } catch (err) {
    console.error('Could not look up user in Clerk:', err instanceof Error ? err.message : err);
    return null;
  }
}
