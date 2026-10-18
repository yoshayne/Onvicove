import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Store } from 'lucide-react';

const BRAND = '#7C3AED';
export const LEGAL_UPDATED = 'October 18, 2026';
/** Set VITE_SUPPORT_EMAIL to show a contact address on the legal pages */
export const SUPPORT_EMAIL = (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined)?.trim() || '';

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-slate-800 antialiased">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: BRAND }}><Store size={16} className="text-white" /></div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">ShopSuite<span style={{ color: BRAND }}>Direct</span></span>
          </Link>
          <Link to="/" className="text-sm font-medium text-slate-500 hover:text-slate-900">Back to home</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-4xl font-black tracking-tight text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated {LEGAL_UPDATED}</p>
        <div className="mt-8 flex flex-col gap-8 text-[15px] leading-relaxed">{children}</div>
      </main>
      <footer className="border-t border-slate-100 px-6 py-6 text-center text-sm text-slate-500">
        <Link to="/privacy" className="hover:text-slate-800">Privacy Policy</Link> · <Link to="/terms" className="hover:text-slate-800">Terms of Service</Link>
      </footer>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xl font-bold text-slate-900">{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return <ul className="list-disc pl-5 flex flex-col gap-1.5">{items.map((i, n) => <li key={n}>{i}</li>)}</ul>;
}

export function ContactLine() {
  return SUPPORT_EMAIL
    ? <p>Questions? Email us at <a className="font-medium underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
    : <p>Questions? Contact us through the help options in your Shop Suite Direct account.</p>;
}
