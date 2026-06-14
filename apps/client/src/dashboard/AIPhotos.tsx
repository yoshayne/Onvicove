import { useQuery } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import Spinner from '../components/shared/Spinner';

interface AIPhotoStyle {
  id: string;
  name: string;
  prompt: string;
}

export default function AIPhotos() {
  const api = useApi();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ai-photo-styles'],
    queryFn: () => api.get<{ styles: AIPhotoStyle[] }>('/ai-photos/styles'),
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-slate-900">AI Photos</h1>
      <div className="rounded-lg border border-slate-200 bg-amber-50 p-4 text-sm text-amber-800">
        Use the AI Photo tool from the Products page during product setup to generate styled
        photography for your items.
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Available AI photo styles</h2>
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : isError ? (
          <p className="text-sm text-red-700">Failed to load AI photo styles.</p>
        ) : !data?.styles.length ? (
          <p className="text-sm text-slate-500">No styles available.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.styles.map((style) => (
              <div key={style.id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium text-slate-900">{style.name}</p>
                <p className="mt-1 text-xs text-slate-500">{style.prompt}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
