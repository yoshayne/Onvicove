import { z } from 'zod';
import { formatInTimeZone } from 'date-fns-tz';
import { db } from '../db/client';
import { appliesOn, blockConflicts, createTimeBlock, describeBlock, hhmm, listTimeBlocks, timeBlockInput, type TimeBlockInput } from './timeBlocks';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_NAME: Record<(typeof DAYS)[number], string> = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

// ── Actions the assistant may propose (and the only things it can ever do) ───
const windowSchema = z.object({ start: hhmm, end: hhmm }).refine((w) => w.start < w.end, { message: 'A window must end after it starts' });

export const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('add_time_block'), block: timeBlockInput }),
  z.object({ type: z.literal('set_weekly_hours'), days: z.array(z.enum(DAYS)).min(1), windows: z.array(windowSchema).max(4) }),
  z.object({ type: z.literal('remove_time_off'), id: z.string().regex(/^(tb|dr):[0-9a-f-]{36}$/) }),
]);
export type Action = z.infer<typeof actionSchema>;

const isWholeDayRange = (b: TimeBlockInput) => !b.weekdays?.length && b.start == null && !!b.date_to;

// ── Talking to the model ─────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'add_time_block',
    description: 'Block time so customers cannot book it: whole days, part of a day, repeating weekdays, ongoing or for a date range. This is for time off, lunch, vacations, "block off" requests.',
    input_schema: {
      type: 'object',
      properties: {
        weekdays: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 6 }, description: '0=Sunday ... 6=Saturday. Omit for every day.' },
        start: { type: ['string', 'null'], description: 'Local start time HH:MM (24h). Omit with end for the whole day.' },
        end: { type: ['string', 'null'], description: 'Local end time HH:MM (24h).' },
        date_from: { type: 'string', description: 'First date, YYYY-MM-DD' },
        date_to: { type: ['string', 'null'], description: 'Last date YYYY-MM-DD, or null for ongoing with no end date' },
        label: { type: ['string', 'null'], description: 'Short note like "Lunch" or "Vacation"' },
      },
      required: ['date_from'],
    },
  },
  {
    name: 'set_weekly_hours',
    description: 'Change the business\'s regular weekly opening hours for some days. Use only when they are changing when they are normally open (not for time off). An empty windows list means closed those days.',
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'array', items: { type: 'string', enum: [...DAYS] } },
        windows: { type: 'array', items: { type: 'object', properties: { start: { type: 'string' }, end: { type: 'string' } }, required: ['start', 'end'] } },
      },
      required: ['days', 'windows'],
    },
  },
  {
    name: 'remove_time_off',
    description: 'Remove time off that already exists, by its id from the list in the system prompt.',
    input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
];

export interface AssistantTenant { id: string; company_name: string; timezone?: string | null; business_hours?: unknown }

function hoursText(h: unknown): string {
  if (!h || typeof h !== 'object') return 'not set';
  const lines = DAYS.map((d) => {
    const w = ((h as Record<string, { start: string; end: string }[]>)[d] ?? []);
    return `${DAY_NAME[d]}: ${w.length ? w.map((x) => `${x.start}-${x.end}`).join(', ') : 'closed'}`;
  });
  return lines.join('; ');
}

async function systemPrompt(tenant: AssistantTenant): Promise<string> {
  const tz = tenant.timezone || 'America/New_York';
  const now = new Date();
  const today = formatInTimeZone(now, tz, 'yyyy-MM-dd');
  const weekday = formatInTimeZone(now, tz, 'EEEE');
  const next = (target: number) => {
    const d = new Date(`${today}T12:00:00Z`);
    const diff = ((target - d.getUTCDay() + 7) % 7) || 7;
    d.setUTCDate(d.getUTCDate() + diff);
    return d.toISOString().slice(0, 10);
  };
  const [blocks, ranges] = await Promise.all([
    listTimeBlocks(tenant.id),
    db`SELECT id, date_from::text AS date_from, date_to::text AS date_to, city_label FROM city_schedules WHERE tenant_id = ${tenant.id} AND kind = 'blocked' AND date_to >= CURRENT_DATE ORDER BY date_from LIMIT 50`,
  ]);
  const existing = [
    ...blocks.map((b) => `- id tb:${b.id} : ${describeBlock(b)}${b.label ? ` (${b.label})` : ''}`),
    ...ranges.map((r) => `- id dr:${r.id} : all day, ${r.date_from} to ${r.date_to}${r.city_label ? ` (${r.city_label})` : ''}`),
  ];
  return [
    `You are the calendar assistant for ${tenant.company_name}, a small business on Shop Suite Direct. You help the owner change their booking calendar by calling tools. Nothing is applied until the owner reviews and confirms what you propose, so propose the change directly.`,
    `Today is ${weekday} ${today}. The business timezone is ${tz}. Next Monday is ${next(1)}. Use YYYY-MM-DD dates and 24-hour HH:MM times in the business timezone.`,
    `Regular weekly hours right now: ${hoursText(tenant.business_hours)}.`,
    `Time off that already exists:\n${existing.length ? existing.join('\n') : '(none)'}`,
    'Rules:',
    '- "Block", "off", "unavailable", "lunch", "vacation" requests use add_time_block. Ongoing / "every month" / "for the foreseeable future" / "from now on" means date_to null. A repeating weekday pattern uses weekdays; omit start and end to block whole days.',
    '- Changing when the business is normally open ("I now work Tuesday to Saturday 10 to 6") uses set_weekly_hours.',
    '- Unless they say otherwise, start from today. "Next week" starts the coming Monday.',
    '- If something important is unclear (which days, which hours, whether it ends), do NOT guess: ask ONE short question with no tools.',
    '- You cannot cancel or move bookings, change prices, or do anything except calendar changes. If asked, say so briefly.',
    '- Keep any text reply to one or two short sentences.',
  ].join('\n');
}

export interface ChatMessage { role: 'user' | 'assistant'; content: string }

export async function askModel(tenant: AssistantTenant, messages: ChatMessage[]): Promise<{ reply: string; actions: Action[]; rejected: boolean }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AssistantUnavailable('The calendar assistant is not set up yet.');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
      max_tokens: 1024,
      temperature: 0,
      system: await systemPrompt(tenant),
      tools: TOOLS,
      messages,
    }),
  });
  if (!res.ok) {
    console.error('Calendar assistant model error:', res.status, (await res.text()).slice(0, 300));
    throw new AssistantUnavailable('The assistant had trouble just now. Please try again.');
  }
  const json = (await res.json()) as { content?: { type: string; text?: string; name?: string; input?: Record<string, unknown> }[] };
  const reply = (json.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join(' ').trim();
  const actions: Action[] = [];
  let rejected = false;
  for (const c of json.content ?? []) {
    if (c.type !== 'tool_use' || !c.name) continue;
    const input = c.input ?? {};
    let candidate: unknown;
    if (c.name === 'add_time_block') candidate = { type: 'add_time_block', block: input };
    else if (c.name === 'set_weekly_hours') candidate = { type: 'set_weekly_hours', ...input };
    else if (c.name === 'remove_time_off') candidate = { type: 'remove_time_off', ...input };
    const parsed = actionSchema.safeParse(candidate);
    if (parsed.success) actions.push(parsed.data);
    else rejected = true;
  }
  return { reply, actions, rejected };
}

export class AssistantUnavailable extends Error {}

// ── Plain-English preview (written by us, not by the model) ─────────────────
export interface PlannedAction { action: Action; description: string; warning?: string }

export async function planActions(tenant: AssistantTenant, actions: Action[]): Promise<PlannedAction[]> {
  const tz = tenant.timezone || 'America/New_York';
  const out: PlannedAction[] = [];
  for (const a of actions) {
    if (a.type === 'add_time_block') {
      const b = a.block;
      const label = b.label ? ` (${b.label})` : '';
      let description: string;
      if (isWholeDayRange(b)) description = `Block ${describeBlock({ weekdays: null, start_time: null, end_time: null, date_from: b.date_from, date_to: b.date_to ?? null })}${label}`;
      else description = `Block ${describeBlock({ weekdays: b.weekdays?.length ? [...b.weekdays].sort() : null, start_time: b.start ?? null, end_time: b.end ?? null, date_from: b.date_from, date_to: b.date_to ?? null })}${label}`;
      const c = await blockConflicts(tenant.id, tz, b);
      out.push({ action: a, description, warning: c.count ? `${c.count} existing booking${c.count === 1 ? '' : 's'} fall in this time and will NOT be cancelled (${c.examples.join('; ')}${c.count > c.examples.length ? '…' : ''}).` : undefined });
    } else if (a.type === 'set_weekly_hours') {
      const names = a.days.map((d) => DAY_NAME[d]).join(', ');
      const w = a.windows.length ? a.windows.map((x) => `${x.start} to ${x.end}`).join(' and ') : 'closed';
      out.push({ action: a, description: `Set regular hours for ${names}: ${w}`, warning: 'Team members with their own weekly hours are not changed.' });
    } else {
      const found = await describeExisting(tenant.id, a.id);
      out.push({ action: a, description: found ? `Remove: ${found}` : 'Remove time off (already gone)' });
    }
  }
  return out;
}

async function describeExisting(tenantId: string, id: string): Promise<string | null> {
  const [kind, raw] = id.split(':');
  if (kind === 'tb') {
    const b = (await listTimeBlocks(tenantId)).find((x) => x.id === raw);
    return b ? describeBlock(b) : null;
  }
  const r = (await db`SELECT date_from::text AS date_from, date_to::text AS date_to FROM city_schedules WHERE id = ${raw} AND tenant_id = ${tenantId} AND kind = 'blocked'`)[0];
  return r ? `all day, ${r.date_from} to ${r.date_to}` : null;
}

// ── Applying and undoing ─────────────────────────────────────────────────────
type Undo =
  | { op: 'delete_time_block'; id: string }
  | { op: 'delete_date_range'; id: string }
  | { op: 'restore_hours'; hours: unknown }
  | { op: 'restore_time_block'; row: Record<string, unknown> }
  | { op: 'restore_date_range'; row: Record<string, unknown> };

export class ApplyError extends Error {}

export async function applyActions(tenant: AssistantTenant, actions: Action[], requestText: string): Promise<{ changeId: string; applied: string[] }> {
  const undo: Undo[] = [];
  const applied: string[] = [];
  for (const a of actions) {
    if (a.type === 'add_time_block') {
      const b = a.block;
      if (isWholeDayRange(b)) {
        const r = await db`
          INSERT INTO city_schedules (tenant_id, date_from, date_to, city_label, kind)
          VALUES (${tenant.id}, ${b.date_from}::date, ${b.date_to!}::date, ${b.label?.trim() || null}, 'blocked') RETURNING id`;
        undo.push({ op: 'delete_date_range', id: r[0].id as string });
        applied.push(`Blocked ${describeBlock({ weekdays: null, start_time: null, end_time: null, date_from: b.date_from, date_to: b.date_to ?? null })}`);
      } else {
        const row = await createTimeBlock(tenant.id, b, 'assistant');
        undo.push({ op: 'delete_time_block', id: row.id });
        applied.push(`Blocked ${describeBlock(row)}`);
      }
    } else if (a.type === 'set_weekly_hours') {
      const current = (await db`SELECT business_hours FROM tenants WHERE id = ${tenant.id}`)[0]?.business_hours as Record<string, { start: string; end: string }[]> | null;
      const next: Record<string, { start: string; end: string }[]> = {};
      for (const d of DAYS) next[d] = Array.isArray(current?.[d]) ? current![d] : [];
      for (const d of a.days) next[d] = a.windows;
      if (!DAYS.some((d) => next[d].length > 0)) throw new ApplyError('That would close every day. To take time off, ask me to block those dates instead.');
      await db`UPDATE tenants SET business_hours = ${db.json(next as never)}, updated_at = NOW() WHERE id = ${tenant.id}`;
      undo.push({ op: 'restore_hours', hours: current ?? null });
      applied.push(`Set regular hours for ${a.days.map((d) => DAY_NAME[d]).join(', ')}`);
    } else {
      const [kind, raw] = a.id.split(':');
      if (kind === 'tb') {
        const row = (await db`SELECT * FROM time_blocks WHERE id = ${raw} AND tenant_id = ${tenant.id}`)[0];
        if (!row) continue;
        await db`DELETE FROM time_blocks WHERE id = ${raw} AND tenant_id = ${tenant.id}`;
        undo.push({ op: 'restore_time_block', row: JSON.parse(JSON.stringify(row)) });
      } else {
        const row = (await db`SELECT * FROM city_schedules WHERE id = ${raw} AND tenant_id = ${tenant.id} AND kind = 'blocked'`)[0];
        if (!row) continue;
        await db`DELETE FROM city_schedules WHERE id = ${raw} AND tenant_id = ${tenant.id}`;
        undo.push({ op: 'restore_date_range', row: JSON.parse(JSON.stringify(row)) });
      }
      applied.push('Removed time off');
    }
  }
  const rec = await db`
    INSERT INTO calendar_changes (tenant_id, request_text, actions, undo)
    VALUES (${tenant.id}, ${requestText.slice(0, 1000)}, ${db.json(actions as never)}, ${db.json(undo as never)}) RETURNING id`;
  return { changeId: rec[0].id as string, applied };
}

export async function undoChange(tenantId: string, changeId: string): Promise<boolean> {
  const rec = (await db`SELECT undo, undone_at FROM calendar_changes WHERE id = ${changeId} AND tenant_id = ${tenantId}`)[0];
  if (!rec || rec.undone_at) return false;
  const steps = rec.undo as Undo[];
  for (const u of [...steps].reverse()) {
    if (u.op === 'delete_time_block') await db`DELETE FROM time_blocks WHERE id = ${u.id} AND tenant_id = ${tenantId}`;
    else if (u.op === 'delete_date_range') await db`DELETE FROM city_schedules WHERE id = ${u.id} AND tenant_id = ${tenantId}`;
    else if (u.op === 'restore_hours') await db`UPDATE tenants SET business_hours = ${u.hours === null ? null : db.json(u.hours as never)}, updated_at = NOW() WHERE id = ${tenantId}`;
    else if (u.op === 'restore_time_block') {
      const r = u.row;
      await db`INSERT INTO time_blocks (id, tenant_id, weekdays, start_time, end_time, date_from, date_to, label, created_via)
        VALUES (${r.id as string}, ${tenantId}, ${(r.weekdays as string | null) ?? null}, ${(r.start_time as string | null) ?? null}, ${(r.end_time as string | null) ?? null}, ${r.date_from as string}, ${(r.date_to as string | null) ?? null}, ${(r.label as string | null) ?? null}, ${(r.created_via as string) ?? 'manual'}) ON CONFLICT DO NOTHING`;
    } else if (u.op === 'restore_date_range') {
      const r = u.row;
      await db`INSERT INTO city_schedules (id, tenant_id, date_from, date_to, city_label, kind)
        VALUES (${r.id as string}, ${tenantId}, ${r.date_from as string}, ${r.date_to as string}, ${(r.city_label as string | null) ?? null}, 'blocked') ON CONFLICT DO NOTHING`;
    }
  }
  await db`UPDATE calendar_changes SET undone_at = NOW() WHERE id = ${changeId}`;
  return true;
}

// keep appliesOn referenced for future preview use
void appliesOn;
