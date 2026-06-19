import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useWizardStore, type WizardProduct } from '../wizardStore';
import { useApi } from '../../lib/api';
import PriceInput from '../../components/shared/PriceInput';

const STYLE_SWATCHES: Record<string, string> = {
  studio: 'linear-gradient(135deg, #f5f5f5, #d4d4d4)',
  lifestyle: 'linear-gradient(135deg, #d6c2a3, #8b6f4e)',
  outdoor: 'linear-gradient(135deg, #8bc48a, #3f6b3a)',
  marble: 'linear-gradient(135deg, #e8e8e8, #b8b8c0)',
  gradient: 'linear-gradient(135deg, #ff7eb3, #6a82fb)',
  wood: 'linear-gradient(135deg, #c89b6d, #6b4423)',
};

interface UploadResponse {
  key: string;
  url: string;
}

interface AiPhotoSessionResponse {
  sessionId: string;
  cutoutImageUrl: string;
  isFree: boolean;
}

interface AiPhotoStyle {
  id: string;
  name: string;
  thumbnailUrl: string;
}

interface AiPhotoStylesResponse {
  styles: AiPhotoStyle[];
}

interface AiPhotoGenerateResponse {
  generationId: string;
  previewImageUrl: string;
}

interface AiPhotoUnlockResponse {
  fullImageUrl: string;
}

export default function Step6_Products() {
  const products = useWizardStore((s) => s.products);
  const addProduct = useWizardStore((s) => s.addProduct);
  const updateProduct = useWizardStore((s) => s.updateProduct);
  const removeProduct = useWizardStore((s) => s.removeProduct);

  function handleAdd() {
    addProduct({ id: uuidv4(), name: '', priceCents: 0, description: '' });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Add your products</h2>
        <p className="mt-1 text-sm text-gray-500">
          Add a few products to start. You can edit, add photos, and add more later from your
          dashboard.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onUpdate={(updates) => updateProduct(product.id, updates)}
            onRemove={() => removeProduct(product.id)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="self-start rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
      >
        + Add product
      </button>
    </div>
  );
}

interface ProductCardProps {
  product: WizardProduct;
  onUpdate: (updates: Partial<WizardProduct>) => void;
  onRemove: () => void;
}

function ProductCard({ product, onUpdate, onRemove }: ProductCardProps) {
  const api = useApi();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsUploading(true);
    try {
      const result = await api.upload<UploadResponse>('/uploads', file);
      onUpdate({ imageKey: result.key, imageUrl: result.url });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500">Product name</label>
          <input
            type="text"
            value={product.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="e.g. Hand-poured candle"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="mt-6 text-sm text-gray-400 hover:text-red-600"
        >
          Remove
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Price (USD)</label>
          <PriceInput
            priceCents={product.priceCents}
            onChange={(priceCents) => onUpdate({ priceCents })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Description</label>
          <input
            type="text"
            value={product.description ?? ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Short description"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        {product.imageUrl && (
          <img
            src={product.imageUrl}
            alt={product.name || 'Product'}
            className="h-16 w-16 rounded-lg object-cover"
          />
        )}
        <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100">
          {isUploading ? 'Uploading…' : product.imageUrl ? 'Replace photo' : 'Upload photo'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </label>
        <button
          type="button"
          onClick={() => setShowAiPanel((v) => !v)}
          className="rounded-lg border border-gray-300 bg-gradient-to-r from-purple-50 to-blue-50 px-3 py-2 text-sm font-medium text-gray-700 transition hover:from-purple-100 hover:to-blue-100"
        >
          ✨ AI Photo
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {showAiPanel && (
        <AiPhotoPanel
          productName={product.name || undefined}
          onApply={(fullImageUrl) => onUpdate({ imageUrl: fullImageUrl })}
        />
      )}
    </div>
  );
}

const PRODUCT_CATEGORIES = [
  'Clothing & Apparel',
  'Bags & Accessories',
  'Skincare & Beauty',
  'Food & Beverage',
  'Candles & Home Decor',
  'Jewelry',
  'Electronics',
  'Books & Art',
  'Health & Wellness',
  'Toys & Games',
  'Other',
];

type AiPhotoStage = 'upload' | 'describe' | 'style-select' | 'generating' | 'preview';

interface AiPhotoPanelProps {
  productName?: string;
  onApply: (fullImageUrl: string) => void;
}

function AiPhotoPanel({ productName, onApply }: AiPhotoPanelProps) {
  const api = useApi();

  const [stage, setStage] = useState<AiPhotoStage>('upload');
  const [error, setError] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cutoutImageUrl, setCutoutImageUrl] = useState<string | null>(null);
  const [isFree, setIsFree] = useState(false);

  const [productDescription, setProductDescription] = useState(productName ?? '');
  const [productCategory, setProductCategory] = useState('');

  const [styles, setStyles] = useState<AiPhotoStyle[]>([]);
  const [isLoadingStyles, setIsLoadingStyles] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);

  const [generationId, setGenerationId] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [costCents, setCostCents] = useState<number | null>(null);
  const [showAppliedBadge, setShowAppliedBadge] = useState(false);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsUploading(true);
    try {
      const result = await api.upload<AiPhotoSessionResponse>('/ai-photos/sessions', file);
      setSessionId(result.sessionId);
      setCutoutImageUrl(result.cutoutImageUrl);
      setIsFree(result.isFree);
      setStage('describe');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDescribeContinue() {
    if (!productDescription.trim()) return;
    setIsLoadingStyles(true);
    setError(null);
    try {
      const result = await api.get<AiPhotoStylesResponse>('/ai-photos/styles');
      setStyles(result.styles);
      setStage('style-select');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load styles');
    } finally {
      setIsLoadingStyles(false);
    }
  }

  async function generate(withFeedback?: string) {
    if (!sessionId || !selectedStyle) return;
    setError(null);
    setIsGenerating(true);
    setStage('generating');
    try {
      const result = await api.post<AiPhotoGenerateResponse>('/ai-photos/generate', {
        sessionId,
        style: selectedStyle,
        productDescription: productDescription.trim(),
        productCategory: productCategory || undefined,
        feedback: withFeedback || undefined,
      });
      setGenerationId(result.generationId);
      setPreviewImageUrl(result.previewImageUrl);
      setStage('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setStage('style-select');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleUnlock() {
    if (!sessionId || !generationId) return;
    setError(null);
    setIsUnlocking(true);
    try {
      const result = await api.post<AiPhotoUnlockResponse>('/ai-photos/unlock', {
        sessionId,
        generationId,
      });
      onApply(result.fullImageUrl);
      setUnlocked(true);
      setShowAppliedBadge(true);
      setTimeout(() => setShowAppliedBadge(false), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unlock failed';
      if (!isFree && /payment/i.test(message)) {
        setCostCents(299);
        setError('Add a payment method in Settings to unlock additional AI photos.');
      } else {
        setError(message);
      }
    } finally {
      setIsUnlocking(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50/40 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-purple-700">
        ✨ AI Photo Studio
      </p>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      {/* Step 1: Upload */}
      {stage === 'upload' && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-500">Upload a photo of your product — any angle, any background.</p>
          <label className="block cursor-pointer rounded-lg border border-dashed border-purple-300 bg-white p-4 text-center text-sm text-gray-600 hover:border-purple-400">
            {isUploading ? (
              <span className="text-purple-600">Removing background…</span>
            ) : (
              <>
                <span className="block text-2xl mb-1">📸</span>
                Tap to upload your product photo
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={isUploading}
            />
          </label>
        </div>
      )}

      {/* Step 2: Describe the product */}
      {stage === 'describe' && cutoutImageUrl && (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <img src={cutoutImageUrl} alt="Product cutout" className="h-20 w-20 shrink-0 rounded-lg object-contain bg-white border border-gray-100" />
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium text-green-700">✓ Background removed</p>
              <p className="text-xs text-gray-500">Now tell us what the product is so the AI knows what to focus on.</p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              What is the product? <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="e.g. black leather crossbody bag, red linen button-up shirt"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
            <p className="mt-1 text-xs text-gray-400">Be specific — color, material, and type help a lot.</p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Category</label>
            <select
              value={productCategory}
              onChange={(e) => setProductCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              <option value="">Select a category (optional)</option>
              {PRODUCT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleDescribeContinue}
            disabled={!productDescription.trim() || isLoadingStyles}
            className="self-start rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoadingStyles ? 'Loading styles…' : 'Choose a style →'}
          </button>
        </div>
      )}

      {/* Steps 3–5: Style select, generating, preview */}
      {(stage === 'style-select' || stage === 'generating' || stage === 'preview') && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-600">Pick a scene style:</p>
            <button
              type="button"
              onClick={() => setStage('describe')}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              ← Change product
            </button>
          </div>

          <p className="text-xs text-purple-700 bg-purple-50 rounded px-2 py-1.5">
            Generating for: <strong>{productDescription}</strong>
            {productCategory && <span className="text-gray-500"> · {productCategory}</span>}
          </p>

          <div className="grid grid-cols-3 gap-2">
            {styles.map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => setSelectedStyle(style.id)}
                className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition ${
                  selectedStyle === style.id
                    ? 'border-gray-900 ring-1 ring-gray-900'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div
                  className="flex h-14 w-full items-center justify-center rounded text-[10px] font-medium uppercase tracking-wide text-white"
                  style={{ background: STYLE_SWATCHES[style.id] ?? '#6b7280' }}
                >
                  {style.name}
                </div>
                <span className="text-gray-700">{style.name}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => generate()}
            disabled={!selectedStyle || isGenerating}
            className="self-start rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isGenerating ? 'Generating…' : 'Generate preview'}
          </button>

          {stage === 'generating' && (
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="h-40 w-full animate-pulse rounded-lg bg-gray-200" />
              <p className="text-xs text-gray-400">Creating your product photo…</p>
            </div>
          )}

          {stage === 'preview' && previewImageUrl && (
            <div className="flex flex-col gap-3">
              <div className="relative">
                <img
                  src={previewImageUrl}
                  alt="AI generated preview"
                  className="w-full rounded-lg object-cover"
                />
                <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
                  Preview — watermarked
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-gray-600">
                  Want changes? Describe them:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="e.g. more dramatic lighting, warmer tones"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => generate(feedback)}
                    disabled={isGenerating}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-40"
                  >
                    Retry
                  </button>
                </div>
              </div>

              {!isFree && costCents === null && (
                <p className="text-xs text-gray-500">
                  $2.99 — billed to your card on file when you use this photo.
                </p>
              )}
              {costCents !== null && (
                <p className="text-xs text-amber-600">
                  ${(costCents / 100).toFixed(2)} — payment method required.
                </p>
              )}

              <button
                type="button"
                onClick={handleUnlock}
                disabled={isUnlocking || unlocked}
                className="self-start rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {unlocked ? '✓ Photo applied' : isUnlocking ? 'Unlocking…' : 'Use this photo'}
              </button>

              {showAppliedBadge && (
                <span className="self-start rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                  ✨ AI generated
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
