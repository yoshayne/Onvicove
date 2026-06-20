import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import type { Product, ProductType } from '../types';
import Spinner from '../components/shared/Spinner';
import Badge from '../components/shared/Badge';
import Button from '../components/shared/Button';
import Modal from '../components/shared/Modal';
import { Input, Textarea } from '../components/shared/Input';

// ── helpers ─────────────────────────────────────────────────────────────────

function formatCents(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

// ── constants ────────────────────────────────────────────────────────────────

const PRESET_CATEGORIES = [
  'Other',
  'Clothing & Apparel',
  'Shoes & Footwear',
  'Bags & Accessories',
  'Jewelry',
  'Beauty & Skincare',
  'Hair Care & Products',
  'Health & Wellness',
  'Candles & Fragrance',
  'Home & Decor',
  'Kitchen & Dining',
  'Food & Beverages',
  'Art & Prints',
  'Books & Stationery',
  'Electronics & Tech',
  'Toys & Games',
  'Baby & Kids',
  'Sports & Fitness',
  'Pet Supplies',
  'Plants & Garden',
  'Digital Downloads',
];

const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

// ── Tooltip ──────────────────────────────────────────────────────────────────

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow((v) => !v)}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-bold text-slate-400 hover:border-slate-500 hover:text-slate-600"
        aria-label="Help"
      >
        ?
      </button>
      {show && (
        <div className="absolute left-5 top-0 z-50 w-52 rounded-lg border border-slate-200 bg-white p-2.5 text-xs leading-relaxed text-slate-600 shadow-lg">
          {text}
        </div>
      )}
    </div>
  );
}

// ── types ────────────────────────────────────────────────────────────────────

interface ImageEntry { key: string; url: string }

interface VariantEntry {
  option_type: 'size' | 'color' | 'custom';
  name: string;
  option_name?: string;
  color_hex?: string;
}

interface ProductFormState {
  name: string;
  description: string;
  price_cents: number;
  category: string;       // the selected preset value (or 'Other')
  category_custom: string; // value when 'Other' is selected
  stock_quantity: number | null;
  is_active: boolean;
  type: ProductType;
  imageEntries: ImageEntry[];
  // variants
  sizes: string[];             // e.g. ['S', 'M', 'L']
  customSizeInput: string;
  colors: { name: string; hex: string }[];
  colorNameInput: string;
  colorHexInput: string;
  customOptionName: string;
  customOptionValues: string[];
  customOptionInput: string;
}

const emptyForm: ProductFormState = {
  name: '',
  description: '',
  price_cents: 0,
  category: '',
  category_custom: '',
  stock_quantity: null,
  is_active: true,
  type: 'physical',
  imageEntries: [],
  sizes: [],
  customSizeInput: '',
  colors: [],
  colorNameInput: '',
  colorHexInput: '#000000',
  customOptionName: '',
  customOptionValues: [],
  customOptionInput: '',
};

// convert form variants to API shape
function formToVariants(form: ProductFormState): VariantEntry[] {
  const result: VariantEntry[] = [];
  form.sizes.forEach((s) => result.push({ option_type: 'size', name: s }));
  form.colors.forEach((c) => result.push({ option_type: 'color', name: c.name, color_hex: c.hex }));
  if (form.customOptionName && form.customOptionValues.length > 0) {
    form.customOptionValues.forEach((v) =>
      result.push({ option_type: 'custom', name: v, option_name: form.customOptionName })
    );
  }
  return result;
}

function variantsToForm(
  variants: { option_type: string; name: string; option_name?: string | null; color_hex?: string | null }[]
): Partial<ProductFormState> {
  const sizes = variants.filter((v) => v.option_type === 'size').map((v) => v.name);
  const colors = variants
    .filter((v) => v.option_type === 'color')
    .map((v) => ({ name: v.name, hex: v.color_hex ?? '#000000' }));
  const customVars = variants.filter((v) => v.option_type === 'custom');
  const customOptionName = customVars[0]?.option_name ?? '';
  const customOptionValues = customVars.map((v) => v.name);
  return { sizes, colors, customOptionName, customOptionValues };
}

// ── AI Photo panel (inline, reused from wizard) ──────────────────────────────

const STYLE_SWATCHES: Record<string, string> = {
  studio: 'linear-gradient(135deg, #f5f5f5, #d4d4d4)',
  lifestyle: 'linear-gradient(135deg, #d6c2a3, #8b6f4e)',
  outdoor: 'linear-gradient(135deg, #8bc48a, #3f6b3a)',
  marble: 'linear-gradient(135deg, #e8e8e8, #b8b8c0)',
  gradient: 'linear-gradient(135deg, #ff7eb3, #6a82fb)',
  wood: 'linear-gradient(135deg, #c89b6d, #6b4423)',
};

const PRODUCT_CATEGORIES_AI = [
  'Clothing & Apparel', 'Bags & Accessories', 'Skincare & Beauty',
  'Food & Beverage', 'Candles & Home Decor', 'Jewelry',
  'Electronics', 'Books & Art', 'Health & Wellness', 'Toys & Games', 'Other',
];

type AiStage = 'upload' | 'describe' | 'style-select' | 'generating' | 'preview';

function AiPhotoPanel({ productId, productName, onUnlocked }: {
  productId: string; productName?: string; onUnlocked: () => void;
}) {
  const api = useApi();
  const [stage, setStage] = useState<AiStage>('upload');
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null);
  const [isFree, setIsFree] = useState(false);
  const [productDesc, setProductDesc] = useState(productName ?? '');
  const [productCat, setProductCat] = useState('');
  const [styles, setStyles] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingStyles, setIsLoadingStyles] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null); setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('product_id', productId);
      const res = await api.post<{ sessionId: string; cutoutImageUrl: string; isFree: boolean }>('/ai-photos/sessions', formData);
      setSessionId(res.sessionId); setCutoutUrl(res.cutoutImageUrl); setIsFree(res.isFree);
      setStage('describe');
    } catch (err) { setError(err instanceof Error ? err.message : 'Upload failed'); }
    finally { setIsUploading(false); }
  }

  async function handleContinue() {
    if (!productDesc.trim()) return;
    setIsLoadingStyles(true); setError(null);
    try {
      const res = await api.get<{ styles: { id: string; name: string }[] }>('/ai-photos/styles');
      setStyles(res.styles); setStage('style-select');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load styles'); }
    finally { setIsLoadingStyles(false); }
  }

  async function generate(withFeedback?: string) {
    if (!sessionId || !selectedStyle) return;
    setError(null); setIsGenerating(true); setStage('generating');
    try {
      const res = await api.post<{ generationId: string; previewImageUrl: string }>('/ai-photos/generate', {
        sessionId, style: selectedStyle,
        productDescription: productDesc.trim(),
        productCategory: productCat || undefined,
        feedback: withFeedback || undefined,
      });
      setGenerationId(res.generationId); setPreviewUrl(res.previewImageUrl); setStage('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed'); setStage('style-select');
    } finally { setIsGenerating(false); }
  }

  async function handleUnlock() {
    if (!sessionId || !generationId) return;
    setError(null); setIsUnlocking(true);
    try {
      await api.post('/ai-photos/unlock', { sessionId, generationId });
      setUnlocked(true); onUnlocked();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unlock failed';
      setError(/payment/i.test(msg) ? 'Add a payment method in Settings to unlock additional AI photos.' : msg);
    } finally { setIsUnlocking(false); }
  }

  // suppress unused warning
  void isFree;

  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50/40 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-purple-700">✨ AI Photo Studio</p>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      {stage === 'upload' && (
        <label className="block cursor-pointer rounded-lg border border-dashed border-purple-300 bg-white p-4 text-center text-sm text-gray-600 hover:border-purple-400">
          {isUploading ? <span className="text-purple-600">Removing background…</span> : '📸 Upload a product photo to generate AI images'}
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={isUploading} />
        </label>
      )}
      {stage === 'describe' && cutoutUrl && (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <img src={cutoutUrl} alt="Cutout" className="h-16 w-16 shrink-0 rounded-lg border bg-white object-contain" />
            <p className="mt-1 text-xs font-medium text-green-700">✓ Background removed — describe the product so the AI knows what to focus on.</p>
          </div>
          <input type="text" value={productDesc} onChange={(e) => setProductDesc(e.target.value)} placeholder="e.g. black leather crossbody bag, pink crop top" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900" />
          <select value={productCat} onChange={(e) => setProductCat(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">Category (optional)</option>
            {PRODUCT_CATEGORIES_AI.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="button" onClick={handleContinue} disabled={!productDesc.trim() || isLoadingStyles} className="self-start rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-40">
            {isLoadingStyles ? 'Loading…' : 'Choose a style →'}
          </button>
        </div>
      )}
      {(stage === 'style-select' || stage === 'generating' || stage === 'preview') && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-600">Pick a scene:</p>
            <button type="button" onClick={() => setStage('describe')} className="text-xs text-gray-400 hover:text-gray-600">← Change product</button>
          </div>
          <p className="rounded bg-purple-50 px-2 py-1.5 text-xs text-purple-700"><strong>{productDesc}</strong>{productCat && <span className="text-gray-500"> · {productCat}</span>}</p>
          <div className="grid grid-cols-3 gap-2">
            {styles.map((s) => (
              <button key={s.id} type="button" onClick={() => setSelectedStyle(s.id)} className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition ${selectedStyle === s.id ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="flex h-12 w-full items-center justify-center rounded text-[10px] font-medium uppercase tracking-wide text-white" style={{ background: STYLE_SWATCHES[s.id] ?? '#6b7280' }}>{s.name}</div>
                <span className="text-gray-700">{s.name}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => generate()} disabled={!selectedStyle || isGenerating} className="self-start rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-40">
            {isGenerating ? 'Generating…' : 'Generate preview'}
          </button>
          {stage === 'generating' && <div className="h-36 w-full animate-pulse rounded-lg bg-gray-200" />}
          {stage === 'preview' && previewUrl && (
            <div className="flex flex-col gap-3">
              <div className="relative">
                <img src={previewUrl} alt="Preview" className="w-full rounded-lg object-cover" />
                <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 text-xs text-white">Preview — watermarked</span>
              </div>
              <div className="flex gap-2">
                <input type="text" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Want changes? e.g. warmer tones" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none" />
                <button type="button" onClick={() => generate(feedback)} disabled={isGenerating} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-40">Retry</button>
              </div>
              <button type="button" onClick={handleUnlock} disabled={isUnlocking || unlocked} className="self-start rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40">
                {unlocked ? '✓ Photo saved to product' : isUnlocking ? 'Saving…' : 'Use this photo'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── SectionLabel helper ───────────────────────────────────────────────────────

function SectionLabel({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <Tooltip text={tooltip} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Products() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get<{ products: Product[] }>('/products'),
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<{ product: Product }>('/products', body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch<{ product: Product }>(`/products/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<{ success: boolean }>(`/products/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  function openCreate() {
    setEditing(null); setForm(emptyForm); setShowAiPanel(false); setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    const keys = product.image_keys ?? [];
    const urls = product.image_urls ?? [];
    const imageEntries: ImageEntry[] = keys.slice(0, 10).map((key, i) => ({ key, url: urls[i] ?? '' })).filter((e) => e.url);
    const variantForm = variantsToForm((product.variants as Array<{ option_type: string; name: string; option_name?: string | null; color_hex?: string | null }>) ?? []);
    setForm({ ...emptyForm, name: product.name, description: product.description ?? '', price_cents: product.price_cents, category: PRESET_CATEGORIES.includes(product.category ?? '') ? (product.category ?? '') : (product.category ? 'Other' : ''), category_custom: PRESET_CATEGORIES.includes(product.category ?? '') ? '' : (product.category ?? ''), stock_quantity: product.stock_quantity, is_active: product.is_active, type: product.type, imageEntries, ...variantForm });
    setShowAiPanel(false); setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false); setEditing(null); setForm(emptyForm); setShowAiPanel(false);
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const res = await api.upload<{ key: string; url: string }>('/uploads', file);
      setForm((prev) => ({ ...prev, imageEntries: [...prev.imageEntries, { key: res.key, url: res.url }] }));
    } catch { /* ignore */ } finally { setUploading(false); }
  }

  function removeImage(index: number) {
    setForm((prev) => ({ ...prev, imageEntries: prev.imageEntries.filter((_, i) => i !== index) }));
  }

  function toggleSize(size: string) {
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.includes(size) ? prev.sizes.filter((s) => s !== size) : [...prev.sizes, size],
    }));
  }

  function addCustomSize() {
    setForm((prev) => {
      const s = prev.customSizeInput.trim();
      if (!s || prev.sizes.includes(s)) return prev;
      return { ...prev, sizes: [...prev.sizes, s], customSizeInput: '' };
    });
  }

  function addColor() {
    setForm((prev) => {
      const name = prev.colorNameInput.trim();
      if (!name) return prev;
      return { ...prev, colors: [...prev.colors, { name, hex: prev.colorHexInput }], colorNameInput: '', colorHexInput: '#000000' };
    });
  }

  function addCustomValue() {
    setForm((prev) => {
      const v = prev.customOptionInput.trim();
      if (!v || prev.customOptionValues.includes(v)) return prev;
      return { ...prev, customOptionValues: [...prev.customOptionValues, v], customOptionInput: '' };
    });
  }

  function resolvedCategory() {
    return form.category === 'Other' ? form.category_custom : form.category;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const body = {
      name: form.name,
      description: form.description || null,
      price_cents: form.price_cents,
      category: resolvedCategory() || null,
      stock_quantity: form.stock_quantity,
      is_active: form.is_active,
      type: form.type,
      image_keys: form.imageEntries.map((e) => e.key),
      variants: formToVariants(form),
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body });
    } else {
      createMutation.mutate(body);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Products</h1>
        <Button onClick={openCreate}>Add product</Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>
      ) : isError ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Failed to load products.</div>
      ) : !data?.products.length ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No products yet. Add your first product to get started.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.products.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.image_urls?.[0] ? (
                        <img src={p.image_urls[0]} alt={p.name} className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-slate-100" />
                      )}
                      <span className="font-medium text-slate-900">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{p.category ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCents(p.price_cents)}</td>
                  <td className="px-4 py-3 text-slate-700">{p.stock_quantity ?? '-'}</td>
                  <td className="px-4 py-3">
                    <Badge tone={p.is_active ? 'success' : 'default'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>Edit</Button>
                      <Button size="sm" variant="danger" onClick={() => { if (confirm(`Delete ${p.name}?`)) deleteMutation.mutate(p.id); }}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Edit product' : 'Add product'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Name */}
          <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <SectionLabel
              label="Category"
              tooltip="Choose the category that best fits your product. Select 'Other' if none match and type your own."
            />
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value, category_custom: '' }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="">Select a category…</option>
              {PRESET_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {form.category === 'Other' && (
              <input
                type="text"
                value={form.category_custom}
                onChange={(e) => setForm((f) => ({ ...f, category_custom: e.target.value }))}
                placeholder="Type your category…"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                autoFocus
              />
            )}
          </div>

          {/* Description */}
          <Textarea label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />

          {/* Price + Stock */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Price (USD)" type="number" min={0} step="0.01"
              value={form.price_cents / 100}
              onChange={(e) => setForm((f) => ({ ...f, price_cents: Math.round(Number(e.target.value) * 100) }))}
              required
            />
            <Input
              label="Stock quantity" type="number" min={0}
              value={form.stock_quantity ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, stock_quantity: e.target.value === '' ? null : Number(e.target.value) }))}
            />
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Type</label>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ProductType }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="physical">Physical</option>
              <option value="digital">Digital</option>
              <option value="subscription">Subscription</option>
            </select>
          </div>

          {/* ── Sizes ── */}
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4">
            <SectionLabel
              label="Sizes"
              tooltip="Add the sizes you offer for this product. Click a preset size to toggle it on or off, or type a custom size (like '32x30' or '14K') and press Add."
            />
            {/* Preset chips */}
            <div className="flex flex-wrap gap-2">
              {SIZE_PRESETS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSize(s)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    form.sizes.includes(s)
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 text-slate-600 hover:border-slate-500'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {/* Custom size input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={form.customSizeInput}
                onChange={(e) => setForm((f) => ({ ...f, customSizeInput: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSize(); } }}
                placeholder="Custom size (e.g. 32x30)"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              <button type="button" onClick={addCustomSize} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                Add
              </button>
            </div>
            {/* Selected non-preset sizes */}
            {form.sizes.filter((s) => !SIZE_PRESETS.includes(s)).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.sizes.filter((s) => !SIZE_PRESETS.includes(s)).map((s) => (
                  <span key={s} className="flex items-center gap-1 rounded-full border border-slate-900 bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                    {s}
                    <button type="button" onClick={() => setForm((f) => ({ ...f, sizes: f.sizes.filter((x) => x !== s) }))} className="ml-0.5 text-white/60 hover:text-white">×</button>
                  </span>
                ))}
              </div>
            )}
            {form.sizes.length === 0 && (
              <p className="text-xs text-slate-400">No sizes selected — leave empty if this product has no size options.</p>
            )}
          </div>

          {/* ── Colors ── */}
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4">
            <SectionLabel
              label="Colors"
              tooltip="Add the color options available for this product. Type the color name, pick the color, then click Add."
            />
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={form.colorNameInput}
                onChange={(e) => setForm((f) => ({ ...f, colorNameInput: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addColor(); } }}
                placeholder="Color name (e.g. Hot Pink)"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              <input
                type="color"
                value={form.colorHexInput}
                onChange={(e) => setForm((f) => ({ ...f, colorHexInput: e.target.value }))}
                className="h-9 w-10 cursor-pointer rounded border border-slate-300 p-0.5"
                title="Pick a color"
              />
              <button type="button" onClick={addColor} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                Add
              </button>
            </div>
            {form.colors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.colors.map((c, i) => (
                  <span key={i} className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                    <span className="h-3 w-3 rounded-full border border-slate-200" style={{ background: c.hex }} />
                    {c.name}
                    <button type="button" onClick={() => setForm((f) => ({ ...f, colors: f.colors.filter((_, j) => j !== i) }))} className="text-slate-400 hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
            )}
            {form.colors.length === 0 && (
              <p className="text-xs text-slate-400">No colors added — leave empty if this product comes in one color.</p>
            )}
          </div>

          {/* ── Custom option ── */}
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4">
            <SectionLabel
              label="Custom option"
              tooltip="Add any other variation that isn't size or color — like Material, Scent, Bundle size, or Finish. Name the option, then add its values."
            />
            <input
              type="text"
              value={form.customOptionName}
              onChange={(e) => setForm((f) => ({ ...f, customOptionName: e.target.value }))}
              placeholder="Option name (e.g. Material, Scent, Finish)"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
            {form.customOptionName.trim() && (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.customOptionInput}
                    onChange={(e) => setForm((f) => ({ ...f, customOptionInput: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomValue(); } }}
                    placeholder={`Add a ${form.customOptionName} value…`}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <button type="button" onClick={addCustomValue} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Add</button>
                </div>
                {form.customOptionValues.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.customOptionValues.map((v, i) => (
                      <span key={i} className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                        {v}
                        <button type="button" onClick={() => setForm((f) => ({ ...f, customOptionValues: f.customOptionValues.filter((_, j) => j !== i) }))} className="text-slate-400 hover:text-red-500">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
            {!form.customOptionName.trim() && (
              <p className="text-xs text-slate-400">Optional — leave blank if sizes and colors cover all your options.</p>
            )}
          </div>

          {/* ── Photos ── */}
          <div className="flex flex-col gap-2">
            <SectionLabel
              label="Photos"
              tooltip="Upload photos of your product. The first photo is used as the main image in your store. Hover over a photo and click × to remove it."
            />
            {form.imageEntries.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.imageEntries.map((entry, i) => (
                  <div key={entry.key} className="group relative">
                    <img src={entry.url} alt={`Image ${i + 1}`} className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white group-hover:flex"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3">
              <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {uploading ? 'Uploading…' : '+ Add photo'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} disabled={uploading} />
              </label>
              {uploading && <Spinner size="sm" />}
            </div>
            {editing && (
              <div>
                <button type="button" onClick={() => setShowAiPanel((v) => !v)} className="rounded-lg border border-slate-300 bg-gradient-to-r from-purple-50 to-blue-50 px-3 py-2 text-sm font-medium text-gray-700 hover:from-purple-100 hover:to-blue-100">
                  ✨ Generate AI photo
                </button>
                {showAiPanel && (
                  <div className="mt-2">
                    <AiPhotoPanel productId={editing.id} productName={form.name} onUnlocked={() => { queryClient.invalidateQueries({ queryKey: ['products'] }); setShowAiPanel(false); }} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Active */}
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
            Active
          </label>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" isLoading={isSaving}>{editing ? 'Save changes' : 'Create product'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
