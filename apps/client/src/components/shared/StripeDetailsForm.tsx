import { useEffect, useState } from 'react';
import { useApi } from '../../lib/api';

export interface StripeDetails {
  business_type: 'individual' | 'company';
  phone?: string;
  mcc?: string;
  product_description?: string;
  address?: { line1: string; line2?: string; city: string; state: string; postal_code: string; country: string };
}

interface Props {
  submitLabel: string;
  busy?: boolean;
  onSubmit: (details: StripeDetails) => void;
}

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900';

/**
 * Collects the business details Stripe asks for first and passes them on, so the owner doesn't retype them on Stripe.
 * Identity data (date of birth, SSN, EIN, bank) is intentionally NOT collected here: Stripe asks for it on its own page.
 */
export default function StripeDetailsForm({ submitLabel, busy, onSubmit }: Props) {
  const api = useApi();
  const [options, setOptions] = useState<{ mcc: string; label: string }[]>([]);
  const [d, setD] = useState<StripeDetails>({ business_type: 'individual' });
  const [addr, setAddr] = useState({ line1: '', line2: '', city: '', state: '', postal_code: '', country: 'US' });

  useEffect(() => {
    api
      .get<{ details: StripeDetails; mcc_options: { mcc: string; label: string }[] }>('/stripe/business-details')
      .then((res) => {
        setOptions(res.mcc_options);
        setD((prev) => ({ ...prev, ...res.details }));
        if (res.details.address) setAddr({ line2: '', ...res.details.address });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasAddr = addr.line1 && addr.city && addr.state && addr.postal_code;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      business_type: d.business_type,
      ...(d.phone ? { phone: d.phone } : {}),
      ...(d.mcc ? { mcc: d.mcc } : {}),
      ...(hasAddr ? { address: { ...addr, line2: addr.line2 || undefined } } : {}),
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="text-sm text-slate-600">
        Fill these in once and we'll pass them to Stripe so you don't have to type them again. You can change anything on Stripe's page.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          Business type
          <select className={input} value={d.business_type} onChange={(e) => setD({ ...d, business_type: e.target.value as StripeDetails['business_type'] })}>
            <option value="individual">Just me (sole proprietor)</option>
            <option value="company">Registered company / LLC</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          What do you sell?
          <select className={input} value={d.mcc ?? ''} onChange={(e) => setD({ ...d, mcc: e.target.value || undefined })}>
            <option value="">Choose…</option>
            {options.map((o) => (
              <option key={o.mcc} value={o.mcc}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 sm:col-span-2">
          Business phone
          <input className={input} type="tel" autoComplete="tel" value={d.phone ?? ''} onChange={(e) => setD({ ...d, phone: e.target.value })} placeholder="(555) 123-4567" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 sm:col-span-2">
          Business address
          <input className={input} autoComplete="address-line1" value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} placeholder="Street address" />
        </label>
        <input className={`${input} sm:col-span-2`} autoComplete="address-line2" value={addr.line2} onChange={(e) => setAddr({ ...addr, line2: e.target.value })} placeholder="Apt, suite (optional)" />
        <input className={input} autoComplete="address-level2" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} placeholder="City" />
        <div className="grid grid-cols-2 gap-3">
          <input className={input} autoComplete="address-level1" value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} placeholder="State" />
          <input className={input} autoComplete="postal-code" value={addr.postal_code} onChange={(e) => setAddr({ ...addr, postal_code: e.target.value })} placeholder="ZIP" />
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Stripe will still ask for your date of birth, the last 4 digits of your SSN{d.business_type === 'company' ? ' and your EIN' : ''}, and your bank account directly. That information goes straight to Stripe — we never see it.
      </p>

      <button
        type="submit"
        disabled={busy}
        className="self-start rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? 'Redirecting…' : submitLabel}
      </button>
    </form>
  );
}
