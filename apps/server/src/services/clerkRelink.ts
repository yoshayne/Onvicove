import { createClerkClient } from '@clerk/backend';
import { db } from '../db/client';
import { recordAdminAction } from './auditLog';
import { registerUser } from './users';

interface NewUser {
  id: string;
  emails: string[]; // verified email addresses, lowercase
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
}

/**
 * Re-attaches a store to its owner after the sign-in system (Clerk application) changed.
 * Stores are keyed by Clerk user id, which is different in every Clerk application, so a person signing in
 * to a NEW application has no store until we match them by their VERIFIED email to the old owner record.
 * Returns the tenant id that was relinked, or null.
 */
export async function relinkTenantByEmail(user: NewUser): Promise<string | null> {
  if (user.emails.length === 0) return null;

  const owned = await db`SELECT id FROM tenants WHERE clerk_user_id = ${user.id} LIMIT 1`;
  if (owned[0]) return null;

  // The store whose previous owner record has one of this person's verified emails (best candidate first,
  // matching how the dashboard picks a store when someone has several)
  const matches = await db`
    SELECT t.id, t.clerk_user_id AS old_id, t.company_name
    FROM tenants t
    JOIN users u ON u.clerk_user_id = t.clerk_user_id
    WHERE lower(u.email) = ANY(${user.emails}) AND t.clerk_user_id <> ${user.id}
    ORDER BY t.wizard_completed DESC, t.updated_at DESC
  `;
  const tenant = matches[0];
  if (!tenant) return null;
  const oldId = tenant.old_id as string;

  await db.begin(async (tx) => {
    await tx`
      UPDATE tenants SET previous_clerk_user_id = clerk_user_id, clerk_user_id = ${user.id}, updated_at = NOW()
      WHERE id = ${tenant.id}
    `;
    await tx`
      INSERT INTO users (clerk_user_id, email, first_name, last_name, avatar_url)
      VALUES (${user.id}, ${user.emails[0]}, ${user.first_name ?? null}, ${user.last_name ?? null}, ${user.avatar_url ?? null})
      ON CONFLICT (clerk_user_id) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW()
    `;
    // Staff sign-ins follow the same rule
    await tx`UPDATE staff SET clerk_user_id = ${user.id} WHERE clerk_user_id = ${oldId}`;
    // The old owner record is now unused
    await tx`DELETE FROM users u WHERE u.clerk_user_id = ${oldId} AND NOT EXISTS (SELECT 1 FROM tenants t WHERE t.clerk_user_id = u.clerk_user_id)`;
  });

  await recordAdminAction('system', 'relink_owner', 'tenant', tenant.id as string, {
    company_name: tenant.company_name,
    matched_email: user.emails[0],
    other_candidates: matches.length - 1,
  });
  console.log(`[clerk-relink] store "${tenant.company_name}" now belongs to ${user.id} (matched by email)`);
  return tenant.id as string;
}

let client: ReturnType<typeof createClerkClient> | undefined;
const handled = new Set<string>();
const lastLooked = new Map<string, number>(); // people with no store yet: look again at most once a minute

/** Called on authenticated requests. Cheap after the first look at a given user; never blocks or fails a request. */
export async function ensureTenantLinked(clerkUserId: string): Promise<void> {
  if (handled.has(clerkUserId)) return;
  if (Date.now() - (lastLooked.get(clerkUserId) ?? 0) < 60_000) return;
  lastLooked.set(clerkUserId, Date.now());
  try {
    const owned = await db`SELECT 1 FROM tenants WHERE clerk_user_id = ${clerkUserId} LIMIT 1`;
    if (owned[0]) {
      handled.add(clerkUserId);
      return;
    }
    client ??= createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
    const u = await client.users.getUser(clerkUserId);
    const emails = u.emailAddresses
      .filter((e) => e.verification?.status === 'verified')
      .map((e) => e.emailAddress.toLowerCase());
    const primary = u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId) ?? u.emailAddresses[0];
    await registerUser({ clerk_user_id: clerkUserId, email: primary?.emailAddress ?? null, first_name: u.firstName, last_name: u.lastName, avatar_url: u.imageUrl });
    await relinkTenantByEmail({ id: clerkUserId, emails, first_name: u.firstName, last_name: u.lastName, avatar_url: u.imageUrl });
    // A brand-new person with no store yet is looked at again next time (they may be about to create or claim one)
  } catch (err) {
    console.error('[clerk-relink] check failed:', err instanceof Error ? err.message : err);
  }
}
