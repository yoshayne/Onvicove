import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { useWizardStore } from '../wizardStore';
import { useApi } from '../../lib/api';

interface UploadResponse {
  key: string;
  url: string;
}

function ImageUploader({
  label,
  hint,
  previewUrl,
  shape,
  onUpload,
  onClear,
}: {
  label: string;
  hint: string;
  previewUrl?: string;
  shape: 'square' | 'wide';
  onUpload: (key: string, url: string) => void;
  onClear: () => void;
}) {
  const api = useApi();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const result = await api.upload<UploadResponse>('/uploads', file);
      onUpload(result.key, result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  const previewClass = shape === 'square'
    ? 'w-24 h-24 rounded-xl object-contain bg-slate-100 p-1'
    : 'w-48 h-16 rounded-lg object-contain bg-slate-100 p-1';

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-4">
        {previewUrl ? (
          <div className="relative">
            <img src={previewUrl} alt={label} className={previewClass} />
            <button
              type="button"
              onClick={onClear}
              className="absolute -top-1.5 -right-1.5 bg-white border border-gray-200 rounded-full p-0.5 text-gray-500 hover:text-red-500 shadow-sm"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition ${
              shape === 'square' ? 'w-24 h-24' : 'w-48 h-16'
            }`}
          >
            <Upload size={16} />
            <span className="text-[11px]">{uploading ? 'Uploading…' : 'Upload'}</span>
          </button>
        )}
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-gray-500">{hint}</p>
          {previewUrl && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="text-xs text-indigo-600 hover:underline self-start"
            >
              {uploading ? 'Uploading…' : 'Change'}
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
      />
    </div>
  );
}

export default function Step4_BrandInfo() {
  const tagline = useWizardStore((s) => s.tagline);
  const brandColor = useWizardStore((s) => s.brandColor);
  const city = useWizardStore((s) => s.city);
  const industry = useWizardStore((s) => s.industry);
  const logoPreviewUrl = useWizardStore((s) => s.logoPreviewUrl);
  const faviconPreviewUrl = useWizardStore((s) => s.faviconPreviewUrl);

  const setTagline = useWizardStore((s) => s.setTagline);
  const setBrandColor = useWizardStore((s) => s.setBrandColor);
  const setCity = useWizardStore((s) => s.setCity);
  const setIndustry = useWizardStore((s) => s.setIndustry);
  const setLogo = useWizardStore((s) => s.setLogo);
  const setFavicon = useWizardStore((s) => s.setFavicon);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Tell us about your brand</h2>
        <p className="mt-1 text-sm text-gray-500">
          This shapes the look and feel of your site.
        </p>
      </div>

      {/* Logo */}
      <ImageUploader
        label="Logo"
        hint="PNG or SVG with transparent background works best. Max 5MB."
        previewUrl={logoPreviewUrl}
        shape="wide"
        onUpload={(key, url) => setLogo(key, url)}
        onClear={() => setLogo(undefined, undefined)}
      />

      {/* Favicon */}
      <ImageUploader
        label="Favicon"
        hint="Square image shown in browser tabs. 512×512px PNG ideal."
        previewUrl={faviconPreviewUrl}
        shape="square"
        onUpload={(key, url) => setFavicon(key, url)}
        onClear={() => setFavicon(undefined, undefined)}
      />

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
