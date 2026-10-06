import type { CSSProperties } from 'react';

// Themes render sections in fixed JSX order inside a flex-column root; this maps each
// section id to a CSS `order` so the page-builder drag order wins. Nav/modals keep order 0.
export function makeSectionOrder(visibleSections: string[] | undefined) {
  return (id: string): CSSProperties => {
    const idx = visibleSections?.indexOf(id) ?? -1;
    return { order: idx < 0 ? 1000 : idx + 1 };
  };
}
