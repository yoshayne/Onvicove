import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useApi } from '../../lib/api';
import { useWizardStore, type WizardService } from '../wizardStore';
import PriceInput from '../../components/shared/PriceInput';

export default function Step6b_Services() {
  const services = useWizardStore((s) => s.services);
  const addService = useWizardStore((s) => s.addService);
  const updateService = useWizardStore((s) => s.updateService);
  const removeService = useWizardStore((s) => s.removeService);

  function handleAdd() {
    addService({ id: uuidv4(), name: '', priceCents: 0, durationMinutes: 30, description: '' });
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">Add your services</h2>
        <p className="mt-1 text-sm text-gray-500">
          Add the services customers can book, with a photo if you have one. You can edit and add more later
          from your dashboard.
        </p>
      </div>

      {services.some((sv) => sv.starter) && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          <p className="font-medium">These are starter examples. Make them yours.</p>
          <p className="mt-0.5 text-blue-800">
            Change the names, prices and times, or remove any you don't offer. The prices here are just examples, not recommendations.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            onUpdate={(updates) => updateService(service.id, updates)}
            onRemove={() => removeService(service.id)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="self-start rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
      >
        + Add service
      </button>
    </div>
  );
}

interface ServiceCardProps {
  service: WizardService;
  onUpdate: (updates: Partial<WizardService>) => void;
  onRemove: () => void;
}

function ServiceCard({ service, onUpdate, onRemove }: ServiceCardProps) {
  const api = useApi();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setIsUploading(true);
    try {
      const result = await api.upload<{ key: string; url: string }>('/uploads', file);
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
          <label className="mb-1 block text-xs font-medium text-gray-500">Service name</label>
          <input
            type="text"
            value={service.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="e.g. 60-minute massage"
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

      <div className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Price (USD)</label>
          <PriceInput
            priceCents={service.priceCents}
            onChange={(priceCents) => onUpdate({ priceCents })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Duration (min)</label>
          <input
            type="number"
            min="5"
            step="5"
            value={service.durationMinutes || ''}
            onChange={(e) => onUpdate({ durationMinutes: parseInt(e.target.value || '0', 10) })}
            placeholder="30"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Description</label>
          <input
            type="text"
            value={service.description ?? ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Optional"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        {service.imageUrl && <img src={service.imageUrl} alt={service.name || 'Service'} className="h-16 w-16 rounded-lg object-cover" />}
        <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100">
          {isUploading ? 'Uploading…' : service.imageUrl ? 'Replace photo' : 'Add a photo'}
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
        </label>
        {service.imageUrl && (
          <button type="button" onClick={() => onUpdate({ imageKey: undefined, imageUrl: undefined })} className="text-sm text-gray-400 hover:text-red-600">Remove photo</button>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      <div className="mt-3 flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={service.requiresDeposit ?? false}
            onChange={(e) =>
              onUpdate({
                requiresDeposit: e.target.checked,
                depositCents: e.target.checked ? service.depositCents ?? 0 : null,
              })
            }
          />
          Require a deposit to book
        </label>
        {service.requiresDeposit && (
          <div className="w-32">
            <PriceInput
              priceCents={service.depositCents ?? 0}
              onChange={(depositCents) => onUpdate({ depositCents })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>
        )}
      </div>
    </div>
  );
}
