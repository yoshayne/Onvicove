import { useState } from 'react';
import { useWizardStore } from '../wizardStore';
import { BUSINESS_TYPES, BUSINESS_TYPE_BY_ID } from '../businessTypes';
import type { StoreMode } from '../../themes/types';

const MODES: { id: StoreMode; title: string; description: string }[] = [
  { id: 'store', title: 'Sell products', description: 'A storefront where customers browse and buy.' },
  { id: 'book', title: 'Take bookings', description: 'A booking page where customers schedule appointments.' },
  { id: 'both', title: 'Both', description: 'Sell products and take bookings from one site.' },
];

function TypeChip({ id, onPick }: { id: string; onPick: (id: string) => void }) {
  const businessType = useWizardStore((s) => s.businessType);
  const t = BUSINESS_TYPE_BY_ID[id];
  const selected = businessType === id;
  return (
    <button
      type="button"
      onClick={() => onPick(id)}
      aria-pressed={selected}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
        selected ? 'border-gray-900 bg-gray-900 font-medium text-white' : 'border-gray-200 text-gray-800 hover:border-gray-400'
      }`}
    >
      <span>{t.emoji}</span>
      {t.label}
    </button>
  );
}

export default function Step2_Mode() {
  const businessType = useWizardStore((s) => s.businessType);
  const mode = useWizardStore((s) => s.mode);
  const setMode = useWizardStore((s) => s.setMode);
  const setBusinessType = useWizardStore((s) => s.setBusinessType);
  const industry = useWizardStore((s) => s.industry);
  const setIndustry = useWizardStore((s) => s.setIndustry);
  // Once they have said how the site works, picking a business type must not change it back
  const [modeChosen, setModeChosen] = useState(false);

  const products = BUSINESS_TYPES.filter((t) => t.group === 'products');
  const services = BUSINESS_TYPES.filter((t) => t.group === 'services');
  const chosen = BUSINESS_TYPE_BY_ID[businessType];
  const showProducts = mode !== 'book';
  const showServices = mode !== 'store';

  function pickMode(m: StoreMode) {
    setModeChosen(true);
    setMode(m);
  }
  function pickType(id: string) {
    const keep = modeChosen ? mode : null;
    setBusinessType(id);
    if (keep) setMode(keep);
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">How will your site work?</h2>
        <p className="mt-1 text-sm text-gray-500">You can change everything later.</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => pickMode(m.id)}
              aria-pressed={mode === m.id}
              className={`rounded-lg border p-2.5 text-center transition sm:p-3 sm:text-left ${
                mode === m.id ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="text-sm font-medium text-gray-900">{m.title}</p>
              <p className="mt-0.5 hidden text-xs text-gray-500 sm:block">{m.description}</p>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500 sm:hidden">{MODES.find((m) => m.id === mode)?.description}</p>
      </div>

      <div>
        <h3 className="text-base font-semibold text-gray-900">What kind of business do you run?</h3>
        <p className="mt-0.5 text-sm text-gray-500">Pick the closest one and we'll set things up for you.</p>

        <div className="mt-3 flex flex-col gap-3">
          {showProducts && (
            <div>
              {mode === 'both' && <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Products</p>}
              <div className="flex flex-wrap gap-2">
                {products.map((t) => <TypeChip key={t.id} id={t.id} onPick={pickType} />)}
              </div>
            </div>
          )}
          {showServices && (
            <div>
              {mode === 'both' && <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Services (appointments)</p>}
              <div className="flex flex-wrap gap-2">
                {services.map((t) => <TypeChip key={t.id} id={t.id} onPick={pickType} />)}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <TypeChip id="other" onPick={pickType} />
          </div>
          {businessType === 'other' && (
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="Tell us what you do, e.g. dog grooming"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-base focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          )}
        </div>

        {chosen && chosen.starterServices.length > 0 && mode !== 'store' && (
          <p className="mt-3 text-xs text-blue-700">
            We'll add a starter list of {chosen.label.toLowerCase()} services for you to edit later in the setup.
          </p>
        )}
      </div>
    </div>
  );
}
