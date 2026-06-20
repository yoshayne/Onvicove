import { useQuery } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import Spinner from '../components/shared/Spinner';

interface AIPhotoSession {
  id: string;
  productId: string | null;
  productName: string | null;
  status: string;
  isFree: boolean;
  style: string | null;
  generationId: string | null;
  imageUrl: string | null;
  createdAt: string;
}

export default function AIPhotos() {
  const api = useApi();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ai-photo-sessions'],
    queryFn: () => api.get<{ sessions: AIPhotoSession[] }>('/ai-photos/sessions'),
  });

  const sessions = data?.sessions ?? [];
  const unlocked = sessions.filter((s) => s.status === 'unlocked');
  const previews = sessions.filter((s) => s.status !== 'unlocked' && s.imageUrl);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">AI Photo Studio</h1>
        <p className="mt-1 text-sm text-slate-500">
          Professional product photos generated with AI. Open any product to generate more.
        </p>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : isError ? (
        <p className="text-sm text-red-700">Failed to load AI photos.</p>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm font-medium text-slate-600">No AI photos yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Open a product and click "Generate AI Photo" to get started.
          </p>
        </div>
      ) : (
        <>
          {unlocked.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-slate-700">
                Unlocked photos ({unlocked.length})
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {unlocked.map((s) => (
                  <PhotoCard key={s.id} session={s} />
                ))}
              </div>
            </section>
          )}

          {previews.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-slate-700">
                Watermarked previews ({previews.length})
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {previews.map((s) => (
                  <PhotoCard key={s.id} session={s} preview />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function PhotoCard({ session, preview }: { session: AIPhotoSession; preview?: boolean }) {
  const date = new Date(session.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="aspect-square w-full bg-slate-100">
        {session.imageUrl ? (
          <img
            src={session.imageUrl}
            alt={session.productName ?? 'AI photo'}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-xs text-slate-400">No preview</span>
          </div>
        )}
        {preview && (
          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/40 to-transparent p-2">
            <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              PREVIEW
            </span>
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="truncate text-xs font-medium text-slate-800">
          {session.productName ?? 'Unknown product'}
        </p>
        <p className="text-[10px] text-slate-400">
          {session.style ?? '—'} · {date}
        </p>
      </div>
    </div>
  );
}
