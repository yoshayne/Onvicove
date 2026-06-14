import { useWizardStore } from '../wizardStore';

const MODE_LABELS: Record<string, string> = {
  store: 'Online store',
  book: 'Bookings',
  both: 'Store + bookings',
};

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
};

export default function Step10_Launch() {
  const businessName = useWizardStore((s) => s.businessName);
  const slug = useWizardStore((s) => s.slug);
  const mode = useWizardStore((s) => s.mode);
  const themeId = useWizardStore((s) => s.themeId);
  const products = useWizardStore((s) => s.products);
  const services = useWizardStore((s) => s.services);
  const plan = useWizardStore((s) => s.plan);
  const stripeConnected = useWizardStore((s) => s.stripeConnected);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Review &amp; launch</h2>
        <p className="mt-1 text-sm text-gray-500">
          Take a final look before your site goes live at onvicove.com/{slug || '...'}.
        </p>
      </div>

      <div className="flex flex-col divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        <SummaryRow label="Business name" value={businessName || '—'} />
        <SummaryRow label="Site address" value={slug ? `onvicove.com/${slug}` : '—'} />
        <SummaryRow label="Store type" value={MODE_LABELS[mode] ?? mode} />
        <SummaryRow label="Theme" value={themeId} />
        {mode !== 'book' && <SummaryRow label="Products" value={`${products.length} added`} />}
        {mode !== 'store' && <SummaryRow label="Services" value={`${services.length} added`} />}
        <SummaryRow
          label="Payments"
          value={stripeConnected ? 'Stripe connected' : 'Not connected'}
        />
        <SummaryRow label="Plan" value={PLAN_LABELS[plan] ?? plan} />
      </div>

      <p className="text-sm text-gray-500">
        When you're ready, click "Launch my site" below. We'll create your storefront and you'll
        get a link to share right away.
      </p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
