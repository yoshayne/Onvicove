import { useEffect, useState } from 'react';
import { useWizardStore } from '../wizardStore';
import { useApi } from '../../lib/api';

interface SlugCheckResponse {
  available: boolean;
  suggestion?: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

export default function Step1_BusinessName() {
  const businessName = useWizardStore((s) => s.businessName);
  const slug = useWizardStore((s) => s.slug);
  const setBusinessName = useWizardStore((s) => s.setBusinessName);
  const setSlug = useWizardStore((s) => s.setSlug);
  const api = useApi();

  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const candidate = slugify(businessName);
    setSlug(candidate);

    if (!candidate) {
      setAvailable(null);
      return;
    }

    setChecking(true);
    setError(null);

    const timeout = setTimeout(() => {
      api
        .get<SlugCheckResponse>(`/tenants/slug-available?slug=${encodeURIComponent(candidate)}`)
        .then((res) => {
          setAvailable(res.available);
        })
        .catch(() => {
          setError('Could not check availability');
          setAvailable(null);
        })
        .finally(() => setChecking(false));
    }, 400);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessName]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">What's your business called?</h2>
        <p className="mt-1 text-sm text-gray-500">
          This is the name your customers will see on your site.
        </p>
      </div>

      <div>
        <label htmlFor="businessName" className="mb-1 block text-sm font-medium text-gray-700">
          Business name
        </label>
        <input
          id="businessName"
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="e.g. Sunset Cafe"
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-base focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          autoFocus
        />
      </div>

      {slug && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-sm text-gray-500">
            Your site address will be:{' '}
            <span className="font-medium text-gray-900">shopsuitedirect.com/{slug}</span>
          </p>
          <div className="mt-2 text-sm">
            {checking && <span className="text-gray-400">Checking availability…</span>}
            {!checking && available === true && (
              <span className="text-green-600">✓ Available</span>
            )}
            {!checking && available === false && (
              <span className="text-red-600">This name is already taken</span>
            )}
            {!checking && error && <span className="text-amber-600">{error}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
