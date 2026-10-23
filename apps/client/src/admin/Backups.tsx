import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import Button from '../components/shared/Button';
import Spinner from '../components/shared/Spinner';

interface Run { id: string; status: 'ok' | 'failed'; object_key: string | null; size_bytes: number | null; table_count: number | null; row_count: number | null; error: string | null; trigger: string; duration_ms: number | null; created_at: string }

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const kb = (n: number | null) => (n == null ? '' : n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Nightly encrypted copies of the database, stored outside Railway */
export default function Backups() {
  const api = useApi();
  const qc = useQueryClient();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const q = useQuery({ queryKey: ['admin', 'backups'], queryFn: () => api.get<{ configured: boolean; missing: string[]; last_ok: string | null; runs: Run[] }>('/admin/backups') });
  const run = useMutation({
    mutationFn: () => api.post<{ size_bytes: number }>('/admin/backups/run', {}),
    onSuccess: (r) => { setMsg({ ok: true, text: `Backup done (${kb(r.size_bytes)}).` }); qc.invalidateQueries({ queryKey: ['admin', 'backups'] }); },
    onError: (e: Error) => { setMsg({ ok: false, text: e.message }); qc.invalidateQueries({ queryKey: ['admin', 'backups'] }); },
  });

  const sys = useQuery({ queryKey: ['admin', 'system'], queryFn: () => api.get<{ version: string; patched: boolean; needs: string }>('/admin/backups/system') });
  const flush = useMutation({ mutationFn: () => api.post<{ removed: number }>('/admin/backups/flush-photo-links', {}) });
  const check = useMutation({ mutationFn: () => api.get<{ ok: boolean; message: string }>('/admin/backups/storage-check') });

  if (q.isLoading || !q.data) return <div className="flex justify-center py-16"><Spinner /></div>;
  const { configured, missing, last_ok, runs } = q.data;
  const ageHours = last_ok ? (Date.now() - new Date(last_ok).getTime()) / 3_600_000 : null;
  const stale = configured && (ageHours == null || ageHours > 30);

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Database backups</h1>
        <p className="text-sm text-slate-500">A full, encrypted copy of your database goes to separate storage every night. Old copies are removed after 30 days.</p>
      </div>
      {msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}

      {!configured ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Backups are not turned on yet.</p>
          <p className="mt-1">Add these variables in Railway and redeploy: <span className="font-mono text-xs">{missing.join(', ')}</span></p>
        </div>
      ) : (
        <div className={`rounded-xl border p-4 ${stale ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
          <p className={`font-semibold ${stale ? 'text-red-800' : 'text-emerald-800'}`}>
            {last_ok ? `Last good backup: ${when(last_ok)}` : 'No successful backup yet'}
          </p>
          {stale && <p className="mt-1 text-sm text-red-700">Your newest backup is more than a day old. Check the list below and try "Back up now".</p>}
          <Button size="sm" className="mt-3" isLoading={run.isPending} onClick={() => { setMsg(null); run.mutate(); }}>Back up now</Button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white">
        <p className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Recent backups</p>
        {runs.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">Nothing yet.</p> : (
          <ul className="divide-y divide-slate-100">
            {runs.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="text-slate-800">{when(r.created_at)} <span className="text-xs text-slate-400">· {r.trigger}</span></p>
                  {r.status === 'ok'
                    ? <p className="truncate text-xs text-slate-500">{r.table_count} tables · {r.row_count?.toLocaleString()} rows · {kb(r.size_bytes)}{r.object_key ? ` · ${r.object_key}` : ''}</p>
                    : <p className="text-xs text-red-600">{r.error}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.status === 'ok' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{r.status === 'ok' ? 'OK' : 'Failed'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {sys.data && (
        <div className={`rounded-xl border p-4 text-sm ${sys.data.patched ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
          <p className="font-semibold">Server software: Node.js {sys.data.version}</p>
          <p className="mt-1">{sys.data.patched ? 'This version includes the October 2026 security fixes.' : `This version is missing the October 2026 security fixes. It needs ${sys.data.needs} or newer.`}</p>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Photo storage check</p>
        <p className="mt-1 text-xs text-slate-500">Tests the storage your stores' photos use (the Railway bucket): writes, reads and removes a tiny file, and says what is wrong if it can't.</p>
        <Button size="sm" variant="secondary" className="mt-2" isLoading={check.isPending} onClick={() => check.mutate()}>Run the check</Button>
        {check.data && <p className={`mt-2 rounded-lg px-3 py-2 text-sm ${check.data.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{check.data.message}</p>}
        {check.isError && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{(check.error as Error).message}</p>}
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-500">Photos still broken after the storage check passes? Clear the saved photo links so every photo gets a fresh one on the next visit.</p>
          <Button size="sm" variant="secondary" className="mt-2" isLoading={flush.isPending} onClick={() => flush.mutate()}>Refresh all photo links</Button>
          {flush.data && <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Done. {flush.data.removed} saved links cleared. Reload a store page.</p>}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">If you ever need to restore</p>
        <ol className="mt-2 list-decimal pl-5">
          <li>Create a new, empty Postgres database and copy its connection address.</li>
          <li>Run <span className="rounded bg-slate-100 px-1 font-mono text-xs">npm run restore-backup -- --list</span> to see the files, then <span className="rounded bg-slate-100 px-1 font-mono text-xs">npm run restore-backup -- --key &lt;file&gt; --to &lt;new database address&gt;</span>.</li>
          <li>Point <span className="font-mono text-xs">DATABASE_URL</span> at the new database and redeploy.</li>
        </ol>
        <p className="mt-2 text-xs text-slate-500">Keep a copy of your <span className="font-mono">BACKUP_ENCRYPTION_KEY</span> somewhere safe, outside Railway. Without it, a backup can't be opened.</p>
      </div>
    </div>
  );
}
