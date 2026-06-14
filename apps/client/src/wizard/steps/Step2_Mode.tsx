import { useWizardStore } from '../wizardStore';
import type { StoreMode } from '../../themes/types';

const OPTIONS: { id: StoreMode; title: string; description: string; emoji: string }[] = [
  {
    id: 'store',
    title: 'Sell products',
    description: 'A storefront where customers browse and buy your products.',
    emoji: '🛍️',
  },
  {
    id: 'book',
    title: 'Take bookings',
    description: 'A booking page where customers schedule appointments.',
    emoji: '📅',
  },
  {
    id: 'both',
    title: 'Both',
    description: 'Sell products and take bookings from one site.',
    emoji: '✨',
  },
];

export default function Step2_Mode() {
  const mode = useWizardStore((s) => s.mode);
  const setMode = useWizardStore((s) => s.setMode);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">What does your site do?</h2>
        <p className="mt-1 text-sm text-gray-500">
          You can change this later — pick whatever fits best for now.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setMode(option.id)}
            className={`flex items-start gap-4 rounded-xl border p-4 text-left transition ${
              mode === option.id
                ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="text-2xl">{option.emoji}</span>
            <div>
              <p className="font-medium text-gray-900">{option.title}</p>
              <p className="mt-1 text-sm text-gray-500">{option.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
