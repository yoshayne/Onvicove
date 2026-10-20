import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import Button from '../components/shared/Button';
import Spinner from '../components/shared/Spinner';

interface Announcement {
  id: string; title: string; body: string; cta_label: string | null; cta_url: string | null; send_email: boolean; send_alert: boolean;
  audience: { plans?: string[]; launched_only?: boolean }; status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused';
  scheduled_for: string | null; sent_at: string | null; recipient_count: number; emailed_count: number; failed_count: number; created_at: string;
}
interface Form {
  id: string | null; title: string; body: string; cta_label: string; cta_url: string; send_email: boolean; send_alert: boolean;
  plans: string[]; launched_only: boolean;
}
const EMPTY: Form = { id: null, title: '', body: '', cta_label: '', cta_url: '', send_email: true, send_alert: true, plans: [], launched_only: true };
const PLANS = [['starter', 'Starter'], ['pro', 'Pro'], ['business', 'Business']] as const;
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');

function Status({ a }: { a: Announcement }) {
  const map: Record<string, string> = { draft: 'bg-slate-100 text-slate-600', scheduled: 'bg-blue-100 text-blue-700', sending: 'bg-amber-100 text-amber-700', paused: 'bg-red-100 text-red-700', sent: 'bg-emerald-100 text-emerald-700' };
  const label = a.status === 'scheduled' ? `Scheduled ${when(a.scheduled_for)}` : a.status === 'sending' ? `Sending ${a.emailed_count}/${a.recipient_count}` : a.status === 'sent' ? `Sent ${when(a.sent_at)}` : a.status[0].toUpperCase() + a.status.slice(1);
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[a.status]}`}>{label}</span>;
}

/** Write an update once and send it to every store owner by email and/or as an alert in their dashboard */
export default function Announcements() {
  const api = useApi();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const [notes, setNotes] = useState('');
  const [when_, setWhen] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState('');

  const list = useQuery({ queryKey: ['admin', 'announcements'], queryFn: () => api.get<{ announcements: Announcement[] }>('/admin/announcements'), refetchInterval: (q) => (q.state.data?.announcements.some((a) => a.status === 'sending') ? 4000 : false) });
  const audience = form ? { plans: form.plans, launched_only: form.launched_only } : {};
  const counts = useQuery({
    queryKey: ['admin', 'announcement-count', JSON.stringify(audience)],
    enabled: !!form,
    queryFn: () => api.post<{ stores: number; emails: number; opted_out: number; no_email: number }>('/admin/announcements/count', { audience }),
  });
  useEffect(() => {
    if (!form?.body) { setPreview(''); return; }
    const t = setTimeout(() => api.post<{ html: string }>('/admin/announcements/preview', { body: form.body }).then((r) => setPreview(r.html)).catch(() => {}), 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.body]);

  const payload = () => form && ({
    title: form.title, body: form.body, cta_label: form.cta_label || null, cta_url: form.cta_url || null,
    send_email: form.send_email, send_alert: form.send_alert, audience: { plans: form.plans, launched_only: form.launched_only },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'announcements'] });
  const fail = (e: Error) => setMsg({ ok: false, text: e.message });

  const save = useMutation({
    mutationFn: async () => form!.id
      ? (await api.put<{ announcement: Announcement }>(`/admin/announcements/${form!.id}`, payload())).announcement
      : (await api.post<{ announcement: Announcement }>('/admin/announcements', payload())).announcement,
    onError: fail,
  });
  const draft = useMutation({
    mutationFn: () => api.post<{ title: string; body: string }>('/admin/announcements/draft', { notes }),
    onSuccess: (r) => setForm((f) => (f ? { ...f, title: r.title, body: r.body } : f)),
    onError: fail,
  });
  async function saved(): Promise<string> {
    const a = await save.mutateAsync();
    setForm((f) => (f ? { ...f, id: a.id } : f));
    refresh();
    return a.id;
  }
  async function act(fn: (id: string) => Promise<unknown>, ok: string, close = false) {
    setMsg(null);
    try {
      const id = await saved();
      await fn(id);
      setMsg({ ok: true, text: ok });
      refresh();
      if (close) setForm(null);
    } catch (e) { fail(e as Error); }
  }
  const sendNow = useMutation({ mutationFn: (id: string) => api.post(`/admin/announcements/${id}/send`, {}) });
  const control = useMutation({
    mutationFn: ({ id, what }: { id: string; what: 'pause' | 'send' | 'unschedule' }) => api.post(`/admin/announcements/${id}/${what}`, {}),
    onSuccess: refresh, onError: fail,
  });
  const del = useMutation({ mutationFn: (id: string) => api.delete(`/admin/announcements/${id}`), onSuccess: refresh, onError: fail });

  const edit = (a: Announcement) => setForm({ id: a.id, title: a.title, body: a.body, cta_label: a.cta_label ?? '', cta_url: a.cta_url ?? '', send_email: a.send_email, send_alert: a.send_alert, plans: a.audience.plans ?? [], launched_only: a.audience.launched_only ?? false });
  const items = list.data?.announcements ?? [];
  const reach = counts.data;

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
          <p className="text-sm text-slate-500">Tell store owners what's new, by email and/or an alert in their dashboard.</p>
        </div>
        {!form && <Button onClick={() => { setForm({ ...EMPTY }); setMsg(null); setNotes(''); }}>New announcement</Button>}
      </div>
      {msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}

      {form && (
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="rounded-lg bg-violet-50 p-3">
            <p className="text-sm font-semibold text-violet-900">Draft it for me</p>
            <p className="text-xs text-violet-700">Paste rough notes about what we shipped. It writes a friendly update you can edit. Nothing is sent.</p>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="e.g. monthly plans for services, free first-sale flyers, About section layouts, fixed phone product window" className="mt-2 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm" />
            <Button size="sm" className="mt-2" isLoading={draft.isPending} disabled={notes.trim().length < 10} onClick={() => { setMsg(null); draft.mutate(); }}>Write a draft</Button>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">Title (the email subject)
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={150} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">Message
              <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={12} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
              <span className="text-xs font-normal text-slate-400">Blank line = new paragraph. Start a line with "- " for a bullet. **bold** works.</span>
            </label>
            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">Preview</p>
              <div className="h-[18.5rem] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800" dangerouslySetInnerHTML={{ __html: preview || '<p style="color:#94a3b8">Your message shows here.</p>' }} />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">Button text (optional)
              <input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} placeholder="See what's new" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">Button link
              <input value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} placeholder="https://shopsuitedirect.com/dashboard" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">How</p>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.send_email} onChange={(e) => setForm({ ...form, send_email: e.target.checked })} /> Email</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.send_alert} onChange={(e) => setForm({ ...form, send_alert: e.target.checked })} /> Alert in their dashboard (bell)</label>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">Who</p>
              <div className="flex flex-wrap gap-3 text-sm">
                {PLANS.map(([id, name]) => (
                  <label key={id} className="flex items-center gap-1.5"><input type="checkbox" checked={form.plans.includes(id)} onChange={(e) => setForm({ ...form, plans: e.target.checked ? [...form.plans, id] : form.plans.filter((p) => p !== id) })} /> {name}</label>
                ))}
              </div>
              <p className="text-xs text-slate-400">None ticked = every plan.</p>
              <label className="mt-1 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.launched_only} onChange={(e) => setForm({ ...form, launched_only: e.target.checked })} /> Only stores that have launched</label>
            </div>
          </div>

          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {counts.isLoading || !reach ? 'Counting…' : <>Reaches <strong>{reach.stores}</strong> stores · <strong>{reach.emails}</strong> emails{reach.opted_out ? ` (${reach.opted_out} unsubscribed are skipped)` : ''}{reach.no_email ? ` · ${reach.no_email} have no email` : ''}. One email per person, even if they own several stores.</>}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" isLoading={save.isPending} disabled={!form.title.trim()} onClick={async () => { setMsg(null); try { await saved(); setMsg({ ok: true, text: 'Draft saved.' }); } catch (e) { fail(e as Error); } }}>Save draft</Button>
            <Button variant="secondary" disabled={!form.title.trim()} onClick={() => act((id) => api.post(`/admin/announcements/${id}/test`, {}), 'Test email sent to you.')}>Send test to me</Button>
            <span className="mx-1 text-slate-300">|</span>
            <input type="datetime-local" value={when_} onChange={(e) => setWhen(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
            <Button variant="secondary" disabled={!form.title.trim() || !when_} onClick={() => act((id) => api.post(`/admin/announcements/${id}/schedule`, { scheduled_for: new Date(when_).toISOString() }), 'Scheduled.', true)}>Schedule</Button>
            <Button disabled={!form.title.trim() || (!form.send_email && !form.send_alert)} onClick={() => { if (window.confirm(`Send "${form.title}" now to ${reach?.stores ?? 'all'} stores? This can't be undone.`)) act((id) => sendNow.mutateAsync(id), 'Sending started. You can pause it below.', true); }}>Send now</Button>
            <Button variant="ghost" onClick={() => setForm(null)}>Close</Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white">
        <p className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">History</p>
        {list.isLoading ? <div className="flex justify-center py-8"><Spinner /></div> : items.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">Nothing yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{a.title}</p>
                  <p className="text-xs text-slate-500">{a.send_email ? 'Email' : ''}{a.send_email && a.send_alert ? ' + ' : ''}{a.send_alert ? 'Alert' : ''} · {a.status === 'sent' || a.status === 'sending' || a.status === 'paused' ? `${a.emailed_count} emailed${a.failed_count ? `, ${a.failed_count} failed` : ''} · ${a.recipient_count} stores` : `Created ${when(a.created_at)}`}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Status a={a} />
                  {(a.status === 'draft' || a.status === 'scheduled') && <Button size="sm" variant="secondary" onClick={() => edit(a)}>Edit</Button>}
                  {a.status === 'scheduled' && <Button size="sm" variant="ghost" onClick={() => control.mutate({ id: a.id, what: 'unschedule' })}>Unschedule</Button>}
                  {a.status === 'sending' && <Button size="sm" variant="danger" onClick={() => control.mutate({ id: a.id, what: 'pause' })}>Pause</Button>}
                  {a.status === 'paused' && <Button size="sm" onClick={() => control.mutate({ id: a.id, what: 'send' })}>Resume</Button>}
                  {(a.status === 'draft' || a.status === 'scheduled') && <Button size="sm" variant="ghost" onClick={() => { if (window.confirm('Delete this announcement?')) del.mutate(a.id); }}>Delete</Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
