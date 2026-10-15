import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import type { Tenant } from '../types';
import { THEME_LABEL } from '../wizard/planGate';

/** Shown on Starter when the owner picked a Pro theme during setup: one click to Billing, and it switches on after the upgrade */
export default function PendingThemeBanner({ tenant }: { tenant: Tenant }) {
  if (!tenant.desired_theme_id || tenant.plan !== 'starter') return null;
  const name = THEME_LABEL[tenant.desired_theme_id] ?? tenant.desired_theme_id;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Sparkles size={20} className="mt-0.5 shrink-0 text-amber-600" />
        <div>
          <p className="font-semibold text-slate-900">Your {name} theme is ready</p>
          <p className="text-sm text-slate-600">You picked it while setting up. Upgrade to Pro and it goes live on your site right away.</p>
        </div>
      </div>
      <Link to="/dashboard/billing" className="inline-flex shrink-0 items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">See Pro</Link>
    </div>
  );
}
