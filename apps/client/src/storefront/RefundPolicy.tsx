import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api';
import Spinner from '../components/shared/Spinner';
import type { Tenant } from '../types';
import { storeHomePath } from './storePaths';

/** A store's own refund policy, written by the owner in Settings. Shown at <store>/refund-policy. */
export default function RefundPolicy({ slug: hostSlug }: { slug?: string }) {
  const params = useParams<{ slug: string }>();
  const slug = hostSlug ?? params.slug;
  const q = useQuery({
    queryKey: ['public-tenant', slug],
    queryFn: () => apiGet<{ tenant: Tenant }>(`/api/public/${slug}`).then((r) => r.tenant),
    enabled: !!slug,
    retry: false,
  });

  if (q.isLoading) return <div className="flex min-h-screen items-center justify-center"><Spinner size="lg" /></div>;
  if (q.isError || !q.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-slate-600">We couldn&apos;t find a store at this address.</p>
      </div>
    );
  }

  const tenant = q.data;
  const policy = tenant.page_content?.['refund.policy']?.trim();
  const email = tenant.page_content?.['contact.email']?.trim();

  return (
    <div className="min-h-screen bg-white text-slate-800 antialiased">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold text-slate-900">{tenant.company_name}</span>
          <Link to={storeHomePath(slug)} className="text-sm font-medium text-slate-500 hover:text-slate-900">Back to the store</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-4xl font-black tracking-tight text-slate-900">Refund policy</h1>
        {policy ? (
          <p className="mt-8 whitespace-pre-line text-[15px] leading-relaxed">{policy}</p>
        ) : (
          <p className="mt-8 text-[15px] leading-relaxed text-slate-600">
            {tenant.company_name} hasn&apos;t published a refund policy yet. Please contact them directly about a refund or cancellation{email ? <> at <a className="font-medium underline" href={`mailto:${email}`}>{email}</a></> : null}.
          </p>
        )}
        <p className="mt-10 text-sm text-slate-500">This policy is set by {tenant.company_name}, the seller. Shop Suite Direct provides the website and checkout and is not the seller.</p>
      </main>
    </div>
  );
}
