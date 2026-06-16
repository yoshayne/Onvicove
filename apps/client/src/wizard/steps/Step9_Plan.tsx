import { useWizardStore, type PlanId } from '../wizardStore';

interface PlanOption {
  id: PlanId;
  name: string;
  price: string;
  description: string;
  features: string[];
}

const PLANS: PlanOption[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$0/mo',
    description: 'Everything you need to get online and start selling.',
    features: [
      'Online store or booking page',
      'Up to 25 products or services',
      'Standard themes',
      'Shop Suite Direct branding',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29/mo',
    description: 'For growing businesses ready to look fully custom.',
    features: [
      'Unlimited products & services',
      'All premium themes',
      'Remove Shop Suite Direct branding',
      'AI photo generation credits',
      'Priority support',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: '$79/mo',
    description: 'Advanced tools for multi-location and high-volume teams.',
    features: [
      'Everything in Pro',
      'Multiple staff & locations',
      'Advanced analytics',
      'Custom domain',
      'Lower transaction fees',
    ],
  },
];

export default function Step9_Plan() {
  const plan = useWizardStore((s) => s.plan);
  const setPlan = useWizardStore((s) => s.setPlan);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Choose your plan</h2>
        <p className="mt-1 text-sm text-gray-500">
          You can change plans anytime from your dashboard. Start free, upgrade when you're
          ready.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {PLANS.map((option) => {
          const isSelected = plan === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setPlan(option.id)}
              className={`rounded-xl border p-4 text-left transition ${
                isSelected
                  ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-gray-900">{option.name}</span>
                <span className="text-base font-semibold text-gray-900">{option.price}</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">{option.description}</p>
              <ul className="mt-3 flex flex-col gap-1">
                {option.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-green-600">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
    </div>
  );
}
