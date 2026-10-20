import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { useApi } from '../lib/api';

interface Item { id: string; title: string; html: string; cta_label: string | null; cta_url: string | null; sent_at: string; read_at: string | null }

/** "What's new" alerts from the platform, under the bell */
export default function NotificationsBell() {
  const api = useApi();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const q = useQuery({ queryKey: ['announcements'], queryFn: () => api.get<{ announcements: Item[]; unread: number }>('/announcements'), refetchInterval: 5 * 60_000 });
  const read = useMutation({ mutationFn: (id: string) => api.post(`/announcements/${id}/read`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }) });
  const readAll = useMutation({ mutationFn: () => api.post('/announcements/read-all', {}), onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }) });
  const items = q.data?.announcements ?? [];
  const unread = q.data?.unread ?? 0;

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700" aria-label="What's new">
        <Bell size={18} />
        {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-[min(92vw,380px)] rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">What's new</p>
              {unread > 0 && <button type="button" onClick={() => readAll.mutate()} className="text-xs font-medium text-violet-700 hover:underline">Mark all read</button>}
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {items.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">Nothing new yet.</p> : items.map((a) => (
                <div key={a.id} className={`border-b border-slate-100 px-4 py-3 ${a.read_at ? '' : 'bg-violet-50/50'}`}>
                  <button type="button" className="w-full text-left" onClick={() => { setOpenId(openId === a.id ? null : a.id); if (!a.read_at) read.mutate(a.id); }}>
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">{!a.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-violet-600" />}{a.title}</p>
                    <p className="text-xs text-slate-400">{new Date(a.sent_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                  </button>
                  {openId === a.id && (
                    <div className="mt-2 text-sm text-slate-700">
                      <div dangerouslySetInnerHTML={{ __html: a.html }} />
                      {a.cta_label && a.cta_url && <a href={a.cta_url} target="_blank" rel="noreferrer" className="mt-1 inline-block rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">{a.cta_label}</a>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
