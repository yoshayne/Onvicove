import { useRef, useState, type DragEvent } from 'react';

/** Move the item at `from` to position `to` (what dragging a row does) */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

/**
 * Drag-and-drop for a list: grab the handle of one row and drop it on another. Touch screens have no HTML5
 * drag events, so the up / down arrows next to the handle always stay as the way to reorder on a phone.
 */
export function useDragReorder(onMove: (from: number, to: number) => void) {
  const dragging = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  return {
    /** Index of the row currently under the dragged one (to draw a drop marker) */
    over,
    dragging: dragging.current,
    handleProps: (i: number) => ({
      draggable: true,
      onDragStart: (e: DragEvent<HTMLElement>) => {
        dragging.current = i;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(i));
        const row = e.currentTarget.closest('[data-drag-row]');
        if (row) e.dataTransfer.setDragImage(row, 16, 16);
      },
      onDragEnd: () => { dragging.current = null; setOver(null); },
    }),
    rowProps: (i: number) => ({
      'data-drag-row': true as const,
      onDragOver: (e: DragEvent<HTMLElement>) => {
        if (dragging.current === null) return;
        e.preventDefault();
        if (over !== i) setOver(i);
      },
      onDrop: (e: DragEvent<HTMLElement>) => {
        e.preventDefault();
        const from = dragging.current;
        dragging.current = null;
        setOver(null);
        if (from !== null && from !== i) onMove(from, i);
      },
    }),
  };
}
