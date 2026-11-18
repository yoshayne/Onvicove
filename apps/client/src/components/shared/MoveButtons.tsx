import type { DragEvent } from 'react';
import { ChevronUp, ChevronDown, GripVertical } from 'lucide-react';

type DragHandle = { draggable: boolean; onDragStart: (e: DragEvent<HTMLElement>) => void; onDragEnd: () => void };

/** A drag handle plus up / down arrows for putting a list in the owner's order (arrows work on a phone too) */
export default function MoveButtons({ index, count, onMove, label, drag }: { index: number; count: number; onMove: (delta: -1 | 1) => void; label: string; drag?: DragHandle }) {
  const cls = 'rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent';
  return (
    <div className="flex items-center gap-0.5">
      {drag && (
        <span {...drag} className="cursor-grab touch-none rounded p-0.5 text-slate-300 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing" title="Drag to reorder" aria-hidden>
          <GripVertical size={14} />
        </span>
      )}
      <div className="flex flex-col items-center">
        <button type="button" className={cls} disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Move ${label} up`}><ChevronUp size={14} /></button>
        <button type="button" className={cls} disabled={index === count - 1} onClick={() => onMove(1)} aria-label={`Move ${label} down`}><ChevronDown size={14} /></button>
      </div>
    </div>
  );
}
