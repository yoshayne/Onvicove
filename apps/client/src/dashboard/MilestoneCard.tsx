import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, PartyPopper, RefreshCw } from 'lucide-react';
import { useApi } from '../lib/api';
import Spinner from '../components/shared/Spinner';

interface Milestone {
  id: string;
  kind: string;
  reference_type: string | null;
  item_name: string | null;
  flyers: { format: string; label: string; url: string }[];
  generating: boolean;
  redos_left: number;
  can_generate: boolean;
}

/** "You made your first sale!" with free, shareable flyers (one free redo) */
export default function MilestoneCard() {
  const api = useApi();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['milestones'],
    queryFn: () => api.get<{ milestones: Milestone[] }>('/milestones'),
    // Flyers take a little while to make: check back until they're ready
    refetchInterval: (query) => (query.state.data?.milestones.some((m) => m.generating) ? 4000 : false),
  });
  const make = useMutation({
    mutationFn: (id: string) => api.post(`/milestones/${id}/flyers`, {}),
    onSuccess: () => setTimeout(() => qc.invalidateQueries({ queryKey: ['milestones'] }), 1500),
  });

  const first = q.data?.milestones.find((m) => m.kind === 'first_sale');
  if (!first) return null;
  const busy = first.generating || make.isPending;
  const hasFlyers = first.flyers.length > 0;

  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5">
      <div className="flex items-center gap-2">
        <PartyPopper size={20} className="text-amber-600" />
        <h2 className="text-lg font-semibold text-slate-900">{first.reference_type === 'booking' ? 'You got your first booking!' : 'You made your first sale!'}</h2>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        {first.item_name ? <>“{first.item_name}” {first.reference_type === 'booking' ? 'was just booked' : 'just sold'}. </> : null}
        Share the news. Here {hasFlyers ? 'are your flyers, free' : 'is a free flyer for you'}.
      </p>

      {busy && (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
          <Spinner /> Designing your flyer… this takes about a minute.
        </div>
      )}

      {!busy && hasFlyers && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
          {first.flyers.map((f) => (
            <div key={f.format} className="flex flex-col gap-2">
              <img src={f.url} alt={f.label} className="w-full rounded-lg border border-slate-200 object-cover" />
              <a href={f.url} download={`first-${first.reference_type === 'booking' ? 'booking' : 'sale'}-${f.format}.png`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700">
                <Download size={14} /> {f.label}
              </a>
            </div>
          ))}
        </div>
      )}

      {!busy && first.can_generate && (
        <button
          type="button"
          onClick={() => make.mutate(first.id)}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw size={14} />
          {hasFlyers ? 'Not feeling it? Redo it (1 free redo)' : 'Create my flyer (free)'}
        </button>
      )}
      {!busy && hasFlyers && !first.can_generate && <p className="mt-3 text-xs text-slate-500">You've used your free redo.</p>}
      {make.isError && <p className="mt-2 text-sm text-red-600">{(make.error as Error).message}</p>}
    </div>
  );
}
