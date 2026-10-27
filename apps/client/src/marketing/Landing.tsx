import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { ArrowRight, Check, CheckCircle2, ClipboardList, Store, Calendar, CreditCard, PartyPopper, Monitor, ShoppingCart } from 'lucide-react';
import ThemeShowcase from './ThemeShowcase';
import { CHECKLISTS, COLOR_MAP } from './Guide';

const BRAND = '#7C3AED';
const BRAND_2 = '#A855F7';

// ── Content ───────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  { label: 'Barbers', img: '/landing/hair-svc-1.jpg' },
  { label: 'Salons', img: '/landing/hair-hero.jpg' },
  { label: 'Fitness', img: '/landing/fitness-hero.jpg' },
  { label: 'Shops', img: '/landing/candle-hero.jpg' },
  { label: 'Photographers', img: '/landing/photo-hero.jpg' },
  { label: 'Wellness', img: '/landing/fitness-prog-2.jpg' },
];

const FEATURES = [
  { icon: Monitor, color: '#7C3AED', title: 'Website Builder', desc: '16 themes, professional and mobile ready.' },
  { icon: ShoppingCart, color: '#D946EF', title: 'Online Store', desc: 'Sell your products, ship or pick up.' },
  { icon: Calendar, color: '#3B82F6', title: 'Booking Calendar', desc: 'Clients book and pay for your services.' },
  { icon: CreditCard, color: '#22C55E', title: 'Payments', desc: 'Get paid securely, straight to your bank.' },
  { icon: PartyPopper, color: '#F59E0B', title: 'Built-in Growth', desc: 'Reminders, and a free flyer for your first sale.' },
];

const STEPS = [
  { icon: '🏪', title: 'Tell us your business', desc: 'We tailor the look, starter services and wording to your industry.' },
  { icon: '🎨', title: 'Pick a plan and try every theme', desc: 'Preview all 16 designs with your own name. Start free, upgrade anytime.' },
  { icon: '✏️', title: 'Add your brand and what you offer', desc: 'Logo, photos, products or services, and your hours.' },
  { icon: '🚀', title: 'Launch, then connect payments', desc: 'Your site goes live first. Connecting Stripe takes about 5 minutes.' },
];

const PLANS = [
  {
    name: 'Starter', price: '$0', desc: 'Everything you need to get online and start selling.', cta: 'Start free', highlight: false,
    features: ['Online store or booking page', 'Up to 5 products and 10 services', '9 free themes', 'Stripe payments', 'Free first-sale flyer'],
  },
  {
    name: 'Pro', price: '$29', desc: 'For growing businesses that want to look fully custom.', cta: 'Get Pro', highlight: true,
    features: ['Unlimited products and services', 'All 16 themes', 'Your own branding, not ours', 'AI product photos (10 credits)', 'Discount codes and analytics', 'Priority support'],
  },
  {
    name: 'Business', price: '$79', desc: 'Advanced tools for teams and high volume.', cta: 'Get Business', highlight: false,
    features: ['Everything in Pro', 'Multiple staff and locations', 'Your own custom domain', 'Lower payment fee (1%)', 'Advanced analytics', '50 AI photo credits'],
  },
];

const FAQ = [
  { q: 'Do I need my own domain?', a: 'No. You get a free address right away. You can connect your own domain on the Business plan.' },
  { q: 'How do I get paid?', a: 'Through Stripe, straight to your bank. Connecting takes about 5 minutes, right after you launch.' },
  { q: 'Can I try the paid themes first?', a: 'Yes. Preview every theme with your own details. You only pay if you want to publish a Pro theme.' },
  { q: 'Can I cancel anytime?', a: 'Yes. No contracts. Your site stays live on the free plan.' },
  { q: 'Can customers reschedule?', a: 'Yes. They get a private link in their confirmation and reminder emails.' },
  { q: "I'm not techy. Is this for me?", a: "That's who it's for. If you can use Instagram, you can build your site." },
];

const cta = 'inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-violet-300/50 transition-opacity hover:opacity-90';

// ── Hero devices ─────────────────────────────────────────────────────────────

function HeroDevices() {
  return (
    <div className="relative h-[335px] w-full overflow-hidden sm:h-[470px] lg:h-[545px] lg:overflow-visible">
      <div className="absolute left-0 top-0 h-[610px] w-[620px] origin-top-left scale-[.52] sm:scale-[.77] lg:scale-[.88]">
        {/* Store site */}
        <div className="absolute left-0 top-[60px] w-[430px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-indigo-900/20">
          <div className="flex h-[26px] items-center gap-1.5 bg-slate-100 px-2.5">
            {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 rounded-full bg-slate-300" />)}
          </div>
          <div className="flex items-center justify-between px-3.5 py-2.5 text-[11px] font-semibold">
            <span>Luxe Studio</span><span className="font-medium text-slate-500">Home &nbsp; Shop &nbsp; Services &nbsp; Book</span>
          </div>
          <div className="relative h-[190px] bg-cover bg-top" style={{ backgroundImage: 'url(/landing/hair-hero.jpg)' }}>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(255,255,255,.92),rgba(255,255,255,.2) 62%,transparent)' }} />
            <div className="absolute left-4 top-11 font-serif text-[30px] leading-none">LuxeTress
              <small className="mt-1.5 block font-sans text-[8px] font-semibold tracking-[.18em] text-slate-600">BEAUTY REDEFINED</small>
            </div>
            <span className="absolute left-4 top-[128px] rounded bg-[#3b2f2a] px-3 py-2 text-[10px] font-semibold text-white">Book Appointment</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 p-2.5">
            {['hair-svc-1', 'hair-svc-2', 'hair-hero', 'photo-sess-1'].map((n) => (
              <div key={n} className="h-[46px] rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(/landing/${n}.jpg)` }} />
            ))}
          </div>
        </div>

        {/* Store cart */}
        <div className="absolute left-[30px] top-[420px] w-[330px] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-indigo-900/20">
          <div className="mb-2.5 flex justify-between text-[11px] font-extrabold"><span>Urban Vault</span><span>🛍️ 2</span></div>
          <div className="grid grid-cols-3 gap-2">
            {[['candle-prod-1', 'Soy Candle', '$24.00'], ['candle-prod-2', 'Amber Candle', '$28.00'], ['candle-hero', 'Gift Set', '$52.00']].map(([img, name, price]) => (
              <div key={name} className="rounded-xl border border-slate-100 p-1.5 text-[10px] font-semibold">
                <div className="mb-1.5 h-14 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(/landing/${img}.jpg)` }} />
                {name}<br /><span className="text-slate-500">{price}</span>
                <span className="mt-1.5 block rounded-md bg-slate-900 py-1 text-center text-white">Add to Cart</span>
              </div>
            ))}
          </div>
        </div>

        {/* The real booking window */}
        <div className="absolute left-[380px] top-0 h-[412px] w-[214px] overflow-hidden rounded-[36px] border-8 border-slate-900 bg-slate-900 shadow-2xl shadow-indigo-900/30">
          <img src="/landing/booking-sheet.jpg" alt="The booking window your customers see" className="block w-full" loading="eager" />
        </div>

        <div className="absolute left-[420px] top-[440px] flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 text-xs font-bold shadow-xl shadow-indigo-900/15">
          <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-green-100 text-green-600">$</span>
          <div>New booking paid<br /><span className="font-semibold text-slate-500">Haircut · $45.00</span></div>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Landing() {
  const { isSignedIn } = useAuth();
  if (isSignedIn) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="hidden h-8 w-8 items-center sm:flex justify-center rounded-[10px]" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_2})` }}>
              <Store size={16} className="text-white" />
            </div>
            <span className="text-base font-extrabold tracking-tight sm:text-lg">ShopSuite<span style={{ color: BRAND }}>Direct</span></span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="transition-colors hover:text-slate-900">Features</a>
            <a href="#themes" className="transition-colors hover:text-slate-900">Themes</a>
            <a href="#pricing" className="transition-colors hover:text-slate-900">Pricing</a>
            <Link to="/guide#gather" className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3.5 py-1.5 font-semibold text-violet-700 transition-colors hover:bg-violet-200">
              <ClipboardList size={14} /> Get prepared
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/sign-in" className="whitespace-nowrap text-sm font-semibold text-slate-700 transition-colors hover:text-slate-900">Sign in</Link>
            <Link to="/sign-up" className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90" style={{ background: BRAND }}>
              Start free
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="overflow-hidden pb-6 pt-14" style={{ background: 'radial-gradient(900px 500px at 85% 10%, #ede9fe 0, transparent 60%), linear-gradient(180deg, #faf8ff, #ffffff)' }}>
        <div className="mx-auto grid max-w-6xl items-center gap-6 px-6 lg:grid-cols-[1.02fr_1fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-violet-100 px-3.5 py-1.5 text-[13px] font-bold text-violet-800">
              ✨ Free to start · no credit card
            </div>
            <h1 className="text-[52px] font-black leading-[.98] tracking-[-.045em] sm:text-7xl lg:text-[76px]">
              Build Your<br />
              <span className="relative inline-block bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(90deg, ${BRAND}, ${BRAND_2})` }}>
                Business
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 480 12" preserveAspectRatio="none" height="10" aria-hidden="true">
                  <path d="M2 8 Q 120 1 240 6 T 478 5" fill="none" stroke="url(#u)" strokeWidth="6" strokeLinecap="round" />
                  <defs><linearGradient id="u"><stop offset="0" stopColor={BRAND} /><stop offset="1" stopColor={BRAND_2} /></linearGradient></defs>
                </svg>
              </span><br />
              Online.
            </h1>
            <p className="mt-8 max-w-[520px] text-lg leading-relaxed text-slate-600 sm:text-xl">
              Your website, online store, booking calendar and payments, <b style={{ color: BRAND }}>all in one place</b>. Set up in about 10 minutes. No coding.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/sign-up" className={cta} style={{ background: BRAND }}>Build my website free <ArrowRight size={16} /></Link>
              <a href="#how" className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-7 py-3.5 text-base font-bold text-slate-900 shadow-sm transition-colors hover:bg-slate-50">See how it works</a>
            </div>
            <p className="mt-3.5 text-[13px] text-slate-500">Takes about 10 minutes · Cancel anytime · Secure payments by Stripe</p>
            <Link to="/guide#gather" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3.5 py-1.5 text-[13px] font-semibold text-violet-700 transition-colors hover:bg-violet-200">
              <ClipboardList size={14} /> Get prepared: what to gather before you start <ArrowRight size={13} />
            </Link>
            <p className="mt-5 -rotate-2 font-serif text-xl italic sm:text-[22px]" style={{ color: BRAND }}>Any business. Any industry. One platform.</p>
          </div>
          <HeroDevices />
        </div>

        <div className="mx-auto max-w-6xl px-6">
          <div className="mt-6 grid grid-cols-3 gap-2.5 lg:grid-cols-7">
            {INDUSTRIES.map((i) => (
              <div key={i.label} className="relative flex h-[120px] items-end overflow-hidden rounded-2xl bg-cover bg-center p-3 lg:h-[150px]" style={{ backgroundImage: `url(${i.img})` }}>
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(15,23,42,.78))' }} />
                <span className="relative text-[10px] font-extrabold uppercase tracking-normal text-white sm:text-xs sm:tracking-wide">{i.label}</span>
              </div>
            ))}
            <div className="relative flex h-[120px] items-end overflow-hidden rounded-2xl p-3 lg:h-[150px]" style={{ background: 'linear-gradient(135deg, #7c3aed, #c026d3)' }}>
              <span className="text-xs font-extrabold uppercase tracking-wide text-white">+ Food, coaches &amp; more</span>
            </div>
          </div>

          <div id="features" className="mt-8 grid grid-cols-2 overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-xl shadow-slate-900/5 lg:grid-cols-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="border-b border-r border-slate-200 p-5 last:border-r-0 lg:border-b-0">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ background: f.color }}><f.icon size={20} /></div>
                <p className="text-[15px] font-bold">{f.title}</p>
                <p className="mt-1 text-[13px] leading-snug text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-x-10 gap-y-2 pb-2 pt-6 text-[13px] font-bold text-slate-700">
            {['No coding required', 'Set up in minutes', 'Secure payments', 'Mobile friendly'].map((t) => (
              <span key={t} className="flex items-center gap-2"><Check size={14} style={{ color: BRAND }} strokeWidth={3} />{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="px-6 py-20">
        <div className="mx-auto max-w-[1104px]">
          <span className="mb-3.5 inline-block rounded-full bg-violet-100 px-3 py-1.5 text-xs font-extrabold tracking-widest text-violet-700">HOW IT WORKS</span>
          <h2 className="text-3xl font-black leading-[1.08] tracking-tight sm:text-[44px]">From idea to open for business<br />in about 10 minutes.</h2>
          <div className="mt-11 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative rounded-[20px] border border-slate-200 bg-white p-6">
                <span className="absolute -top-3.5 left-5 grid h-[30px] w-[30px] place-items-center rounded-full text-sm font-extrabold text-white" style={{ background: BRAND }}>{i + 1}</span>
                <div className="mb-3 text-3xl">{s.icon}</div>
                <p className="text-[17px] font-bold">{s.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Get prepared ── */}
      <section id="prepared" className="scroll-mt-20 bg-violet-50/60 px-6 py-20">
        <div className="mx-auto max-w-[1104px]">
          <div className="text-center">
            <span className="mb-3.5 inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1.5 text-xs font-extrabold tracking-widest text-violet-700"><ClipboardList size={13} /> GET PREPARED</span>
            <h2 className="text-3xl font-black tracking-tight sm:text-[44px]">Gather these first.<br />Then it takes about 10 minutes.</h2>
            <p className="mx-auto mt-3.5 max-w-xl text-lg text-slate-600">Having your photos and details ready means you won't have to stop in the middle of setup. Your progress saves as you go either way.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CHECKLISTS.map((card) => {
              const c = COLOR_MAP[card.color];
              const Icon = card.icon;
              return (
                <div key={card.title} className={`rounded-2xl border ${c.border} ${c.bg} p-5`}>
                  <div className="mb-4 flex items-center gap-2.5">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg border bg-white shadow-sm ${c.border}`}><Icon size={18} className={c.icon} /></div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{card.title}</p>
                      {card.note && <p className={`text-[10px] font-semibold uppercase tracking-wide ${c.badgeText}`}>{card.note}</p>}
                    </div>
                  </div>
                  <ul className="flex flex-col gap-2.5">
                    {card.items.slice(0, 4).map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[13px] leading-snug text-slate-700"><CheckCircle2 size={14} className={`mt-0.5 shrink-0 ${c.icon}`} />{item}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/guide#gather" className="inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-white px-6 py-3 text-sm font-bold text-violet-700 transition-colors hover:bg-violet-50">See the full checklist <ArrowRight size={15} /></Link>
            <Link to="/sign-up" className={cta} style={{ background: BRAND }}>I'm ready. Build my website free <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      {/* ── Theme showcase ── */}
      <section id="themes" className="bg-slate-50 py-4">
        <ThemeShowcase />
      </section>

      {/* ── First-sale flyer ── */}
      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-[1104px] items-center gap-10 overflow-hidden rounded-[32px] p-8 text-white sm:p-14 lg:grid-cols-[1fr_1.1fr]" style={{ background: 'linear-gradient(135deg, #1e1b4b, #3b0764)' }}>
          <div>
            <span className="mb-3.5 inline-block rounded-full bg-white/15 px-3 py-1.5 text-xs font-extrabold tracking-widest text-purple-200">YOUR FIRST SALE DESERVES A PARTY</span>
            <h2 className="text-3xl font-black leading-[1.08] tracking-tight sm:text-[44px]">We make the flyer.<br />You share the win.</h2>
            <p className="mt-3.5 max-w-[560px] text-lg leading-relaxed text-indigo-200">
              The moment you get your first sale or booking, we email you a ready-to-post flyer for Instagram and Stories with your logo, your photo and your colors. Free.
            </p>
            <div className="mt-6 max-w-md rounded-2xl bg-white p-4 text-slate-900 shadow-2xl shadow-black/30">
              <p className="text-xs font-semibold text-slate-500">To: you@yourbusiness.com</p>
              <p className="my-1 text-[15px] font-bold">🎉 Congratulations on your first booking, Glow Studio!</p>
              <p className="text-[13px] text-slate-600">Your flyers are ready: one for your feed, one for Stories. Download and post.</p>
            </div>
          </div>
          <div className="relative mx-auto h-[420px] w-full max-w-[520px] sm:h-[470px]">
            <img src="/landing/flyer-post.jpg" alt="Example first-booking flyer for Instagram" className="absolute left-0 top-10 w-[50%] -rotate-[3deg] rounded-2xl border border-white/20 shadow-2xl shadow-black/50" />
            <img src="/landing/flyer-story.jpg" alt="Example first-booking flyer for Stories" className="absolute left-[52%] top-0 w-[42%] rotate-[3deg] rounded-2xl border border-white/20 shadow-2xl shadow-black/50" />
            <span className="absolute bottom-3 right-2 -rotate-3 rounded-full bg-amber-200 px-3.5 py-2 text-[13px] font-extrabold text-amber-900">Free, every store</span>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="bg-white px-6 pb-20 pt-4">
        <div className="mx-auto max-w-[1104px]">
          <div className="text-center">
            <span className="mb-3.5 inline-block rounded-full bg-violet-100 px-3 py-1.5 text-xs font-extrabold tracking-widest text-violet-700">PRICING</span>
            <h2 className="text-3xl font-black tracking-tight sm:text-[44px]">Simple pricing. Start free.</h2>
            <p className="mt-3.5 text-lg text-slate-600">No setup fees, no contracts. Upgrade when you're ready.</p>
          </div>
          <div className="mt-11 grid items-stretch gap-5 md:grid-cols-3">
            {PLANS.map((p) => (
              <div key={p.name} className={`relative flex flex-col gap-4 rounded-3xl border bg-white p-7 ${p.highlight ? 'border-2 shadow-2xl shadow-violet-200' : 'border-slate-200'}`} style={p.highlight ? { borderColor: BRAND } : undefined}>
                {p.highlight && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3.5 py-1 text-xs font-extrabold text-white" style={{ background: BRAND }}>Most popular</span>}
                <p className="text-[13px] font-bold uppercase tracking-widest text-slate-500">{p.name}</p>
                <p className="text-5xl font-black tracking-tight">{p.price}<span className="text-[15px] font-semibold tracking-normal text-slate-500"> /month</span></p>
                <p className="text-sm text-slate-500">{p.desc}</p>
                <ul className="flex flex-1 flex-col gap-2.5 text-sm">
                  {p.features.map((f) => <li key={f} className="flex items-start gap-2"><Check size={14} className="mt-0.5 shrink-0" style={{ color: BRAND }} strokeWidth={3} />{f}</li>)}
                </ul>
                <Link to="/sign-up" className={`rounded-2xl py-3 text-center text-[15px] font-bold transition-opacity hover:opacity-90 ${p.highlight ? 'text-white' : 'border border-slate-200 text-slate-900 hover:bg-slate-50'}`} style={p.highlight ? { background: BRAND } : undefined}>{p.cta}</Link>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 px-6 py-5 text-[15px]">
            <b className="text-violet-800">Payments, honestly:</b> Stripe's card fee (2.9% + 30¢) goes to Stripe. We add 2% (1% on Business). That's all, and the money goes straight to your bank.
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-violet-50/60 px-6 py-16">
        <div className="mx-auto max-w-[1104px]">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Questions people ask</h2>
          <div className="mt-8 grid gap-3.5 md:grid-cols-2">
            {FAQ.map((f) => (
              <div key={f.q} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-base font-bold">{f.q}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="px-6 py-20 text-center" style={{ background: '#1e1b4b' }}>
        <h2 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-[46px]">Your business deserves better<br />than five different apps.</h2>
        <p className="mb-7 mt-3.5 text-lg text-indigo-200">Store. Bookings. Payments. All in one place.</p>
        <Link to="/sign-up" className={cta} style={{ background: BRAND }}>Build my website free <ArrowRight size={16} /></Link>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-100 px-6 py-7">
        <div className="mx-auto flex max-w-[1104px] flex-col items-center justify-between gap-3 text-sm text-slate-500 sm:flex-row">
          <span className="font-bold text-slate-700">ShopSuite<span style={{ color: BRAND }}>Direct</span></span>
          <p>© {new Date().getFullYear()} Shop Suite Direct. All rights reserved.</p>
          <div className="flex gap-5">
            <Link to="/privacy" className="transition-colors hover:text-slate-800">Privacy</Link>
            <Link to="/terms" className="transition-colors hover:text-slate-800">Terms</Link>
            <Link to="/guide" className="transition-colors hover:text-slate-800">Get prepared</Link>
            <Link to="/sign-in" className="transition-colors hover:text-slate-800">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
