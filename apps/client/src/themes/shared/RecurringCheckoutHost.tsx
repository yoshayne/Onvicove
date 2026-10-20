import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { apiPost } from '../../lib/api';
import { formatPrice, type ThemeData } from '../types';
import StripePaymentForm from './StripePaymentForm';
import RecurringTerms from './RecurringTerms';
import { useRecurringCheckout } from './recurringCheckout';

const MAX_ATTEMPTS = 3;

/** The monthly-plan checkout: summary, authorization checkbox, then payment. Shown for any theme. */
export default function RecurringCheckoutHost({ theme }: { theme: ThemeData }) {
  const { isOpen, service, startTime, staffId, whenLabel, prefill, close } = useRecurringCheckout();
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [agree, setAgree] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pay, setPay] = useState<{ clientSecret: string; recurringId: string; stripeAccountId: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep('form'); setAgree(false); setShowTerms(false); setBusy(false); setError(null); setPay(null);
    setName(prefill?.name ?? ''); setEmail(prefill?.email ?? ''); setPhone(prefill?.phone ?? '');
  }, [isOpen, prefill]);

  if (!isOpen || !service) return null;

  const legal = theme.legalName?.trim() || theme.companyName;
  const price = formatPrice(service.priceCents, theme.currency);
  const isAppointment = service.recurringKind === 'appointment';
  const every = service.appointmentFrequency === 'biweekly' ? 'every 2 weeks' : 'every week';
  const planName = service.name.replace(/ · Monthly$/, '');
  const authText = `I authorize ${legal} to charge my selected payment method ${price} per month until I cancel. I understand the recurring billing and cancellation terms.`;

  async function start(e: FormEvent) {
    e.preventDefault();
    if (!agree || !theme.slug || !service) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiPost<{ recurring_id: string; client_secret: string; stripe_account_id: string }>(`/api/public/${theme.slug}/recurring`, {
        service_id: service.id,
        customer_name: name.trim(),
        customer_email: email.trim(),
        customer_phone: phone.trim() || null,
        start_time: isAppointment ? startTime : null,
        staff_id: staffId,
        authorized: true,
        authorization_text: authText,
      });
      setPay({ clientSecret: res.client_secret, recurringId: res.recurring_id, stripeAccountId: res.stripe_account_id });
      setStep('payment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not start the plan. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function paid() {
    if (pay) void apiPost('/api/public/plans/confirm', { recurring_id: pay.recurringId }).catch(() => {});
    setStep('success');
  }

  const field = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 outline-none focus:border-[var(--brand-color,#111111)]';

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={step === 'success' ? close : undefined}>
      <div role="dialog" aria-modal="true" aria-label={`Start ${planName}`} onClick={(e) => e.stopPropagation()} className="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white text-left text-gray-900 sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white p-4">
          <div>
            <h2 className="text-xl font-semibold">{planName}</h2>
            <p className="text-sm text-gray-500">{theme.companyName}</p>
          </div>
          <button type="button" aria-label="Close" onClick={close} className="text-gray-400 hover:text-gray-700"><X size={22} /></button>
        </div>

        {step === 'success' ? (
          <div className="flex flex-col gap-3 p-6 text-center">
            <p className="text-3xl">🎉</p>
            <h3 className="text-xl font-semibold">You're in!</h3>
            <p className="text-sm text-gray-600">Your plan is starting. We've emailed you a confirmation with a link to manage or cancel it anytime.</p>
            {isAppointment && whenLabel && <p className="text-sm text-gray-600">Your first session: <strong>{whenLabel}</strong>, repeating {every}.</p>}
            <button type="button" onClick={close} className="mt-2 rounded-lg bg-[var(--brand-color,#111111)] px-5 py-3 text-sm font-semibold text-white">Done</button>
          </div>
        ) : step === 'payment' && pay ? (
          <div className="flex flex-col gap-3 p-4">
            <p className="text-sm text-gray-600">{price}/month. Your first charge is {price} today.</p>
            <StripePaymentForm
              clientSecret={pay.clientSecret}
              stripeAccountId={pay.stripeAccountId}
              amountCents={service.priceCents}
              currency={theme.currency}
              payLabel={`Start plan · ${price} today`}
              onSuccess={paid}
              onCancel={() => setStep('form')}
            />
          </div>
        ) : (
          <form onSubmit={start} className="flex flex-col gap-4 p-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Monthly subscription</p>
              <p className="mt-1 text-3xl font-bold">{price}<span className="text-base font-medium text-gray-500">/month</span></p>
              <p className="mt-2 text-sm text-gray-600">Renews automatically every month until canceled. Your first charge is {price} today.</p>
              {isAppointment && whenLabel && (
                <p className="mt-2 text-sm text-gray-700">First session: <strong>{whenLabel}</strong>. Repeats {every} at the same time while your plan is active.</p>
              )}
              <p className="mt-2 text-xs text-gray-500">If a payment fails, we try again up to {MAX_ATTEMPTS} times, then the plan ends. If you cancel, the plan runs until the end of the month you've paid for.</p>
            </div>

            <div className="flex flex-col gap-2.5">
              <input className={field} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
              <input className={field} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
              <input className={field} type="tel" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
            </div>

            <label className="flex items-start gap-3 text-sm text-gray-800">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
              <span>{authText}</span>
            </label>
            <button type="button" onClick={() => setShowTerms((v) => !v)} className="-mt-2 self-start text-xs font-medium text-gray-500 underline">
              {showTerms ? 'Hide' : 'View'} recurring billing terms
            </button>
            {showTerms && <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3"><RecurringTerms legalName={legal} /></div>}

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={!agree || busy || !name.trim() || !email.trim()}
              className="rounded-full bg-[var(--brand-color,#111111)] px-5 py-3.5 text-sm font-bold uppercase tracking-widest text-white transition-opacity disabled:opacity-40"
            >
              {busy ? 'One moment…' : 'Continue to payment'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
