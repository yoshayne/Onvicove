import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import type { Product, ProductType } from '../types';
import Spinner from '../components/shared/Spinner';
import Badge from '../components/shared/Badge';
import Button from '../components/shared/Button';
import Modal from '../components/shared/Modal';
import { Input, Textarea } from '../components/shared/Input';

function formatCents(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

interface ProductFormState {
  name: string;
  description: string;
  price_cents: number;
  category: string;
  stock_quantity: number | null;
  is_active: boolean;
  type: ProductType;
  image_keys: string[];
}

const emptyForm: ProductFormState = {
  name: '',
  description: '',
  price_cents: 0,
  category: '',
  stock_quantity: null,
  is_active: true,
  type: 'physical',
  image_keys: [],
};

export default function Products() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [uploading, setUploading] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get<{ products: Product[] }>('/products'),
  });

  const createMutation = useMutation({
    mutationFn: (body: Partial<Product>) => api.post<{ product: Product }>('/products', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Product> }) =>
      api.patch<{ product: Product }>(`/products/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<{ success: boolean }>(`/products/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description ?? '',
      price_cents: product.price_cents,
      category: product.category ?? '',
      stock_quantity: product.stock_quantity,
      is_active: product.is_active,
      type: product.type,
      image_keys: product.image_keys ?? [],
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const res = await api.upload<{ key: string }>('/uploads', file);
      setForm((prev) => ({ ...prev, image_keys: [...prev.image_keys, res.key] }));
    } catch {
      // ignore upload errors here, surfaced visually via missing image
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const body: Partial<Product> = {
      name: form.name,
      description: form.description || null,
      price_cents: form.price_cents,
      category: form.category || null,
      stock_quantity: form.stock_quantity,
      is_active: form.is_active,
      type: form.type,
      image_keys: form.image_keys,
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
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
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
                        <img
                          src={p.image_urls[0]}
                          alt={p.name}
                          className="h-10 w-10 rounded object-cover"
                        />
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
                    <Badge tone={p.is_active ? 'success' : 'default'}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          if (confirm(`Delete ${p.name}?`)) deleteMutation.mutate(p.id);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Edit product' : 'Add product'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Price (USD)"
              type="number"
              min={0}
              step="0.01"
              value={form.price_cents / 100}
              onChange={(e) =>
                setForm((f) => ({ ...f, price_cents: Math.round(Number(e.target.value) * 100) }))
              }
              required
            />
            <Input
              label="Stock quantity"
              type="number"
              min={0}
              value={form.stock_quantity ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  stock_quantity: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Category"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ProductType }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="physical">Physical</option>
                <option value="digital">Digital</option>
                <option value="subscription">Subscription</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
            />
            {uploading && <Spinner size="sm" />}
            {form.image_keys.length > 0 && (
              <p className="text-xs text-slate-500">{form.image_keys.length} image(s) attached</p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            Active
          </label>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {editing ? 'Save changes' : 'Create product'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
