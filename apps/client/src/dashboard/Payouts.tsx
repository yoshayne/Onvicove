import StripeStatusCard from '../components/stripe/StripeStatusCard';

export default function Payouts() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-slate-900">Payouts</h1>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Payment setup</h2>
        <StripeStatusCard showWhenReady />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Recent transactions</h2>
        <p className="text-sm text-slate-500">Transaction history will appear here once available.</p>
      </div>
    </div>
  );
}
