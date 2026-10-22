import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck } from 'lucide-react';
import { useApi } from '../lib/api';
import Button from '../components/shared/Button';

interface Provider { available: boolean; connected: boolean; needs_reconnect: boolean }
interface Status { google: Provider; outlook: Provider; block_busy: boolean }

const RESULT: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: 'Connected. Your upcoming bookings are being added to your calendar now.' },
  error: { ok: false, text: 'We could not connect. Please try again.' },
  permission: { ok: false, text: 'The calendar permission was turned off on the sign-in screen. Try again and leave it ticked.' },
};

/** Connect Google Calendar and/or Outlook: bookings appear there, and what is already on it blocks those times */
export default function CalendarConnections() {
  const api = useApi();
  const qc = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const back = RESULT[params.get('gcal') ?? params.get('outlook') ?? ''];
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(back ?? null);
  const q = useQuery({ queryKey: ['calendar-sync'], queryFn: () => api.get<Status>('/calendar-sync/status') });

  const connect = useMutation({
    mutationFn: async (p: 'google' | 'outlook') => (await api.get<{ url: string }>(`/${p === 'google' ? 'google-cal' : 'outlook-cal'}/connect`)).url,
    onSuccess: (url) => { window.location.href = url; },
    onError: (e: Error) => setMsg({ ok: false, text: e.message }),
  });
  const disconnect = useMutation({
    mutationFn: (p: 'google' | 'outlook') => api.delete(`/${p === 'google' ? 'google-cal' : 'outlook-cal'}/disconnect`),
    onSuccess: () => { setMsg({ ok: true, text: 'Disconnected. Events already on your calendar stay there.' }); qc.invalidateQueries({ queryKey: ['calendar-sync'] }); },
  });
  const toggle = useMutation({
    mutationFn: (v: boolean) => api.patch('/calendar-sync/settings', { block_busy: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar-sync'] }),
  });

  const s = q.data;
  const rows: { id: 'google' | 'outlook'; name: string; p: Provider | undefined }[] = [
    { id: 'google', name: 'Google Calendar', p: s?.google },
    { id: 'outlook', name: 'Outlook / Microsoft 365', p: s?.outlook },
  ];
  const anyConnected = !!(s?.google.connected || s?.outlook.connected);

  return (
    <div className="flex max-w-2xl flex-col gap-3 rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <CalendarCheck size={18} className="text-violet-600" />
        <h2 className="text-lg font-semibold text-slate-900">Your calendar</h2>
      </div>
      <p className="text-sm text-slate-500">Connect your own calendar so new bookings show up there, and so anything already on it (a dentist visit, a personal event) blocks those times on your booking page.</p>
      {msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}

      {rows.map(({ id, name, p }) => (
        <div key={id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{name}</p>
            <p className={`text-xs ${p?.needs_reconnect ? 'text-amber-600' : p?.connected ? 'text-emerald-600' : 'text-slate-500'}`}>
              {!p ? 'Loading…' : !p.available ? 'Not available yet' : p.needs_reconnect ? 'Connection expired. Please reconnect.' : p.connected ? 'Connected' : 'Not connected'}
            </p>
          </div>
          <div className="flex gap-2">
            {p?.available && (!p.connected || p.needs_reconnect) && (
              <Button size="sm" isLoading={connect.isPending && connect.variables === id} onClick={() => { setMsg(null); connect.mutate(id); }}>{p.needs_reconnect ? 'Reconnect' : 'Connect'}</Button>
            )}
            {p?.connected && <Button size="sm" variant="secondary" isLoading={disconnect.isPending && disconnect.variables === id} onClick={() => { if (window.confirm(`Disconnect ${name}? New bookings will stop going to it.`)) disconnect.mutate(id); }}>Disconnect</Button>}
          </div>
        </div>
      ))}

      {anyConnected && (
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-0.5" checked={s?.block_busy !== false} onChange={(e) => toggle.mutate(e.target.checked)} />
          <span>Block times when I'm busy on my calendar<span className="block text-xs text-slate-500">Events marked as "free" are ignored, and so are the bookings we put there ourselves.</span></span>
        </label>
      )}
    </div>
  );
}
