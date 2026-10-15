import { useWizardStore, selectWizardCompleteness } from '../wizardStore';
import { FREE_THEME_FOR, PREMIUM_THEME_IDS, THEME_LABEL, planIssues, useStarterLimits } from '../planGate';

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
  const setStep = useWizardStore((s) => s.setStep);
  const completeness = useWizardStore(selectWizardCompleteness);
  const setPlan = useWizardStore((s) => s.setPlan);
  const setThemeId = useWizardStore((s) => s.setThemeId);
  const desiredThemeId = useWizardStore((s) => s.desiredThemeId);
  const setDesiredThemeId = useWizardStore((s) => s.setDesiredThemeId);
  const limits = useStarterLimits();
  const issues = planIssues({ plan, themeId, products, services, mode }, limits);
  const themeIssue = issues.find((i) => i.kind === 'theme');
  const limitIssues = issues.filter((i) => i.kind !== 'theme');

  const starterLeft = services.filter((sv) => sv.starter).length;
  const missing: { label: string; step: number }[] = [];
  if (!completeness.businessNameDone) missing.push({ label: 'Business name', step: 1 });
  if (!completeness.modeDone) missing.push({ label: 'Store type', step: 2 });
  if (!completeness.themeDone) missing.push({ label: 'Theme', step: 4 });
  if (!completeness.brandInfoDone) missing.push({ label: 'Tagline and city', step: 5 });
  if (!completeness.heroPhotoDone) missing.push({ label: 'Hero photo', step: 6 });
  if (!completeness.catalogDone) {
    missing.push({ label: mode === 'book' ? 'Services' : mode === 'store' ? 'Products' : 'Products or services', step: mode === 'book' ? 8 : 7 });
  }
  if (!completeness.availabilityDone) missing.push({ label: 'Availability', step: 9 });
  if (!completeness.planDone) missing.push({ label: 'Plan', step: 3 });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Review &amp; launch</h2>
        <p className="mt-1 text-sm text-gray-500">
          Take a final look before your site goes live at shopsuitedirect.com/{slug || '...'}.
        </p>
      </div>

      <div className="flex flex-col divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        <SummaryRow label="Business name" value={businessName || '—'} />
        <SummaryRow label="Site address" value={slug ? `shopsuitedirect.com/${slug}` : '—'} />
        <SummaryRow label="Store type" value={MODE_LABELS[mode] ?? mode} />
        <SummaryRow label="Theme" value={themeId} />
        {mode !== 'book' && <SummaryRow label="Products" value={`${products.length} added`} />}
        {mode !== 'store' && <SummaryRow label="Services" value={`${services.length} added`} />}
        <SummaryRow
          label="Payments"
          value={stripeConnected ? 'Connected' : 'Next, right after launch (about 5 min)'}
        />
        <SummaryRow label="Plan" value={PLAN_LABELS[plan] ?? plan} />
      </div>

      {issues.length > 0 && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
          <p className="text-base font-semibold text-amber-900">Your store needs Pro for:</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-amber-900">
            {issues.map((i) => <li key={i.kind}>{i.label}</li>)}
          </ul>
          <p className="mt-2 text-sm text-amber-800">Upgrade and launch exactly as you built it, or launch free and keep what you picked for later.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button type="button" onClick={() => setPlan('pro')} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">Upgrade to Pro, $29/mo</button>
            {themeIssue && (
              <button
                type="button"
                onClick={() => { setDesiredThemeId(themeId); setThemeId(FREE_THEME_FOR[themeId] ?? 'editorial'); }}
                className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
              >
                Launch free with {THEME_LABEL[FREE_THEME_FOR[themeId]] ?? 'a free look'} (keep {THEME_LABEL[themeId] ?? 'this theme'} for later)
              </button>
            )}
            {limitIssues.some((i) => i.kind === 'products') && (
              <button type="button" onClick={() => setStep(7)} className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100">Trim my products</button>
            )}
            {limitIssues.some((i) => i.kind === 'services') && (
              <button type="button" onClick={() => setStep(8)} className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100">Trim my services</button>
            )}
          </div>
        </div>
      )}

      {plan === 'starter' && desiredThemeId && PREMIUM_THEME_IDS.has(desiredThemeId) && issues.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          We'll keep <strong>{THEME_LABEL[desiredThemeId] ?? desiredThemeId}</strong> ready for you. Upgrade to Pro anytime and it switches on instantly.
        </div>
      )}

      {plan !== 'starter' && PREMIUM_THEME_IDS.has(themeId) && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          Your site launches right away, and <strong>{THEME_LABEL[themeId] ?? themeId}</strong> switches on as soon as your {plan === 'pro' ? 'Pro' : 'Business'} payment goes through.
        </div>
      )}

      {starterLeft > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          {starterLeft} of your services are still starter examples with sample prices.{' '}
          <button type="button" onClick={() => setStep(8)} className="underline hover:text-blue-700">
            Check your services
          </button>{' '}
          before you launch.
        </div>
      )}

      {missing.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-sm font-medium text-amber-800">
            A few things need attention before you can launch:
          </p>
          <ul className="flex flex-col gap-1">
            {missing.map((m) => (
              <li key={m.label}>
                <button
                  type="button"
                  onClick={() => setStep(m.step)}
                  className="text-sm text-amber-700 underline hover:text-amber-900"
                >
                  {m.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          When you're ready, click "Launch my site" below. We'll create your storefront and
          you'll get a link to share right away.
        </p>
      )}
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
