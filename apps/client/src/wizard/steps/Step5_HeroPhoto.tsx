import { useRef, useState } from 'react';
import { useWizardStore } from '../wizardStore';
import { useApi } from '../../lib/api';

interface UploadResponse {
  key: string;
  url: string;
}

export default function Step5_HeroPhoto() {
  const heroImagePreviewUrl = useWizardStore((s) => s.heroImagePreviewUrl);
  const setHeroImage = useWizardStore((s) => s.setHeroImage);
  const api = useApi();

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setIsUploading(true);
    try {
      const result = await api.upload<UploadResponse>('/uploads', file);
      setHeroImage(result.key, result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Add a hero photo</h2>
        <p className="mt-1 text-sm text-gray-500">
          This image appears at the top of your homepage. Choose something that represents
          your brand well.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition ${
          isDragging
            ? 'border-gray-900 bg-gray-50'
            : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
      >
        {heroImagePreviewUrl ? (
          <img
            src={heroImagePreviewUrl}
            alt="Hero preview"
            className="max-h-48 w-full rounded-lg object-cover"
          />
        ) : (
          <>
            <p className="text-sm font-medium text-gray-700">
              {isUploading ? 'Uploading…' : 'Drag and drop an image, or click to browse'}
            </p>
            <p className="text-xs text-gray-400">PNG, JPG, or WEBP — up to 10MB</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onSelect}
        />
      </div>

      {heroImagePreviewUrl && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="self-start rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
        >
          {isUploading ? 'Uploading…' : 'Change photo'}
        </button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
