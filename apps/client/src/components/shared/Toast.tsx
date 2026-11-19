import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export interface ToastMessage {
  kind: 'success' | 'error';
  text: string;
}

/** A small popup in the corner that goes away on its own (errors stay a little longer) */
export default function Toast({ toast, onClose }: { toast: ToastMessage | null; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(onClose, toast.kind === 'error' ? 9000 : 4500);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  const ok = toast.kind === 'success';
  return (
    <div role={ok ? 'status' : 'alert'} className="fixed right-4 top-4 z-[100] w-[calc(100vw-2rem)] max-w-sm">
      <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${ok ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'}`}>
        {ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" /> : <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />}
        <p className="flex-1 text-sm font-medium">{toast.text}</p>
        <button type="button" onClick={onClose} aria-label="Dismiss" className="shrink-0 opacity-60 hover:opacity-100"><X size={16} /></button>
      </div>
    </div>
  );
}
