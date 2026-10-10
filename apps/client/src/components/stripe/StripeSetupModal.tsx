import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useApi } from '../../lib/api';
import StripeDetailsForm, { type StripeDetails } from '../shared/StripeDetailsForm';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** The "Let's get you paid" pop-up: explains what Stripe needs, then sends the owner to Stripe with their details pre-filled. */
export default function StripeSetupModal({ open, onClose }: Props) {
  const api = useApi();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function connect(details: StripeDetails) {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ url: string }>('/stripe/connect-link', details);
      window.location.href = res.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open Stripe. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Set up payments"
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Let's get you paid</h2>
            <p className="mt-1 text-sm text-slate-500">
              Two quick steps: tell us how you run your business, then Stripe collects the rest. Takes about 5 minutes.
            </p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>
        <StripeDetailsForm submitLabel="Continue to Stripe" busy={busy} onSubmit={connect} onLater={onClose} />
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
