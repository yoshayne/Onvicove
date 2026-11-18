import type { CSSProperties } from 'react';
import type { SectionDesign } from './sectionDesign';

// Themes render sections in fixed JSX order inside a flex-column root; this maps each
// section id to a CSS `order` so the page-builder drag order wins. Nav/modals keep order 0.
export function makeSectionOrder(visibleSections: string[] | undefined, designs?: Record<string, SectionDesign>) {
  return (id: string): CSSProperties => {
    const idx = visibleSections?.indexOf(id) ?? -1;
    const out: CSSProperties = { order: idx < 0 ? 1000 : idx + 1 };
    // The owner's spacing choice (Pro and Business); the hero keeps its own height
    const spacing = id === 'hero' ? undefined : designs?.[id]?.spacing;
    if (spacing === 'compact') { out.paddingTop = 32; out.paddingBottom = 32; }
    if (spacing === 'roomy') { out.paddingTop = 128; out.paddingBottom = 128; }
    return out;
  };
}
