import { Hono } from 'hono';
import { Webhook } from 'svix';
import { db } from '../db/client';
import { registerUser } from '../services/users';

const app = new Hono();

// POST /api/webhooks/clerk — syncs Clerk user data into our users table
app.post('/clerk', async (c) => {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return c.json({ error: 'Missing CLERK_WEBHOOK_SECRET' }, 500);
  }

  const rawBody = await c.req.raw.text();
  const headers = {
    'svix-id': c.req.header('svix-id') ?? '',
    'svix-timestamp': c.req.header('svix-timestamp') ?? '',
    'svix-signature': c.req.header('svix-signature') ?? '',
  };

  let event: any;
  try {
    event = new Webhook(secret).verify(rawBody, headers);
  } catch (err) {
    return c.json({ error: `Webhook signature verification failed: ${String(err)}` }, 400);
  }

  const { type, data } = event;

  if (type === 'user.created' || type === 'user.updated') {
    const primaryEmail = data.email_addresses?.find(
      (e: any) => e.id === data.primary_email_address_id
    )?.email_address ?? data.email_addresses?.[0]?.email_address ?? null;

    const profile = {
      clerk_user_id: data.id as string,
      email: primaryEmail as string | null,
      first_name: (data.first_name ?? null) as string | null,
      last_name: (data.last_name ?? null) as string | null,
      avatar_url: (data.image_url ?? null) as string | null,
    };
    // A brand-new person is recorded (and the admins are told once); a later update just refreshes their details
    const result = await registerUser(profile);
    if (result === 'existing') {
      await db`
        UPDATE users SET email = ${profile.email}, first_name = ${profile.first_name}, last_name = ${profile.last_name},
          avatar_url = ${profile.avatar_url}, updated_at = NOW()
        WHERE clerk_user_id = ${profile.clerk_user_id}
      `;
    }
  } else if (type === 'user.deleted') {
    await db`DELETE FROM users WHERE clerk_user_id = ${data.id}`;
  }

  return c.json({ received: true });
});

export default app;
