import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { ArrowRight, Check, X, Store, Calendar, CreditCard, Sparkles, Receipt, ChevronRight } from 'lucide-react';
import ThemeShowcase from './ThemeShowcase';

const BRAND = '#7C3AED'; // violet-700

// ── Mini browser mockups for the 4 industry examples ─────────────────────────

function BrowserCard({ label, sublabel, children }: { label: string; sublabel: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-md flex flex-col">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 border-b border-slate-200">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <div className="flex-1 text-[9px] text-slate-400 text-center truncate bg-white rounded px-2 py-0.5 border border-slate-200 ml-1">
          {label.toLowerCase().replace(/\s/g, '')}.shopsuitedirect.com
        </div>
      </div>
      <div className="flex-1">{children}</div>
      <div className="border-t border-slate-100 px-3 py-2 bg-white">
        <p className="text-xs font-semibold text-slate-800">{label}</p>
        <p className="text-[11px] text-slate-400">{sublabel}</p>
      </div>
    </div>
  );
}

function HairStylistMockup() {
  return (
    <BrowserCard label="Luxe Hair Studio" sublabel="Bookings + Products">
      <div style={{ background: '#fff0f9', fontFamily: 'sans-serif' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #fce7f3', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 7, fontWeight: 700, color: '#9d174d', letterSpacing: '0.1em' }}>LUXE HAIR</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {['Services', 'Book', 'Shop'].map(t => <span key={t} style={{ fontSize: 5, color: '#9d174d' }}>{t}</span>)}
          </div>
        </div>
        {/* Hero with real photo */}
        <div style={{ position: 'relative', height: 72, overflow: 'hidden' }}>
          <img src="/landing/hair-hero.jpg" alt="Hair salon" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(131,24,77,0.75) 0%, rgba(131,24,77,0.2) 100%)', padding: '10px 10px' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 3 }}>Healthy hair.<br />Confident you.</div>
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              <div style={{ background: '#ec4899', color: '#fff', fontSize: 4.5, fontWeight: 700, padding: '2.5px 6px', borderRadius: 10 }}>Book Now</div>
              <div style={{ border: '1px solid rgba(255,255,255,0.7)', color: '#fff', fontSize: 4.5, fontWeight: 600, padding: '2.5px 6px', borderRadius: 10 }}>View Services</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '7px 10px', background: '#fff' }}>
          <div style={{ fontSize: 5, fontWeight: 700, color: '#374151', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Popular Services</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {[["Women's Cut", "$65", '/landing/hair-svc-1.jpg'], ["Balayage", "$180", '/landing/hair-svc-2.jpg']].map(([n, p, img]) => (
              <div key={n} style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid #fce7f3' }}>
                <img src={img} alt={n} style={{ width: '100%', height: 22, objectFit: 'cover' }} />
                <div style={{ padding: '3px 4px' }}>
                  <div style={{ fontSize: 4.5, fontWeight: 600, color: '#1f2937' }}>{n}</div>
                  <div style={{ fontSize: 4, color: '#ec4899', fontWeight: 700 }}>{p}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserCard>
  );
}

function FitnessCoachMockup() {
  return (
    <BrowserCard label="Peak Performance" sublabel="Bookings + Digital Products">
      <div style={{ background: '#0a0a0a', fontFamily: 'sans-serif' }}>
        <div style={{ background: '#111', borderBottom: '1px solid #222', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 7, fontWeight: 900, color: '#e8ff00', letterSpacing: '0.05em' }}>PEAK</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {['Programs', 'Book', 'Shop'].map(t => <span key={t} style={{ fontSize: 5, color: '#888' }}>{t}</span>)}
          </div>
        </div>
        {/* Hero with real photo */}
        <div style={{ position: 'relative', height: 72, overflow: 'hidden' }}>
          <img src="/landing/fitness-hero.jpg" alt="Fitness coach" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', padding: '10px 10px' }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Stronger<br />Every Day</div>
            <div style={{ marginTop: 6 }}>
              <div style={{ background: '#e8ff00', color: '#000', fontSize: 4.5, fontWeight: 800, padding: '2.5px 7px', borderRadius: 4, display: 'inline-block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Book a Free Call</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '7px 10px', background: '#111' }}>
          <div style={{ fontSize: 5, fontWeight: 700, color: '#e8ff00', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Programs</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {[["1:1 Coaching", "$150/mo", '/landing/fitness-prog-1.jpg'], ["Nutrition Plan", "$99/mo", '/landing/fitness-prog-2.jpg']].map(([n, p, img]) => (
              <div key={n} style={{ background: '#1a1a1a', borderRadius: 4, overflow: 'hidden' }}>
                <img src={img} alt={n} style={{ width: '100%', height: 18, objectFit: 'cover' }} />
                <div style={{ padding: '3px 4px' }}>
                  <div style={{ fontSize: 4.5, fontWeight: 700, color: '#fff' }}>{n}</div>
                  <div style={{ fontSize: 4, color: '#e8ff00', fontWeight: 700 }}>{p}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserCard>
  );
}

function CandleStoreMockup() {
  return (
    <BrowserCard label="Wick & Warm" sublabel="Products">
      <div style={{ background: '#fdf8f3', fontFamily: 'Georgia, serif' }}>
        <div style={{ background: '#fdf8f3', borderBottom: '1px solid #e8d5c4', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 7, fontWeight: 700, color: '#3d2b1f', letterSpacing: '0.12em' }}>WICK & WARM</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {['Shop', 'About', 'Cart'].map(t => <span key={t} style={{ fontSize: 5, color: '#7a5c46' }}>{t}</span>)}
          </div>
        </div>
        {/* Hero with real photo */}
        <div style={{ position: 'relative', height: 72, overflow: 'hidden' }}>
          <img src="/landing/candle-hero.jpg" alt="Candle store" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(61,43,31,0.5)', padding: '10px 10px' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 3 }}>Handcrafted<br />candles for<br />every moment.</div>
            <div style={{ marginTop: 4 }}>
              <div style={{ background: '#8b5e3c', color: '#fff', fontSize: 4.5, fontWeight: 700, padding: '2.5px 6px', borderRadius: 4, display: 'inline-block' }}>Shop Collection</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '7px 10px', background: '#fdf8f3' }}>
          <div style={{ fontSize: 5, fontWeight: 700, color: '#3d2b1f', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Best Sellers</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
            {[["Vanilla Cream", "$28", '/landing/candle-prod-1.jpg'], ["Sandalwood", "$28", '/landing/candle-prod-2.jpg'], ["Sea Salt", "$24", '/landing/candle-hero.jpg']].map(([n, p, img]) => (
              <div key={n} style={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #e8d5c4' }}>
                <img src={img} alt={n} style={{ width: '100%', height: 20, objectFit: 'cover' }} />
                <div style={{ padding: '3px 2px', background: '#fff' }}>
                  <div style={{ fontSize: 4, fontWeight: 600, color: '#3d2b1f' }}>{n}</div>
                  <div style={{ fontSize: 4, color: '#8b5e3c', fontWeight: 700 }}>{p}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserCard>
  );
}

function PhotographerMockup() {
  return (
    <BrowserCard label="Captured Moments" sublabel="Bookings + Products">
      <div style={{ background: '#fff', fontFamily: 'Georgia, serif' }}>
        <div style={{ background: '#1a3a5c', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 7, fontWeight: 700, color: '#c8a850', letterSpacing: '0.12em' }}>CAPTURED</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {['Portfolio', 'Sessions', 'Book'].map(t => <span key={t} style={{ fontSize: 5, color: 'rgba(255,255,255,0.7)' }}>{t}</span>)}
          </div>
        </div>
        {/* Hero with real photo */}
        <div style={{ position: 'relative', height: 72, overflow: 'hidden' }}>
          <img src="/landing/photo-hero.jpg" alt="Photography" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,58,92,0.65)', padding: '10px 10px' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 3, letterSpacing: '0.02em' }}>Timeless<br />photos.<br />Real stories.</div>
            <div style={{ marginTop: 4 }}>
              <div style={{ background: '#c8a850', color: '#fff', fontSize: 4.5, fontWeight: 700, padding: '2.5px 6px', borderRadius: 4, display: 'inline-block' }}>Book a Session</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '7px 10px', background: '#fff' }}>
          <div style={{ fontSize: 5, fontWeight: 700, color: '#1a3a5c', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Popular Sessions</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {[["Portrait Session", "$250", '/landing/photo-sess-1.jpg'], ["Family Session", "$350", '/landing/photo-sess-2.jpg']].map(([n, p, img]) => (
              <div key={n} style={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                <img src={img} alt={n} style={{ width: '100%', height: 22, objectFit: 'cover' }} />
                <div style={{ padding: '3px 4px' }}>
                  <div style={{ fontSize: 4.5, fontWeight: 600, color: '#1a3a5c' }}>{n}</div>
                  <div style={{ fontSize: 4, color: '#c8a850', fontWeight: 700 }}>{p}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserCard>
  );
}

// ── Wizard steps ──────────────────────────────────────────────────────────────

const WIZARD_STEPS = [
  { n: 1, icon: '🏪', title: 'Tell us your business', desc: "We'll tailor everything for your industry." },
  { n: 2, icon: '🎨', title: 'Pick a theme', desc: 'Choose from 6 beautiful designs.' },
  { n: 3, icon: '✏️', title: 'Add your brand', desc: 'Upload logo, choose colors, add a tagline.' },
  { n: 4, icon: '🛍️', title: 'Add products or services', desc: "We'll pre-fill suggestions to save you time." },
  { n: 5, icon: '📅', title: 'Set availability', desc: 'Add your hours and appointment types.' },
  { n: 6, icon: '💳', title: 'Connect payments', desc: 'Securely connect Stripe and get paid.' },
  { n: 7, icon: '🚀', title: 'Launch', desc: 'Review, choose a plan, and go live!' },
];

// ── Comparison table ──────────────────────────────────────────────────────────

const COMPARE_ROWS = [
  { feature: 'Sell products', shopify: true, calendly: false, squarespace: true },
  { feature: 'Take bookings', shopify: 'Apps', calendly: true, squarespace: 'Limited' },
  { feature: 'Stripe payments', shopify: true, calendly: false, squarespace: true },
  { feature: 'Customer management', shopify: true, calendly: false, squarespace: 'Limited' },
  { feature: 'AI product photos', shopify: false, calendly: false, squarespace: false },
  { feature: 'One monthly bill', shopify: false, calendly: false, squarespace: false },
];

function CompareCell({ val }: { val: boolean | string }) {
  if (val === true) return <Check size={16} className="mx-auto text-violet-600" />;
  if (val === false) return <X size={16} className="mx-auto text-slate-300" />;
  return <span className="text-xs text-slate-400">{val}</span>;
}

// ── Plans ─────────────────────────────────────────────────────────────────────

const PLANS = [
  {
    name: 'Free',
    badge: null,
    desc: 'Get started with no credit card required.',
    price: 'Free',
    priceNote: 'forever',
    features: ['Free subdomain', 'Up to 5 products or services', '1 theme', 'Stripe payments', 'Basic analytics'],
    cta: 'Start for free',
    highlight: false,
  },
  {
    name: 'Pro',
    badge: 'Most Popular',
    desc: 'Everything you need to grow your business.',
    price: null,
    priceNote: null,
    features: ['Custom domain included', 'Unlimited products & services', 'All 6 themes', 'AI product photos', 'Discount codes', 'Advanced analytics', 'Priority support'],
    cta: 'Get started',
    highlight: true,
  },
  {
    name: 'Business',
    badge: null,
    desc: 'For established businesses ready to scale.',
    price: null,
    priceNote: null,
    features: ['Everything in Pro', 'Multiple staff accounts', 'Custom domain', 'Booking deposits', 'Customer notes & tags', 'Dedicated support'],
    cta: 'Get started',
    highlight: false,
  },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function Landing() {
  const { isSignedIn } = useAuth();
  if (isSignedIn) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: BRAND }}>
              <Store size={14} className="text-white" />
            </div>
            <span className="text-base font-bold tracking-tight">ShopSuiteDirect</span>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#themes" className="hover:text-slate-900 transition-colors">Themes</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
            <Link to="/guide" className="hover:text-slate-900 transition-colors">Get prepared</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/sign-in" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Sign in
            </Link>
            <Link
              to="/onboarding"
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
              style={{ background: BRAND }}
            >
              Start free <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-16 pb-8 text-center px-6" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 100%)' }}>
        <div className="mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-xs font-semibold text-violet-700 mb-8">
            The Shopify + Calendly alternative
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.05] mb-6">
            One platform.<br />
            <span style={{ color: BRAND }}>Any business.</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto mb-8">
            Sell products, book appointments, and get paid —<br className="hidden sm:block" />
            all from one beautiful website.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <Link
              to="/onboarding"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-bold text-white shadow-lg hover:opacity-90 transition-opacity"
              style={{ background: BRAND }}
            >
              Build my website free <ArrowRight size={16} />
            </Link>
            <Link
              to="/guide"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              What do I need? <ArrowRight size={16} />
            </Link>
          </div>
          <p className="text-xs text-slate-400 mb-10">No credit card required · Takes about 10 minutes</p>

          {/* Feature pills */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: Store, label: 'Store' },
              { icon: Calendar, label: 'Bookings' },
              { icon: CreditCard, label: 'Payments' },
              { icon: Sparkles, label: 'AI Product Photos' },
              { icon: Receipt, label: 'One monthly bill' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
                <Check size={13} className="text-violet-600" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Industry mockups ── */}
      <section className="py-14 px-6">
        <div className="mx-auto max-w-6xl grid grid-cols-2 lg:grid-cols-4 gap-4">
          <HairStylistMockup />
          <FitnessCoachMockup />
          <CandleStoreMockup />
          <PhotographerMockup />
        </div>
      </section>

      {/* ── Launch steps ── */}
      <section className="py-20 px-6 bg-slate-50" id="features">
        <div className="mx-auto max-w-4xl text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight">Launch in 10 minutes</h2>
          <p className="mt-3 text-slate-500">Our simple step-by-step wizard gets you live — fast.</p>
        </div>
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            {WIZARD_STEPS.map((step, i) => (
              <div key={step.n} className="flex flex-col items-center text-center gap-2 relative">
                {i < WIZARD_STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-[calc(50%+28px)] right-0 h-px border-t-2 border-dashed border-violet-200 z-0" />
                )}
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm border-2 border-violet-100 bg-white z-10 relative">
                  {step.icon}
                </div>
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white -mt-1 z-10" style={{ background: BRAND }}>
                  {step.n}
                </div>
                <p className="text-xs font-semibold text-slate-800 leading-tight">{step.title}</p>
                <p className="text-[11px] text-slate-400 leading-snug">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Photos + Comparison table ── */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-6xl grid lg:grid-cols-2 gap-16 items-start">

          {/* AI Photos */}
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-200 px-3 py-1 text-xs font-bold text-violet-700 mb-4">
              <Sparkles size={11} /> AI-POWERED
            </div>
            <h3 className="text-2xl font-bold tracking-tight mb-3">Studio-quality product photos in seconds</h3>
            <p className="text-slate-500 mb-8">Upload a simple photo and our AI creates beautiful, professional images that sell.</p>
            <div className="flex gap-3">
              <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                <div className="bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-500 border-b border-slate-200">Before</div>
                <div className="h-36 overflow-hidden">
                  <img src="/landing/ai-before.jpg" alt="Product before AI" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shadow" style={{ background: BRAND }}>
                  <Sparkles size={12} className="text-white" />
                </div>
              </div>
              <div className="flex-1 rounded-xl overflow-hidden border-2 shadow-md" style={{ borderColor: BRAND + '40' }}>
                <div className="px-3 py-1.5 text-[10px] font-semibold border-b" style={{ background: BRAND + '10', color: BRAND, borderColor: BRAND + '30' }}>After</div>
                <div className="h-36 overflow-hidden">
                  <img src="/landing/ai-after.jpg" alt="Product after AI" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>

          {/* Comparison table */}
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-200 px-3 py-1 text-xs font-bold text-violet-700 mb-4">
              WHY BUSINESSES SWITCH
            </div>
            <h3 className="text-2xl font-bold tracking-tight mb-2">Everything you need. All in one place.<br />One platform. One monthly bill.</h3>
            <div className="mt-6 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 bg-slate-50">Feature</th>
                    <th className="px-3 py-3 text-xs font-semibold text-slate-400 bg-slate-50">Shopify</th>
                    <th className="px-3 py-3 text-xs font-semibold text-slate-400 bg-slate-50">Calendly</th>
                    <th className="px-3 py-3 text-xs font-semibold text-slate-400 bg-slate-50">Squarespace</th>
                    <th className="px-3 py-3 text-xs font-bold text-white rounded-t-none" style={{ background: BRAND }}>
                      Shop Suite Direct
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map((row, i) => (
                    <tr key={row.feature} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="px-4 py-2.5 text-xs font-medium text-slate-700">{row.feature}</td>
                      <td className="px-3 py-2.5 text-center"><CompareCell val={row.shopify} /></td>
                      <td className="px-3 py-2.5 text-center"><CompareCell val={row.calendly} /></td>
                      <td className="px-3 py-2.5 text-center"><CompareCell val={row.squarespace} /></td>
                      <td className="px-3 py-2.5 text-center" style={{ background: BRAND + '08' }}>
                        <Check size={16} className="mx-auto text-violet-600" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </section>

      {/* ── Theme showcase ── */}
      <section id="themes" className="bg-slate-50 py-4">
        <ThemeShowcase />
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-20 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">Everything included. One simple price.</h2>
            <p className="mt-3 text-slate-500">Start free, upgrade when you're ready.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-6 flex flex-col gap-4 relative ${
                  plan.highlight
                    ? 'border-violet-400 shadow-xl shadow-violet-100'
                    : 'border-slate-200 shadow-sm'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-block rounded-full px-3 py-0.5 text-xs font-bold text-white" style={{ background: BRAND }}>
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{plan.name}</p>
                  {plan.price ? (
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-slate-900">{plan.price}</span>
                      {plan.priceNote && <span className="text-sm text-slate-400">{plan.priceNote}</span>}
                    </div>
                  ) : (
                    <div className="mt-1">
                      <span className="text-lg font-bold text-slate-700">Contact us for pricing</span>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-slate-500">{plan.desc}</p>
                </div>
                <ul className="flex flex-col gap-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <Check size={14} className="mt-0.5 shrink-0 text-violet-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/onboarding"
                  className={`mt-2 w-full rounded-xl py-2.5 text-sm font-bold text-center transition-opacity hover:opacity-90 ${
                    plan.highlight ? 'text-white' : 'border border-slate-300 text-slate-800 hover:bg-slate-50'
                  }`}
                  style={plan.highlight ? { background: BRAND } : {}}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="py-16 px-6" style={{ background: '#1e1b4b' }}>
        <div className="mx-auto max-w-4xl flex flex-col lg:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Your business deserves better<br />than five different apps.</h2>
            <p className="mt-2 text-indigo-300">Store. Bookings. Payments. All in one place.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link
              to="/onboarding"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
              style={{ background: BRAND }}
            >
              Build my website free <ArrowRight size={14} />
            </Link>
          </div>
        </div>
        <div className="mx-auto max-w-4xl mt-8 pt-8 border-t border-white/10 grid grid-cols-3 gap-4">
          {[
            { icon: '🌐', title: 'Free subdomain', sub: 'Get started instantly' },
            { icon: '🔒', title: 'SSL & security included', sub: 'Your site is always protected' },
            { icon: '📋', title: 'No contracts, ever', sub: 'Cancel anytime, no hassle' },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <span className="text-xl">{item.icon}</span>
              <div>
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-indigo-300">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-100 py-8 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: BRAND }}>
              <Store size={10} className="text-white" />
            </div>
            <span className="font-semibold text-slate-600">ShopSuiteDirect</span>
          </div>
          <p>© {new Date().getFullYear()} Shop Suite Direct. All rights reserved.</p>
          <div className="flex gap-5">
            <a href="#" className="hover:text-slate-700 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-700 transition-colors">Terms</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
