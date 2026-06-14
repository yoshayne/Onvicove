import { Hono } from 'hono';
import { Webhook } from 'svix';
import { db } from '../db/client';

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

    await db`
      INSERT INTO users (clerk_user_id, email, first_name, last_name, avatar_url)
      VALUES (${data.id}, ${primaryEmail}, ${data.first_name ?? null}, ${data.last_name ?? null}, ${data.image_url ?? null})
      ON CONFLICT (clerk_user_id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW()
    `;
  } else if (type === 'user.deleted') {
    await db`DELETE FROM users WHERE clerk_user_id = ${data.id}`;
  }

  return c.json({ received: true });
});

export default app;
