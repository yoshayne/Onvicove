import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Store,
  CheckCircle2,
  Camera,
  CreditCard,
  Clock,
  ChevronDown,
  ChevronUp,
  Palette,
  Package,
  Calendar,
  Users,
} from 'lucide-react';
import { useState } from 'react';

const BRAND = '#7C3AED'; // violet-700

// ── Wizard steps ──────────────────────────────────────────────────────────────

const WIZARD_STEPS = [
  { n: 1, title: 'Business name', desc: 'Your store\'s name and public URL slug' },
  { n: 2, title: 'Store type', desc: 'Products only, bookings only, or both' },
  { n: 3, title: 'Theme', desc: 'Choose from 12 designer templates' },
  { n: 4, title: 'Brand', desc: 'Tagline, logo, favicon, brand color, city' },
  { n: 5, title: 'Hero photo', desc: 'The main image on your storefront' },
  { n: 6, title: 'Products', desc: 'Add items with name, price, and photo' },
  { n: 7, title: 'Services', desc: 'Add bookable services with duration and price' },
  { n: 8, title: 'Availability', desc: 'Set your weekly schedule for bookings' },
  { n: 9, title: 'Payments', desc: 'Connect Stripe to accept payments (or skip)' },
  { n: 10, title: 'Plan', desc: 'Choose Starter (free), Pro ($29/mo), or Business ($79/mo)' },
  { n: 11, title: 'Launch', desc: 'Review and go live' },
];

// ── Checklist items ───────────────────────────────────────────────────────────

const CHECKLISTS = [
  {
    icon: Palette,
    title: 'Your Brand',
    color: 'violet',
    items: [
      'Business name',
      'One-line tagline (e.g. "Handmade goods for a slower life")',
      'City / location (optional but recommended)',
      'Industry (e.g. Beauty, Food, Fashion, Wellness)',
      'Brand color (hex code or just pick in the wizard)',
    ],
  },
  {
    icon: Camera,
    title: 'Photos & Visuals',
    color: 'sky',
    items: [
      'Hero image — landscape, 1200×800px min, shows your product/vibe',
      'Logo — PNG with transparent background (optional)',
      'Favicon — small square icon (optional)',
      'Product photos — square, good lighting, 800×800px min',
      'Service photos — optional, 16:9 aspect ratio',
    ],
  },
  {
    icon: Package,
    title: 'Products & Services',
    color: 'emerald',
    items: [
      'Product names + short descriptions',
      'Pricing for each product (enter in dollars)',
      'Service names + descriptions',
      'Duration per service (in minutes)',
      'Deposit amounts (if you require a deposit to book)',
    ],
  },
  {
    icon: Clock,
    title: 'Your Availability',
    color: 'amber',
    note: 'If taking bookings',
    items: [
      'Weekly schedule — which days and hours you\'re open',
      'Your staff list (name + email) if you have a team',
    ],
  },
];

const COLOR_MAP: Record<string, { bg: string; border: string; icon: string; badge: string; badgeText: string }> = {
  violet: {
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    icon: 'text-violet-600',
    badge: 'bg-violet-100',
    badgeText: 'text-violet-700',
  },
  sky: {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    icon: 'text-sky-600',
    badge: 'bg-sky-100',
    badgeText: 'text-sky-700',
  },
  emerald: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: 'text-emerald-600',
    badge: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-600',
    badge: 'bg-amber-100',
    badgeText: 'text-amber-700',
  },
};

// ── FAQ ───────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'Can I skip steps and come back?',
    a: 'Yes, you can save progress and return anytime. Your work is automatically saved as you go.',
  },
  {
    q: 'Do I need to connect Stripe right away?',
    a: 'No. You can launch your site and add payments later from the dashboard. Stripe setup is optional during the wizard.',
  },
  {
    q: "What's the difference between Starter, Pro, and Business?",
    a: 'Starter is free with a 5% platform fee. Pro ($29/mo) removes the fee and unlocks premium themes. Business ($79/mo) adds multi-staff, advanced analytics, and priority support.',
  },
  {
    q: 'Can I change my theme after launching?',
    a: 'Yes, switch themes anytime from your dashboard with one click. Your content stays intact.',
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        {q}
        {open ? (
          <ChevronUp size={16} className="shrink-0 text-slate-400" />
        ) : (
          <ChevronDown size={16} className="shrink-0 text-slate-400" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-slate-600 border-t border-slate-100 pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Guide() {
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: BRAND }}>
              <Store size={14} className="text-white" />
            </div>
            <span className="text-base font-bold tracking-tight">Shop Suite Direct</span>
          </Link>
          <Link to="/sign-in" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Sign in
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-20 pb-16 text-center px-6" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 100%)' }}>
        <div className="mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-xs font-semibold text-violet-700 mb-8">
            10-step setup · No credit card required
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.05] mb-6">
            Be ready to launch<br />
            <span style={{ color: BRAND }}>in 10 minutes.</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto mb-10">
            Before you build your site, gather a few things. Most builders take about 10 minutes once they're prepared — here's everything you'll need.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/sign-up"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-bold text-white shadow-lg hover:opacity-90 transition-opacity"
              style={{ background: BRAND }}
            >
              Start building <ArrowRight size={16} />
            </Link>
            <Link
              to="/sign-in"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── How the wizard works ── */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">How the wizard works</h2>
            <p className="mt-3 text-slate-500">11 quick steps. Most take under a minute each.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {WIZARD_STEPS.map((step) => (
              <div
                key={step.n}
                className="flex items-start gap-4 bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 hover:shadow-md transition-shadow"
              >
                <div
                  className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-sm font-bold text-white mt-0.5"
                  style={{ background: BRAND }}
                >
                  {step.n}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{step.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What to gather ── */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">What to gather before you start</h2>
            <p className="mt-3 text-slate-500">Having these ready means zero stops during setup.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {CHECKLISTS.map((card) => {
              const c = COLOR_MAP[card.color];
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className={`rounded-2xl border ${c.border} ${c.bg} p-6`}
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-white border ${c.border} shadow-sm`}>
                      <Icon size={18} className={c.icon} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">{card.title}</h3>
                      {card.note && (
                        <span className={`text-[10px] font-semibold uppercase tracking-wide ${c.badgeText}`}>
                          {card.note}
                        </span>
                      )}
                    </div>
                  </div>
                  <ul className="flex flex-col gap-3">
                    {card.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <CheckCircle2 size={15} className={`${c.icon} shrink-0 mt-0.5`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Stripe section ── */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-600 shadow-sm">
              <CreditCard size={20} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Connecting Stripe for payments</h2>
          </div>
          <p className="text-slate-600 mb-6 leading-relaxed">
            Stripe lets you accept real payments from customers — for products, services, and deposits. You can skip it during the wizard and add it later from your dashboard. Stripe setup takes about 5 minutes and happens after the wizard. You'll be redirected to Stripe's secure onboarding.
          </p>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4">What Stripe will ask for:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                'Legal business name (or personal name for sole proprietors)',
                'Business type: Individual, Company, or Non-profit',
                'Business address',
                'Phone number',
                'SSN (last 4 digits for individuals in the US) or EIN for companies',
                'Bank account routing + account number (for payouts)',
                'Government-issued ID may be required for identity verification',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <CheckCircle2 size={15} className="text-indigo-500 shrink-0 mt-0.5" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
            <span className="text-base mt-0.5">💡</span>
            <p>
              <strong>You can skip Stripe entirely</strong> and still launch your site. Add payments later once you're ready — everything else works without it.
            </p>
          </div>
        </div>
      </section>

      {/* ── Plans quick ref ── */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight">Plans at a glance</h2>
            <p className="mt-3 text-slate-500">You'll choose your plan in step 10. Here's a quick look.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {
                name: 'Starter',
                price: 'Free',
                priceNote: 'forever',
                highlight: false,
                desc: '5% platform fee on sales',
                perks: ['Free subdomain', 'Up to 5 products or services', 'Basic analytics', 'Stripe payments'],
              },
              {
                name: 'Pro',
                price: '$29',
                priceNote: '/mo',
                highlight: true,
                badge: 'Most Popular',
                desc: 'No platform fee',
                perks: ['Custom domain', 'Unlimited products & services', 'All 12 themes', 'Discount codes', 'AI product photos'],
              },
              {
                name: 'Business',
                price: '$79',
                priceNote: '/mo',
                highlight: false,
                desc: 'No platform fee',
                perks: ['Everything in Pro', 'Multi-staff accounts', 'Advanced analytics', 'Booking deposits', 'Priority support'],
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-6 relative ${
                  plan.highlight
                    ? 'border-violet-400 shadow-xl shadow-violet-100'
                    : 'border-slate-200 shadow-sm'
                }`}
              >
                {'badge' in plan && plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-block rounded-full px-3 py-0.5 text-xs font-bold text-white" style={{ background: BRAND }}>
                      {plan.badge}
                    </span>
                  </div>
                )}
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{plan.name}</p>
                <div className="flex items-baseline gap-0.5 mb-1">
                  <span className="text-3xl font-extrabold text-slate-900">{plan.price}</span>
                  <span className="text-sm text-slate-400">{plan.priceNote}</span>
                </div>
                <p className="text-xs text-slate-500 mb-4">{plan.desc}</p>
                <ul className="flex flex-col gap-2">
                  {plan.perks.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 size={14} className="text-violet-500 shrink-0 mt-0.5" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="mx-auto max-w-2xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight">Quick questions</h2>
          </div>
          <div className="flex flex-col gap-3">
            {FAQS.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="py-20 px-6 text-center" style={{ background: '#1e1b4b' }}>
        <div className="mx-auto max-w-xl">
          <h2 className="text-4xl font-extrabold text-white tracking-tight mb-4">
            Ready? Let's build.
          </h2>
          <p className="text-indigo-300 mb-8">
            Everything you need is ready. Your site is 10 minutes away.
          </p>
          <Link
            to="/sign-up"
            className="inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-bold text-white shadow-lg hover:opacity-90 transition-opacity"
            style={{ background: BRAND }}
          >
            Start building <ArrowRight size={18} />
          </Link>
          <p className="text-indigo-400 text-xs mt-4">No credit card required</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-100 py-8 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: BRAND }}>
              <Store size={10} className="text-white" />
            </div>
            <span className="font-semibold text-slate-600">Shop Suite Direct</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Shop Suite Direct. All rights reserved.</p>
          <div className="flex gap-5">
            <a href="#" className="hover:text-slate-700 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-700 transition-colors">Terms</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
