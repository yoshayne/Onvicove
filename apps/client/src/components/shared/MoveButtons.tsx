import { ChevronUp, ChevronDown } from 'lucide-react';

/** Up / down arrows for putting a list in the owner's order (works the same on a phone as with a mouse) */
export default function MoveButtons({ index, count, onMove, label }: { index: number; count: number; onMove: (delta: -1 | 1) => void; label: string }) {
  const cls = 'rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent';
  return (
    <div className="flex flex-col items-center">
      <button type="button" className={cls} disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Move ${label} up`}><ChevronUp size={14} /></button>
      <button type="button" className={cls} disabled={index === count - 1} onClick={() => onMove(1)} aria-label={`Move ${label} down`}><ChevronDown size={14} /></button>
    </div>
  );
}
