/**
 * One-off: fill in the sign-up email of store owners whose record is missing from our `users` table
 * (they signed up before the Clerk webhook was recording users). Email matching after a Clerk switch needs it.
 *
 * Run BEFORE you retire the old Clerk application, with the OLD application's secret key:
 *   OLD_CLERK_SECRET_KEY=sk_... npm run backfill-owner-emails --workspace=@shopsuitedirect/server
 * Safe to re-run: it only adds missing rows, never changes existing ones.
 */
import 'dotenv/config';
import { createClerkClient } from '@clerk/backend';
import { db } from '../db/client';

async function main() {
  const key = process.env.OLD_CLERK_SECRET_KEY;
  if (!key) throw new Error('Set OLD_CLERK_SECRET_KEY to the secret key of the OLD Clerk application');
  const clerk = createClerkClient({ secretKey: key });

  const missing = await db`
    SELECT t.id, t.company_name, t.clerk_user_id
    FROM tenants t
    WHERE t.clerk_user_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM users u WHERE u.clerk_user_id = t.clerk_user_id)
  `;
  console.log(`${missing.length} store(s) have no owner record`);

  let fixed = 0;
  for (const t of missing) {
    try {
      const u = await clerk.users.getUser(t.clerk_user_id as string);
      const primary = u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId) ?? u.emailAddresses[0];
      if (!primary) {
        console.log(`- ${t.company_name}: Clerk user has no email`);
        continue;
      }
      await db`
        INSERT INTO users (clerk_user_id, email, first_name, last_name, avatar_url)
        VALUES (${u.id}, ${primary.emailAddress}, ${u.firstName}, ${u.lastName}, ${u.imageUrl})
        ON CONFLICT (clerk_user_id) DO NOTHING
      `;
      console.log(`✓ ${t.company_name}: ${primary.emailAddress}`);
      fixed++;
    } catch (err) {
      console.log(`✗ ${t.company_name}: ${err instanceof Error ? err.message : err} (set it by hand in Admin → Tenants)`);
    }
  }
  console.log(`Done: ${fixed}/${missing.length} filled in`);
  await db.end();
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
