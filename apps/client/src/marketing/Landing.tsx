import { Link } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import { ArrowRight, Sparkles, Calendar, ShoppingBag, Palette, Zap } from 'lucide-react';
import ThemeShowcase from './ThemeShowcase';


const features = [
  {
    icon: Zap,
    title: '10-minute setup',
    desc: 'Answer a few questions and watch your site build itself in real time.',
  },
  {
    icon: ShoppingBag,
    title: 'Sell products',
    desc: 'Physical, digital, and subscription products with built-in checkout.',
  },
  {
    icon: Calendar,
    title: 'Take bookings',
    desc: 'A premium booking calendar with staff availability, baked into every theme.',
  },
  {
    icon: Palette,
    title: '6 premium themes',
    desc: 'Editorial, Minimal, Bold, Warm, Classic, and Bright — switch anytime.',
  },
  {
    icon: Sparkles,
    title: 'AI product photos',
    desc: 'Turn a phone photo into a studio-quality product shot in seconds.',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold tracking-tight">Shop Suite Direct</span>
          <div className="flex items-center gap-4">
            <SignedOut>
              <Link to="/sign-in" className="text-sm font-medium text-slate-700 hover:text-slate-900">
                  Sign in
                </Link>
            </SignedOut>
            <SignedIn>
              <Link to="/dashboard" className="text-sm font-medium text-slate-700 hover:text-slate-900">
                Dashboard
              </Link>
              <UserButton />
            </SignedIn>
            <Link
              to="/onboarding"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Get started <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <div className="mb-8 flex justify-center">
          <img src="/logo.png" alt="Shop Suite Direct" className="h-24 w-auto" />
        </div>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
          Build your premium online store or booking site in under 10 minutes
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          Shop Suite Direct gives any business a beautiful, unified storefront and booking
          experience — no designers, no developers, no hassle.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-base font-semibold text-white hover:bg-slate-700"
          >
            Build my site <ArrowRight size={18} />
          </Link>
          <SignedOut>
            <Link to="/sign-in" className="rounded-lg border border-slate-300 px-6 py-3 text-base font-semibold text-slate-900 hover:bg-slate-50">
                  Sign in
                </Link>
          </SignedOut>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-100 p-6 shadow-sm">
              <f.icon className="mb-4 h-8 w-8 text-slate-900" />
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Theme showcase */}
      <ThemeShowcase />

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Ready to launch your site?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-slate-600">
          Start the wizard now — your website builds itself as you go.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-base font-semibold text-white hover:bg-slate-700"
          >
            Start building <ArrowRight size={18} />
          </Link>
          <SignedOut>
            <Link to="/sign-in" className="rounded-lg border border-slate-300 px-6 py-3 text-base font-semibold text-slate-900 hover:bg-slate-50">
                  Sign in
                </Link>
          </SignedOut>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Shop Suite Direct. All rights reserved.
      </footer>
    </div>
  );
}
