import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, X, LogOut } from 'lucide-react';
import { useImpersonation } from '../contexts/ImpersonationContext';
import { useAuth } from '@clerk/clerk-react';
import { apiPost } from '../lib/api';

export default function ImpersonationBanner() {
  const { impersonation, endImpersonation } = useImpersonation();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [whatFixed, setWhatFixed] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!impersonation) return null;

  async function handleExit() {
    setSubmitting(true);
    try {
      if (whatFixed || rootCause) {
        await apiPost('/admin/impersonate/report', {
          tenant_id: impersonation!.tenantId,
          what_i_fixed: whatFixed,
          root_cause: rootCause,
        }, getToken);
      }
    } catch {
      // best-effort
    } finally {
      endImpersonation();
      setShowModal(false);
      navigate('/admin/tenants');
    }
  }

  return (
    <>
      {/* Sticky banner */}
      <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-md">
        <div className="flex items-center gap-2">
          <Shield size={15} />
          <span>Admin mode — acting as <strong>{impersonation.companyName}</strong></span>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded bg-white/20 px-3 py-1 text-xs font-bold hover:bg-white/30 transition-colors"
        >
          <LogOut size={13} />
          Exit
        </button>
      </div>

      {/* Exit + issue report modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-800">Exit admin session</h2>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-slate-500">
                Optionally log what you found and fixed for <strong className="text-slate-700">{impersonation.companyName}</strong>. This is saved to the audit log so we can prevent the same issues for future clients.
              </p>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  What did you fix?
                </label>
                <textarea
                  value={whatFixed}
                  onChange={e => setWhatFixed(e.target.value)}
                  rows={3}
                  placeholder="e.g. Their hero image was broken because the URL had an extra slash…"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-300 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Root cause / what should be fixed permanently?
                </label>
                <textarea
                  value={rootCause}
                  onChange={e => setRootCause(e.target.value)}
                  rows={3}
                  placeholder="e.g. The image upload should strip trailing slashes. We should add validation in the upload flow…"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-300 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExit}
                disabled={submitting}
                className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-60"
              >
                <LogOut size={14} />
                {submitting ? 'Saving…' : 'Save & Exit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
