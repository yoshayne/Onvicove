import { z } from 'zod';
import { db } from '../db/client';
import { getBaseUrl } from '../lib/baseUrl';
import { renderAnnouncementBody, unsubscribeToken } from '../lib/announcementText';
import { sendAnnouncementEmail } from './email';

export const audienceSchema = z.object({
  /** empty or missing = every plan */
  plans: z.array(z.enum(['starter', 'pro', 'business'])).optional(),
  launched_only: z.boolean().optional(),
});
export type Audience = z.infer<typeof audienceSchema>;

export const announcementInput = z.object({
  title: z.string().trim().min(1).max(150),
  body: z.string().max(8000).default(''),
  cta_label: z.string().trim().max(60).nullable().optional(),
  cta_url: z.string().trim().max(500).refine((u) => !u || /^https?:\/\//i.test(u), 'The link must start with http:// or https://').nullable().optional(),
  send_email: z.boolean().default(true),
  send_alert: z.boolean().default(true),
  audience: audienceSchema.default({}),
});

interface Recipient { tenantId: string; company: string; plan: string; email: string | null; name: string; optedOut: boolean }

export async function recipientsFor(audience: Audience): Promise<Recipient[]> {
  const plans = audience.plans?.length ? audience.plans : null;
  const rows = await db`
    SELECT t.id, t.company_name, t.plan, t.product_updates_emails, u.email, u.first_name
    FROM tenants t LEFT JOIN users u ON u.clerk_user_id = t.clerk_user_id
    WHERE t.is_active = TRUE
      AND (${plans}::text[] IS NULL OR t.plan = ANY(${plans}::text[]))
      AND (${!!audience.launched_only} = FALSE OR t.wizard_completed = TRUE)
    ORDER BY t.created_at`;
  return rows.map((r) => ({
    tenantId: r.id as string, company: r.company_name as string, plan: r.plan as string,
    email: (r.email as string | null)?.trim() || null, name: (r.first_name as string | null) || (r.company_name as string),
    optedOut: r.product_updates_emails === false,
  }));
}

/** How many people an announcement would reach */
export async function audienceCounts(audience: Audience): Promise<{ stores: number; emails: number; opted_out: number; no_email: number }> {
  const rs = await recipientsFor(audience);
  const seen = new Set<string>();
  let optedOut = 0, noEmail = 0;
  for (const r of rs) {
    if (!r.email) { noEmail++; continue; }
    if (r.optedOut) { optedOut++; continue; }
    seen.add(r.email.toLowerCase());
  }
  return { stores: rs.length, emails: seen.size, opted_out: optedOut, no_email: noEmail };
}

const unsubUrl = (tenantId: string) => `${getBaseUrl()}/unsubscribe/updates/${unsubscribeToken(tenantId)}`;

/** A test copy to one address (never recorded against any store) */
export async function sendTest(a: { title: string; body: string; cta_label?: string | null; cta_url?: string | null }, toEmail: string): Promise<void> {
  await sendAnnouncementEmail({
    toEmail, toName: toEmail.split('@')[0], title: a.title, bodyHtml: renderAnnouncementBody(a.body),
    ctaLabel: a.cta_label, ctaUrl: a.cta_url, unsubscribeUrl: `${getBaseUrl()}/unsubscribe/updates/example`, preview: true,
  });
}

const running = new Set<string>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const BATCH = 10;
const BATCH_PAUSE_MS = 1100; // about 9 emails a second: gentle on the email provider

/** Send (or resume) an announcement. Safe to call twice: nobody is sent the same one twice. */
export async function runAnnouncement(id: string): Promise<void> {
  if (running.has(id)) return;
  running.add(id);
  try {
    const claimed = await db`
      UPDATE announcements SET status = 'sending', started_at = COALESCE(started_at, NOW()), updated_at = NOW()
      WHERE id = ${id} AND status IN ('draft', 'scheduled', 'sending') RETURNING *`;
    const a = claimed[0];
    if (!a) return;
    const recs = await recipientsFor(a.audience as Audience);
    await db`UPDATE announcements SET recipient_count = ${recs.length} WHERE id = ${id}`;
    const bodyHtml = renderAnnouncementBody(a.body as string);
    const seenEmails = new Set<string>();

    for (let i = 0; i < recs.length; i += BATCH) {
      const status = (await db`SELECT status FROM announcements WHERE id = ${id}`)[0]?.status;
      if (status !== 'sending') return; // paused (or removed): stop here, resume later
      for (const r of recs.slice(i, i + BATCH)) {
        // The row is the guard: only the run that creates it sends to this store
        const ins = await db`
          INSERT INTO announcement_deliveries (announcement_id, tenant_id, alert) VALUES (${id}, ${r.tenantId}, ${a.send_alert as boolean})
          ON CONFLICT DO NOTHING RETURNING tenant_id`;
        if (!ins[0]) continue;
        let result: 'sent' | 'failed' | 'skipped' = 'skipped';
        let error: string | null = null;
        const key = r.email?.toLowerCase();
        if (a.send_email && r.email && !r.optedOut && key && !seenEmails.has(key)) {
          seenEmails.add(key);
          try {
            await sendAnnouncementEmail({
              toEmail: r.email, toName: r.name, title: a.title as string, bodyHtml, ctaLabel: a.cta_label as string | null, ctaUrl: a.cta_url as string | null,
              unsubscribeUrl: unsubUrl(r.tenantId), tenantId: r.tenantId, announcementId: id,
            });
            result = 'sent';
          } catch (err) {
            result = 'failed';
            error = err instanceof Error ? err.message.slice(0, 300) : 'send failed';
          }
        }
        await db`UPDATE announcement_deliveries SET email_status = ${a.send_email ? result : null}, email_error = ${error} WHERE announcement_id = ${id} AND tenant_id = ${r.tenantId}`;
        if (result === 'sent') await db`UPDATE announcements SET emailed_count = emailed_count + 1, updated_at = NOW() WHERE id = ${id}`;
        if (result === 'failed') await db`UPDATE announcements SET failed_count = failed_count + 1, updated_at = NOW() WHERE id = ${id}`;
      }
      await db`UPDATE announcements SET updated_at = NOW() WHERE id = ${id}`;
      if (i + BATCH < recs.length) await sleep(BATCH_PAUSE_MS);
    }
    await db`UPDATE announcements SET status = 'sent', sent_at = NOW(), updated_at = NOW() WHERE id = ${id} AND status = 'sending'`;
  } finally {
    running.delete(id);
  }
}

/** Every minute: start what is due, and pick up a send that was interrupted (a restart) */
export async function announcementTick(): Promise<void> {
  const due = await db`SELECT id FROM announcements WHERE status = 'scheduled' AND scheduled_for <= NOW() LIMIT 5`;
  const stalled = await db`SELECT id FROM announcements WHERE status = 'sending' AND updated_at < NOW() - INTERVAL '3 minutes' LIMIT 5`;
  for (const r of [...due, ...stalled]) runAnnouncement(r.id as string).catch((err) => console.error('Announcement run failed:', err));
}

// ── Drafting help ────────────────────────────────────────────────────────────
// Providers are tried in this order, skipping any that has no key: Gemini (the key the photo features already use),
// then OpenAI, then Anthropic. A failure moves on to the next one; any single key on its own also works.
interface Draft { title: string; body: string }

const DRAFT_SYSTEM = [
  'You write the weekly "what\'s new" update that Shop Suite Direct sends to its customers: owners of small businesses (barbers, salons, photographers, shops) who use it for their website, store, bookings and payments.',
  'Turn the notes you are given into a friendly, clear update. Plain language, no jargon, no hype. Explain what each change means for THEM.',
  'Only mention things that are in the notes. Never invent features, dates, numbers or promises.',
  'Format: short paragraphs separated by a blank line; bullets start with "- "; **bold** for the feature names. Under 180 words. Start with a one-line friendly opener, end with a one-line sign-off from "The Shop Suite Direct team".',
].join('\n');

const DRAFT_SCHEMA = {
  type: 'object',
  properties: { title: { type: 'string', description: 'Email subject, under 70 characters' }, body: { type: 'string' } },
  required: ['title', 'body'],
  additionalProperties: false,
};

function cleanDraft(t: { title?: unknown; body?: unknown } | undefined): Draft {
  if (typeof t?.title !== 'string' || typeof t.body !== 'string' || !t.title.trim() || !t.body.trim()) throw new Error('The helper did not return a draft.');
  return { title: t.title.trim().slice(0, 150), body: t.body.trim() };
}

async function draftWithOpenAI(notes: string, key: string): Promise<Draft> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      max_tokens: 1200,
      temperature: 0.4,
      messages: [
        { role: 'system', content: DRAFT_SYSTEM },
        { role: 'user', content: notes.slice(0, 6000) },
      ],
      response_format: { type: 'json_schema', json_schema: { name: 'write_update', strict: true, schema: DRAFT_SCHEMA } },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { choices?: { message?: { content?: string | null; refusal?: string | null } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned no draft.');
  return cleanDraft(JSON.parse(content) as { title?: unknown; body?: unknown });
}

async function draftWithGemini(notes: string, key: string): Promise<Draft> {
  const model = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: DRAFT_SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: notes.slice(0, 6000) }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1500,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: { title: { type: 'STRING', description: 'Email subject, under 70 characters' }, body: { type: 'STRING' } },
          required: ['title', 'body'],
        },
        // Short writing task: skip the extra "thinking" so the whole answer fits and comes back quickly
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('');
  if (!text) throw new Error('Gemini returned no draft.');
  return cleanDraft(JSON.parse(text) as { title?: unknown; body?: unknown });
}

async function draftWithAnthropic(notes: string, key: string): Promise<Draft> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
      max_tokens: 1200,
      temperature: 0.4,
      system: DRAFT_SYSTEM,
      tools: [{ name: 'write_update', description: 'The finished update', input_schema: DRAFT_SCHEMA }],
      tool_choice: { type: 'tool', name: 'write_update' },
      messages: [{ role: 'user', content: notes.slice(0, 6000) }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { content?: { type: string; input?: { title?: string; body?: string } }[] };
  return cleanDraft(json.content?.find((c) => c.type === 'tool_use')?.input);
}

export async function draftFromNotes(notes: string): Promise<Draft> {
  const providers: { name: string; run: () => Promise<Draft> }[] = [];
  const openai = process.env.OPENAI_API_KEY;
  const gemini = process.env.GEMINI_API_KEY;
  const anthropic = process.env.ANTHROPIC_API_KEY;
  if (gemini) providers.push({ name: 'Gemini', run: () => draftWithGemini(notes, gemini) });
  if (openai) providers.push({ name: 'OpenAI', run: () => draftWithOpenAI(notes, openai) });
  if (anthropic) providers.push({ name: 'Anthropic', run: () => draftWithAnthropic(notes, anthropic) });
  if (providers.length === 0) throw new Error('The drafting helper is not set up yet (add GEMINI_API_KEY, OPENAI_API_KEY or ANTHROPIC_API_KEY).');

  const failures: string[] = [];
  for (let i = 0; i < providers.length; i++) {
    try {
      return await providers[i].run();
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      failures.push(`${providers[i].name}: ${reason.replace(/\s+/g, ' ').slice(0, 160)}`);
      const next = providers[i + 1];
      console.error(`Announcement draft: ${providers[i].name} failed${next ? `, trying ${next.name}` : ''}:`, reason);
    }
  }
  // Only admins reach this screen, so say what went wrong instead of hiding it
  throw new Error(`The drafting helper had trouble. ${failures.join(' | ')}`);
}
