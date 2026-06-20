import { Hono } from 'hono';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';
import { uploadFile, enrichWithUrls } from '../services/storage';
import { removeBackground, generateStyledPhoto, studioWhiteComposite, AI_PHOTO_STYLES } from '../services/gemini';
import { applyWatermark } from '../services/watermark';
import { stripe } from '../services/stripe';
import { getPlatformSettings } from '../services/settings';

const app = new Hono();

app.use('*', requireAuth, requireTenant);

// GET /api/ai-photos/styles
app.get('/styles', async (c) => {
  return c.json({
    styles: AI_PHOTO_STYLES.map((s) => ({
      id: s.id,
      name: s.label,
      thumbnailUrl: `/styles/${s.id}.jpg`,
    })),
  });
});

// GET /api/ai-photos/sessions — list all sessions with their unlocked/selected generation
app.get('/sessions', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const sessions = await db`
    SELECT
      s.id, s.product_id, s.status, s.is_free, s.amount_cents, s.created_at,
      p.name AS product_name,
      g.id AS generation_id, g.style, g.full_image_key, g.preview_image_key
    FROM ai_photo_sessions s
    LEFT JOIN products p ON p.id = s.product_id
    LEFT JOIN ai_photo_generations g ON g.session_id = s.id AND g.is_selected = TRUE
    WHERE s.tenant_id = ${tenant.id}
    ORDER BY s.created_at DESC
  `;

  const { getSignedFileUrl } = await import('../services/storage');
  const rows = await Promise.all(
    sessions.map(async (row) => {
      const imageKey = row.status === 'unlocked' ? row.full_image_key : row.preview_image_key;
      let imageUrl: string | null = null;
      if (imageKey) {
        try { imageUrl = await getSignedFileUrl(imageKey as string); } catch {}
      }
      return {
        id: row.id,
        productId: row.product_id,
        productName: row.product_name ?? null,
        status: row.status,
        isFree: row.is_free,
        style: row.style ?? null,
        generationId: row.generation_id ?? null,
        imageUrl,
        createdAt: row.created_at,
      };
    })
  );

  return c.json({ sessions: rows });
});

// GET /api/ai-photos/media — all unique images available in the tenant's media library
// Sources: (1) all product image_keys (2) all AI photo full_image_keys for unlocked sessions
app.get('/media', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const { getSignedFileUrl } = await import('../services/storage');

  // Product images — unnest the JSONB array (handle null/empty gracefully)
  const productImages = await db`
    SELECT DISTINCT elem AS key, p.name AS product_name
    FROM products p,
         jsonb_array_elements_text(COALESCE(p.image_keys, '[]'::jsonb)) AS elem
    WHERE p.tenant_id = ${tenant.id}
  `;

  // All AI photo full images from unlocked sessions (not just is_selected — show everything paid for)
  const aiImages = await db`
    SELECT DISTINCT ON (g.full_image_key)
           g.full_image_key AS key,
           g.style,
           g.is_selected,
           p.name AS product_name
    FROM ai_photo_generations g
    JOIN ai_photo_sessions s ON s.id = g.session_id
    LEFT JOIN products p ON p.id = s.product_id
    WHERE s.tenant_id = ${tenant.id}
      AND s.status = 'unlocked'
      AND g.full_image_key IS NOT NULL
      AND g.status = 'done'
    ORDER BY g.full_image_key, s.created_at DESC
  `;

  const allKeys = [
    ...productImages.map((r) => ({ key: r.key as string, source: 'product' as const, label: (r.product_name as string) ?? 'Product' })),
    ...aiImages.map((r) => ({ key: r.key as string, source: 'ai' as const, label: `${(r.product_name as string) ?? 'AI'} — ${r.style}` })),
  ];

  // Deduplicate (AI photo key may already be in a product's image_keys after unlock)
  const seen = new Set<string>();
  const unique = allKeys.filter((item) => {
    if (seen.has(item.key)) return false;
    seen.add(item.key);
    return true;
  });

  const items = await Promise.all(
    unique.map(async (item) => {
      let url: string | null = null;
      try { url = await getSignedFileUrl(item.key); } catch {}
      return { ...item, url };
    })
  );

  return c.json({ items: items.filter((i) => i.url) });
});

// POST /api/ai-photos/sessions — multipart "image", optional product_id
app.post('/sessions', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const body = await c.req.parseBody();
  const file = body['image'];
  const productId = typeof body['product_id'] === 'string' ? body['product_id'] : null;

  if (!(file instanceof File)) {
    return c.json({ error: 'No image file provided' }, 400);
  }

  const arrayBuffer = await file.arrayBuffer();
  const originalBuffer = Buffer.from(arrayBuffer);

  const originalKey = `tenants/${tenant.id}/ai-photos/${uuidv4()}-original.png`;
  await uploadFile(originalKey, originalBuffer, 'image/png');

  let cutoutBuffer: Buffer;
  try {
    cutoutBuffer = await removeBackground(originalBuffer);
  } catch (err) {
    console.error('AI photo background removal failed:', err);
    return c.json({ error: 'AI Photo Studio is temporarily unavailable. Please try again later.' }, 503);
  }
  const cutoutKey = `tenants/${tenant.id}/ai-photos/${uuidv4()}-cutout.png`;
  await uploadFile(cutoutKey, cutoutBuffer, 'image/png');

  const rows = await db`
    INSERT INTO ai_photo_sessions (tenant_id, product_id, original_image_key, cutout_image_key)
    VALUES (${tenant.id}, ${productId}, ${originalKey}, ${cutoutKey})
    RETURNING *
  `;

  const session = await enrichWithUrls(rows[0]);

  const freeUsed = await db`
    SELECT id FROM ai_photo_sessions WHERE tenant_id = ${tenant.id} AND is_free = TRUE LIMIT 1
  `;

  return c.json({
    sessionId: session.id,
    cutoutImageUrl: session.cutout_image_url,
    isFree: freeUsed.length === 0,
  }, 201);
});

const generateSchema = z.object({
  sessionId: z.string().uuid(),
  style: z.string().min(1),
  productDescription: z.string().min(1).max(300),
  productCategory: z.string().max(100).optional(),
  feedback: z.string().nullable().optional(),
});

// POST /api/ai-photos/generate — generate a watermarked preview for a style
app.post('/generate', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const body = await c.req.json().catch(() => ({}));
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }
  const { sessionId, style, productDescription, productCategory, feedback } = parsed.data;

  const sessions = await db`
    SELECT * FROM ai_photo_sessions WHERE id = ${sessionId} AND tenant_id = ${tenant.id} LIMIT 1
  `;
  const session = sessions[0];
  if (!session) return c.json({ error: 'Session not found' }, 404);

  const styleDef = AI_PHOTO_STYLES.find((s) => s.id === style);
  if (!styleDef) return c.json({ error: 'Unknown style' }, 400);

  const stylePrompt = feedback ? `${styleDef.prompt}, ${feedback}` : styleDef.prompt;
  const prompt = `${productDescription} | ${productCategory ?? ''} | ${stylePrompt}`;

  const genRows = await db`
    INSERT INTO ai_photo_generations (session_id, style, feedback, prompt_used, status)
    VALUES (${sessionId}, ${style}, ${feedback ?? null}, ${prompt}, 'processing')
    RETURNING *
  `;
  const generation = genRows[0];

  try {
    // Download cutout image to feed into Gemini
    const { getSignedFileUrl } = await import('../services/storage');
    const cutoutUrl = await getSignedFileUrl(session.cutout_image_key as string);
    const fetchRes = await fetch(cutoutUrl);
    const cutoutBuffer = Buffer.from(await fetchRes.arrayBuffer());

    const fullBuffer = styleDef.bypass === 'studio-white'
      ? await studioWhiteComposite(cutoutBuffer)
      : await generateStyledPhoto(cutoutBuffer, stylePrompt, productDescription, productCategory);
    const previewBuffer = await applyWatermark(fullBuffer);

    const fullKey = `tenants/${tenant.id}/ai-photos/${uuidv4()}-full.png`;
    const previewKey = `tenants/${tenant.id}/ai-photos/${uuidv4()}-preview.png`;
    await uploadFile(fullKey, fullBuffer, 'image/png');
    await uploadFile(previewKey, previewBuffer, 'image/png');

    const updated = await db`
      UPDATE ai_photo_generations
      SET full_image_key = ${fullKey}, preview_image_key = ${previewKey}, status = 'done'
      WHERE id = ${generation.id}
      RETURNING *
    `;

    const enriched = await enrichWithUrls(updated[0]);
    return c.json({
      generationId: enriched.id,
      previewImageUrl: enriched.preview_image_url,
    });
  } catch (err) {
    console.error('AI photo generation failed:', err);
    await db`
      UPDATE ai_photo_generations SET status = 'failed' WHERE id = ${generation.id}
    `;
    return c.json({ error: 'AI Photo Studio is temporarily unavailable. Please try again later.' }, 503);
  }
});

const unlockSchema = z.object({
  sessionId: z.string().uuid(),
  generationId: z.string().uuid(),
});

// POST /api/ai-photos/unlock — first product free per tenant, otherwise charge AI_PHOTO_COST_CENTS
app.post('/unlock', async (c) => {
  const tenant = c.get('tenant') as { id: string; stripe_customer_id?: string };
  const body = await c.req.json().catch(() => ({}));
  const parsed = unlockSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }
  const { sessionId, generationId } = parsed.data;
  const session_id = sessionId;
  const generation_id = generationId;

  const sessions = await db`
    SELECT * FROM ai_photo_sessions WHERE id = ${session_id} AND tenant_id = ${tenant.id} LIMIT 1
  `;
  const session = sessions[0];
  if (!session) return c.json({ error: 'Session not found' }, 404);

  const generations = await db`
    SELECT * FROM ai_photo_generations WHERE id = ${generation_id} AND session_id = ${session_id} LIMIT 1
  `;
  const generation = generations[0];
  if (!generation || generation.status !== 'done') {
    return c.json({ error: 'Generation not ready' }, 400);
  }

  const freeUsed = await db`
    SELECT id FROM ai_photo_sessions WHERE tenant_id = ${tenant.id} AND is_free = TRUE LIMIT 1
  `;
  const isFree = freeUsed.length === 0;
  const settings = await getPlatformSettings();
  const costCents = settings.ai_photo_cost_cents;

  let chargeId: string | null = null;

  if (!isFree) {
    let payment_method_id: string | undefined;
    if (tenant.stripe_customer_id) {
      const customer = await stripe.customers.retrieve(tenant.stripe_customer_id);
      if (!('deleted' in customer)) {
        const defaultPm = customer.invoice_settings?.default_payment_method;
        payment_method_id = typeof defaultPm === 'string' ? defaultPm : defaultPm?.id;
      }
    }
    if (!payment_method_id) {
      return c.json({ error: 'Payment method required', cost_cents: costCents }, 402);
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: costCents,
      currency: 'usd',
      payment_method: payment_method_id,
      confirm: true,
      off_session: true,
      description: 'Shop Suite Direct AI product photo',
      metadata: { tenant_id: tenant.id, session_id, generation_id },
    });
    chargeId = paymentIntent.id;

    await db`
      INSERT INTO platform_transactions (
        tenant_id, reference_id, reference_type, gross_amount_cents,
        platform_fee_cents, stripe_fee_cents, net_to_tenant_cents
      ) VALUES (
        ${tenant.id}, ${session_id}, 'ai_photo', ${costCents},
        ${costCents}, ${Math.round(costCents * 0.029) + 30}, 0
      )
    `;
  }

  await db`
    UPDATE ai_photo_sessions
    SET status = 'unlocked', is_free = ${isFree}, stripe_charge_id = ${chargeId}, amount_cents = ${costCents}
    WHERE id = ${session_id}
  `;

  await db`
    UPDATE ai_photo_generations SET is_selected = TRUE WHERE id = ${generation_id}
  `;

  if (session.product_id) {
    const product = await db`SELECT image_keys FROM products WHERE id = ${session.product_id} LIMIT 1`;
    if (product[0]) {
      const imageKeys = (product[0].image_keys as string[]) || [];
      imageKeys.push(generation.full_image_key as string);
      await db`
        UPDATE products SET image_keys = ${db.json(imageKeys)}, updated_at = NOW()
        WHERE id = ${session.product_id}
      `;
    }
  }

  return c.json({
    unlocked: true,
    isFree,
    fullImageUrl: generation.full_image_key
      ? await (await import('../services/storage')).getSignedFileUrl(generation.full_image_key as string)
      : null,
  });
});

export default app;
