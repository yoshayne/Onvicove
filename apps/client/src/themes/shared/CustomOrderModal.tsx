import { useState } from 'react';
import { X } from 'lucide-react';

interface CustomOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  onSubmit: (name: string, email: string, message: string) => void;
}

export default function CustomOrderModal({
  isOpen,
  onClose,
  companyName,
  status,
  onSubmit,
}: CustomOrderModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(name, email, message);
  }

  if (status === 'success') {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-6 text-center text-[#111111]">
          <p className="mb-3 text-4xl">✓</p>
          <p className="mb-2 text-lg font-semibold text-green-600">Request sent!</p>
          <p className="mb-6 text-sm text-gray-600">We'll be in touch soon.</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[var(--brand-color,#111111)] px-5 py-2 text-sm font-medium text-white"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 text-[#111111]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Request a Custom Order</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        <p className="mb-5 text-sm text-gray-500">Tell {companyName} what you have in mind.</p>

        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500" htmlFor="co-req-name">Name</label>
            <input
              id="co-req-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--brand-color,#111111)] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500" htmlFor="co-req-email">Email</label>
            <input
              id="co-req-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--brand-color,#111111)] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500" htmlFor="co-req-message">Message</label>
            <textarea
              id="co-req-message"
              required
              rows={4}
              placeholder="Describe what you're looking for..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--brand-color,#111111)] focus:outline-none resize-none"
            />
          </div>

          {status === 'error' && (
            <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="mt-2 rounded-lg bg-[var(--brand-color,#111111)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {status === 'loading' ? 'Sending...' : 'Send Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
