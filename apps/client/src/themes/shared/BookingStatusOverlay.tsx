interface BookingStatusOverlayProps {
  status: 'idle' | 'submitting' | 'success' | 'error';
  error: string | null;
  onClose: () => void;
  onDismiss: () => void;
}

export default function BookingStatusOverlay({ status, error, onClose, onDismiss }: BookingStatusOverlayProps) {
  if (status === 'idle') return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center text-[#111111]">
        {status === 'submitting' && <p className="text-sm text-gray-600">Booking your appointment…</p>}
        {status === 'success' && (
          <>
            <p className="mb-2 text-lg font-semibold">You're booked!</p>
            <p className="mb-4 text-sm text-gray-600">
              We've reserved your appointment. You'll receive a confirmation by email.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-[var(--brand-color,#111111)] px-5 py-2 text-sm font-medium text-white"
            >
              Done
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <p className="mb-2 text-sm font-medium text-red-600">{error ?? 'Something went wrong'}</p>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
