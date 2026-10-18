import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Trash2, Undo2 } from 'lucide-react';
import { useApi } from '../lib/api';
import Button from '../components/shared/Button';

interface Planned { action: Record<string, unknown>; description: string; warning?: string }
interface Msg { role: 'user' | 'assistant'; content: string }
interface TimeBlock { id: string; description: string; label: string | null; created_via: string }

const EXAMPLES = [
  'Block Monday to Friday, 8 AM to 5 PM, starting next week, ongoing',
  'I take lunch every day from 12 to 1',
  "I'm off December 20 to January 2",
];
const DAYS = [['Mon', 1], ['Tue', 2], ['Wed', 3], ['Thu', 4], ['Fri', 5], ['Sat', 6], ['Sun', 0]] as const;
const today = () => new Date().toLocaleDateString('en-CA');

/** Tell the calendar what to change in plain English; review it; confirm (or undo). Plus a list of repeating / part-day time off. */
export default function CalendarAssistant() {
  const api = useApi();
  const qc = useQueryClient();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [planned, setPlanned] = useState<Planned[]>([]);
  const [done, setDone] = useState<{ id: string; lines: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['time-blocks'] });
    qc.invalidateQueries({ queryKey: ['city-schedules'] });
    qc.invalidateQueries({ queryKey: ['tenant', 'me'] });
  };

  const blocksQ = useQuery({ queryKey: ['time-blocks'], queryFn: () => api.get<{ time_blocks: TimeBlock[] }>('/time-blocks') });

  const ask = useMutation({
    mutationFn: (msgs: Msg[]) => api.post<{ reply: string; planned: Planned[] }>('/assistant/calendar', { messages: msgs }),
    onSuccess: (res, msgs) => {
      setError(null);
      setPlanned(res.planned);
      setMessages(res.reply ? [...msgs, { role: 'assistant', content: res.reply }] : msgs);
      if (res.planned.length === 0 && !res.reply) setError("I couldn't turn that into a calendar change. Try saying which days, which hours, and whether it ends.");
    },
    onError: (e: Error) => setError(e.message),
  });

  const apply = useMutation({
    mutationFn: () => api.post<{ change_id: string; applied: string[] }>('/assistant/calendar/apply', {
      actions: planned.map((p) => p.action),
      request_text: messages.filter((m) => m.role === 'user').map((m) => m.content).join(' | '),
    }),
    onSuccess: (res) => {
      setDone({ id: res.change_id, lines: res.applied });
      setPlanned([]);
      setMessages([]);
      refresh();
    },
    onError: (e: Error) => setError(e.message),
  });

  const undo = useMutation({
    mutationFn: (id: string) => api.post(`/assistant/calendar/undo/${id}`, {}),
    onSuccess: () => { setDone(null); refresh(); },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/time-blocks/${id}`),
    onSuccess: refresh,
  });

  function send(text: string) {
    const t = text.trim();
    if (!t || ask.isPending) return;
    const next: Msg[] = [...messages, { role: 'user', content: t }];
    setMessages(next);
    setInput('');
    setDone(null);
    setPlanned([]);
    setError(null);
    ask.mutate(next);
  }

  const blocks = blocksQ.data?.time_blocks ?? [];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-violet-600" />
        <h2 className="text-lg font-semibold text-slate-900">Calendar assistant</h2>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">Beta</span>
      </div>
      <p className="mt-1 text-sm text-slate-500">Tell it what to block off or change. You'll see exactly what it will do before anything happens, and you can undo it.</p>

      {/* conversation so far */}
      {messages.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {messages.map((m, i) => (
            <p key={i} className={`max-w-[90%] rounded-2xl px-3.5 py-2 text-sm ${m.role === 'user' ? 'self-end bg-violet-600 text-white' : 'self-start bg-slate-100 text-slate-800'}`}>{m.content}</p>
          ))}
        </div>
      )}

      {planned.length > 0 && (
        <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-sm font-semibold text-violet-900">Here's what I'll change:</p>
          <ul className="mt-2 flex flex-col gap-2">
            {planned.map((p, i) => (
              <li key={i} className="text-sm text-slate-800">
                • {p.description}
                {p.warning && <span className="mt-0.5 block text-xs text-amber-700">⚠ {p.warning}</span>}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <Button size="sm" isLoading={apply.isPending} onClick={() => apply.mutate()}>Confirm</Button>
            <Button size="sm" variant="secondary" onClick={() => { setPlanned([]); setMessages([]); }}>Cancel</Button>
          </div>
        </div>
      )}

      {done && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-800">Done.</p>
          <ul className="mt-1 text-sm text-emerald-900">{done.lines.map((l) => <li key={l}>• {l}</li>)}</ul>
          <Button size="sm" variant="secondary" className="mt-2" isLoading={undo.isPending} onClick={() => undo.mutate(done.id)}><Undo2 size={14} /> Undo</Button>
        </div>
      )}

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={messages.length ? 'Reply…' : 'e.g. Block Monday to Friday 8 to 5, starting next week'}
          maxLength={1500}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <Button type="submit" isLoading={ask.isPending} disabled={!input.trim()}>Ask</Button>
      </form>
      {messages.length === 0 && !done && (
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" onClick={() => send(ex)} className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-violet-300 hover:text-violet-700">{ex}</button>
          ))}
        </div>
      )}

      {/* what is blocked */}
      <div className="mt-6 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Repeating &amp; part-day time off</h3>
          <button type="button" onClick={() => setShowManual((v) => !v)} className="text-sm font-medium text-violet-700 hover:underline">{showManual ? 'Close' : '+ Add by hand'}</button>
        </div>
        {blocks.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Nothing blocked this way. Whole days off are on the calendar above.</p>
        ) : (
          <ul className="mt-2 flex flex-col divide-y divide-slate-100">
            {blocks.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-slate-700">{b.description}{b.label ? <span className="text-slate-400"> · {b.label}</span> : null}</span>
                <button type="button" aria-label="Remove" onClick={() => remove.mutate(b.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
        {showManual && <ManualBlockForm onSaved={() => { refresh(); setShowManual(false); }} />}
      </div>
    </div>
  );
}

function ManualBlockForm({ onSaved }: { onSaved: () => void }) {
  const api = useApi();
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState('12:00');
  const [end, setEnd] = useState('13:00');
  const [from, setFrom] = useState(today());
  const [ongoing, setOngoing] = useState(true);
  const [to, setTo] = useState(today());
  const [label, setLabel] = useState('');
  const [note, setNote] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => api.post<{ existing_bookings: number }>('/time-blocks', {
      weekdays: days.length === 7 ? null : days,
      start: allDay ? null : start,
      end: allDay ? null : end,
      date_from: from,
      date_to: ongoing ? null : to,
      label: label.trim() || null,
    }),
    onSuccess: (r) => {
      if (r.existing_bookings > 0) setNote(`Saved. ${r.existing_bookings} existing booking${r.existing_bookings === 1 ? '' : 's'} fall in this time and were not cancelled.`);
      else onSaved();
    },
  });

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl bg-slate-50 p-4">
      <div className="flex flex-wrap gap-1.5">
        {DAYS.map(([name, n]) => {
          const on = days.includes(n);
          return <button key={n} type="button" onClick={() => setDays((d) => (on ? d.filter((x) => x !== n) : [...d, n]))} className={`rounded-full border px-3 py-1 text-xs font-semibold ${on ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-300 bg-white text-slate-600'}`}>{name}</button>;
        })}
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> All day</label>
      {!allDay && (
        <div className="flex items-center gap-2 text-sm">
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" />
          <span>to</span>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span>Starting</span>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" />
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={ongoing} onChange={(e) => setOngoing(e.target.checked)} /> Ongoing</label>
        {!ongoing && (<><span>until</span><input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" /></>)}
      </div>
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Note (optional), like Lunch" maxLength={120} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      {save.isError && <p className="text-sm text-red-600">{(save.error as Error).message}</p>}
      {note && <p className="text-sm text-amber-700">{note}</p>}
      <div className="flex gap-2">
        <Button size="sm" isLoading={save.isPending} disabled={days.length === 0 || (!allDay && start >= end)} onClick={() => save.mutate()}>Save time off</Button>
        {note && <Button size="sm" variant="secondary" onClick={onSaved}>Done</Button>}
      </div>
    </div>
  );
}
