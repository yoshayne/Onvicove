import { useWizardStore } from '../wizardStore';
import { BUSINESS_TYPES, BUSINESS_TYPE_BY_ID } from '../businessTypes';
import type { StoreMode } from '../../themes/types';

const MODES: { id: StoreMode; title: string; description: string }[] = [
  { id: 'store', title: 'Sell products', description: 'A storefront where customers browse and buy.' },
  { id: 'book', title: 'Take bookings', description: 'A booking page where customers schedule appointments.' },
  { id: 'both', title: 'Both', description: 'Sell products and take bookings from one site.' },
];

function TypeButton({ id }: { id: string }) {
  const businessType = useWizardStore((s) => s.businessType);
  const setBusinessType = useWizardStore((s) => s.setBusinessType);
  const t = BUSINESS_TYPE_BY_ID[id];
  const selected = businessType === id;
  return (
    <button
      type="button"
      onClick={() => setBusinessType(id)}
      aria-pressed={selected}
      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
        selected ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <span className="text-xl">{t.emoji}</span>
      <span className="text-sm font-medium text-gray-900">{t.label}</span>
    </button>
  );
}

export default function Step2_Mode() {
  const businessType = useWizardStore((s) => s.businessType);
  const mode = useWizardStore((s) => s.mode);
  const setMode = useWizardStore((s) => s.setMode);
  const industry = useWizardStore((s) => s.industry);
  const setIndustry = useWizardStore((s) => s.setIndustry);

  const products = BUSINESS_TYPES.filter((t) => t.group === 'products');
  const services = BUSINESS_TYPES.filter((t) => t.group === 'services');
  const chosen = BUSINESS_TYPE_BY_ID[businessType];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">What kind of business do you run?</h2>
        <p className="mt-1 text-sm text-gray-500">
          Pick the closest one. We'll suggest a look that fits and set things up for you. You can change everything later.
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">I sell products</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {products.map((t) => (
            <TypeButton key={t.id} id={t.id} />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">I offer services (appointments)</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {services.map((t) => (
            <TypeButton key={t.id} id={t.id} />
          ))}
        </div>
      </div>

      <div>
        <TypeButton id="other" />
        {businessType === 'other' && (
          <input
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="Tell us what you do, e.g. dog grooming"
            className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-base focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        )}
      </div>

      {businessType && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-gray-900">How will your site work?</p>
          {chosen && chosen.id !== 'other' && (
            <p className="mt-0.5 text-xs text-gray-500">
              For {chosen.label.toLowerCase()} we usually set it up like this. Change it if yours is different.
            </p>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                aria-pressed={mode === m.id}
                className={`rounded-lg border p-3 text-left transition ${
                  mode === m.id ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-sm font-medium text-gray-900">{m.title}</p>
                <p className="mt-0.5 text-xs text-gray-500">{m.description}</p>
              </button>
            ))}
          </div>
          {chosen && chosen.starterServices.length > 0 && mode !== 'store' && (
            <p className="mt-3 text-xs text-blue-700">
              We'll add a starter list of {chosen.label.toLowerCase()} services for you to edit later in the setup.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
