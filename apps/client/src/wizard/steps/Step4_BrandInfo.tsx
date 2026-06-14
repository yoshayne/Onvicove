import { useWizardStore } from '../wizardStore';

export default function Step4_BrandInfo() {
  const tagline = useWizardStore((s) => s.tagline);
  const brandColor = useWizardStore((s) => s.brandColor);
  const city = useWizardStore((s) => s.city);
  const industry = useWizardStore((s) => s.industry);
  const setTagline = useWizardStore((s) => s.setTagline);
  const setBrandColor = useWizardStore((s) => s.setBrandColor);
  const setCity = useWizardStore((s) => s.setCity);
  const setIndustry = useWizardStore((s) => s.setIndustry);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Tell us about your brand</h2>
        <p className="mt-1 text-sm text-gray-500">
          This helps shape the tone and colors of your site.
        </p>
      </div>

      <div>
        <label htmlFor="tagline" className="mb-1 block text-sm font-medium text-gray-700">
          Tagline
        </label>
        <input
          id="tagline"
          type="text"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="e.g. Handmade with love, every day"
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-base focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>

      <div>
        <label htmlFor="brandColor" className="mb-1 block text-sm font-medium text-gray-700">
          Brand color
        </label>
        <div className="flex items-center gap-3">
          <input
            id="brandColor"
            type="color"
            value={brandColor}
            onChange={(e) => setBrandColor(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded border border-gray-300 p-1"
          />
          <input
            type="text"
            value={brandColor}
            onChange={(e) => setBrandColor(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-base focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>
      </div>

      <div>
        <label htmlFor="city" className="mb-1 block text-sm font-medium text-gray-700">
          City
        </label>
        <input
          id="city"
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="e.g. Austin, TX"
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-base focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>

      <div>
        <label htmlFor="industry" className="mb-1 block text-sm font-medium text-gray-700">
          Industry
        </label>
        <input
          id="industry"
          type="text"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          placeholder="e.g. Coffee shop, salon, photography"
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-base focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>
    </div>
  );
}
