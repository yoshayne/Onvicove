import { useEffect, useState } from 'react';
import { useApi } from '../../lib/api';

export type Operating = 'solo' | 'solo_ein' | 'company';

export interface StripeDetails {
  business_type: 'individual' | 'company';
  operating?: Operating;
  phone?: string;
  mcc?: string;
  product_description?: string;
  address?: { line1: string; line2?: string; city: string; state: string; postal_code: string; country: string };
}

interface Props {
  submitLabel: string;
  busy?: boolean;
  onSubmit: (details: StripeDetails) => void;
  /** Shows a "Do this later" button */
  onLater?: () => void;
}

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900';

const CHOICES: { id: Operating; title: string; blurb: string; ready: string[] }[] = [
  {
    id: 'solo',
    title: 'Just me',
    blurb: 'I work for myself. No registered company.',
    ready: ['Your government ID (driver\'s license works)', 'The last 4 digits of your Social Security number', 'Your date of birth and home address', 'Your bank account (or debit card) for payouts'],
  },
  {
    id: 'solo_ein',
    title: 'Just me, with an EIN',
    blurb: 'I work for myself and have a tax ID (EIN) from the IRS.',
    ready: ['Your EIN (the number on your IRS letter)', 'Your government ID', 'The last 4 digits of your Social Security number', 'Your date of birth, home address and bank account'],
  },
  {
    id: 'company',
    title: 'I have an LLC or company',
    blurb: 'My business is registered (LLC, corporation, partnership).',
    ready: ['Your business EIN and legal business name', 'Your business address', 'ID, date of birth and last 4 of SSN for the person who runs the business', 'The business bank account'],
  },
];

/**
 * Collects what Stripe asks first, in plain words, and passes it on so the owner doesn't retype it on Stripe.
 * Identity data (date of birth, SSN, EIN, bank) is intentionally NOT collected here: Stripe asks for it on its own
 * page, so we tell them what to have ready instead.
 */
export default function StripeDetailsForm({ submitLabel, busy, onSubmit, onLater }: Props) {
  const api = useApi();
  const [options, setOptions] = useState<{ mcc: string; label: string }[]>([]);
  const [operating, setOperating] = useState<Operating>('solo');
  const [d, setD] = useState<Omit<StripeDetails, 'business_type' | 'operating'>>({});
  const [addr, setAddr] = useState({ line1: '', line2: '', city: '', state: '', postal_code: '', country: 'US' });
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    api
      .get<{ details: StripeDetails; mcc_options: { mcc: string; label: string }[] }>('/stripe/business-details')
      .then((res) => {
        setOptions(res.mcc_options);
        const { business_type, operating: saved, ...rest } = res.details;
        setOperating(saved ?? (business_type === 'company' ? 'company' : 'solo'));
        setD(rest);
        if (rest.address) setAddr({ line2: '', ...rest.address });
        if (rest.phone || rest.address) setShowMore(true);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chosen = CHOICES.find((c) => c.id === operating) ?? CHOICES[0];
  const hasAddr = addr.line1 && addr.city && addr.state && addr.postal_code;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      business_type: operating === 'company' ? 'company' : 'individual',
      operating,
      ...(d.phone ? { phone: d.phone } : {}),
      ...(d.mcc ? { mcc: d.mcc } : {}),
      ...(hasAddr ? { address: { ...addr, line2: addr.line2 || undefined } } : {}),
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-900">How do you run your business?</p>
        <div className="flex flex-col gap-2">
          {CHOICES.map((c) => (
            <label
              key={c.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition ${
                operating === c.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-400'
              }`}
            >
              <input type="radio" name="operating" checked={operating === c.id} onChange={() => setOperating(c.id)} className="mt-1" />
              <span>
                <span className="block text-sm font-medium text-slate-900">{c.title}</span>
                <span className="block text-xs text-slate-500">{c.blurb}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-sm font-semibold text-blue-900">Have these ready (about 5 minutes)</p>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-blue-900">
          {chosen.ready.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-blue-800">
          Stripe, the company that handles payments for millions of businesses, asks for this to protect you and your customers. It goes straight to Stripe. We never see or store it. Stripe saves your progress, so you can stop and come back.
        </p>
      </div>

      <div>
        <button type="button" onClick={() => setShowMore(!showMore)} className="text-sm font-medium text-slate-700 underline">
          {showMore ? 'Hide' : 'Save time: add these now so Stripe is pre-filled'}
        </button>
        {showMore && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
              What do you sell?
              <select className={input} value={d.mcc ?? ''} onChange={(e) => setD({ ...d, mcc: e.target.value || undefined })}>
                <option value="">Choose…</option>
                {options.map((o) => (
                  <option key={o.mcc} value={o.mcc}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
              Business phone
              <input className={input} type="tel" autoComplete="tel" value={d.phone ?? ''} onChange={(e) => setD({ ...d, phone: e.target.value })} placeholder="(555) 123-4567" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 sm:col-span-2">
              {operating === 'company' ? 'Business address' : 'Home or business address'}
              <input className={input} autoComplete="address-line1" value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} placeholder="Street address" />
            </label>
            <input className={`${input} sm:col-span-2`} autoComplete="address-line2" value={addr.line2} onChange={(e) => setAddr({ ...addr, line2: e.target.value })} placeholder="Apt, suite (optional)" />
            <input className={input} autoComplete="address-level2" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} placeholder="City" />
            <div className="grid grid-cols-2 gap-3">
              <input className={input} autoComplete="address-level1" value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} placeholder="State" />
              <input className={input} autoComplete="postal-code" value={addr.postal_code} onChange={(e) => setAddr({ ...addr, postal_code: e.target.value })} placeholder="ZIP" />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? 'Opening Stripe…' : submitLabel}
        </button>
        {onLater && (
          <button type="button" onClick={onLater} className="text-sm text-slate-500 hover:text-slate-800">
            Do this later
          </button>
        )}
      </div>
    </form>
  );
}
