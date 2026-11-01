import { X } from 'lucide-react';
import { formatPrice } from '../types';
import { useServiceOptionPicker, withOption } from './serviceOptions';

/** "Choose an option" sheet for a service that has options (Kids / Adult / Long hair...). Shown for any theme. */
export default function ServiceOptionHost({ currency }: { currency?: string }) {
  const { service, onChoose, close } = useServiceOptionPicker();
  if (!service || !service.options?.length) return null;
  const accent = 'var(--brand-color, #111827)';

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Choose an option for ${service.name}`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white text-gray-900 shadow-xl sm:rounded-2xl"
      >
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-gray-100 bg-white p-4">
          <div>
            <h2 className="text-lg font-semibold">{service.name}</h2>
            <p className="text-sm text-gray-500">Choose one option</p>
          </div>
          <button type="button" aria-label="Close" onClick={close} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>
        <div className="flex flex-col gap-2 p-4">
          {service.options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => { const chosen = withOption(service, o.id); const cb = onChoose; close(); cb?.(chosen); }}
              className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 text-left transition hover:border-gray-900"
            >
              <span>
                <span className="block font-medium">{o.name}</span>
                <span className="block text-sm text-gray-500">{o.durationMinutes} min</span>
              </span>
              <span className="font-semibold" style={{ color: accent }}>{formatPrice(o.priceCents, currency)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
