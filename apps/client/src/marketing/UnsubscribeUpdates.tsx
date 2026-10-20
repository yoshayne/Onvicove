import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiGet, apiPost } from '../lib/api';

/** The page behind "Unsubscribe from product updates" in our "what's new" emails */
export default function UnsubscribeUpdates() {
  const { token = '' } = useParams();
  const [info, setInfo] = useState<{ company: string; subscribed: boolean } | null>(null);
  const [error, setError] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiGet<{ company: string; subscribed: boolean }>(`/api/public/updates/unsubscribe/${token}`).then(setInfo).catch(() => setError(true));
  }, [token]);

  async function go() {
    setBusy(true);
    try { await apiPost(`/api/public/updates/unsubscribe/${token}`, {}); setDone(true); } catch { setError(true); } finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-lg font-bold text-slate-900">Shop Suite Direct</p>
        {error ? <p className="mt-3 text-slate-600">This link is not valid.</p>
          : !info ? <p className="mt-3 text-slate-400">Loading…</p>
          : done || !info.subscribed ? (
            <>
              <p className="mt-3 text-slate-700">You're unsubscribed from product updates{info.company ? ` for ${info.company}` : ''}. You'll still get booking, payment and account emails.</p>
              <p className="mt-2 text-sm text-slate-500">Changed your mind? Turn updates back on in Settings in your dashboard.</p>
            </>
          ) : (
            <>
              <p className="mt-3 text-slate-700">Stop "what's new" emails{info.company ? ` for ${info.company}` : ''}? You'll still get booking, payment and account emails.</p>
              <button type="button" onClick={go} disabled={busy} className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'One moment…' : 'Unsubscribe'}</button>
            </>
          )}
        <Link to="/" className="mt-4 inline-block text-sm text-slate-400 hover:text-slate-600">Back to home</Link>
      </div>
    </div>
  );
}
