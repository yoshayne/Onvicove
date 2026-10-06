import type { GallerySectionData } from './Gallery';

/**
 * Returns galleries that fall between two fixed section IDs in the ordered
 * visibleSections array, so themes can render them at the correct position.
 *
 * @param galleries   - All gallery sections (enabled, with images)
 * @param visibleSections - Ordered array of enabled section IDs from page builder
 * @param afterId     - Render galleries that appear AFTER this section ID
 * @param beforeId    - Render galleries that appear BEFORE this section ID (omit = end of list)
 */
export function galleriesInSlot(
  galleries: GallerySectionData[],
  visibleSections: string[] | undefined,
  afterId: string,
  beforeId?: string,
): GallerySectionData[] {
  if (!visibleSections || visibleSections.length === 0) return [];
  const afterIdx = visibleSections.indexOf(afterId);
  const beforeIdx = beforeId !== undefined ? visibleSections.indexOf(beforeId) : visibleSections.length;
  const effectiveBefore = beforeIdx < 0 ? visibleSections.length : beforeIdx;

  return galleries.filter((g) => {
    if (!g.enabled || !g.images.length) return false;
    const idx = visibleSections.indexOf(g.id);
    if (idx < 0) return false;
    return idx > afterIdx && idx < effectiveBefore;
  });
}

/** Render helper type for Gallery JSX — avoids importing Gallery in this util */
export type GallerySlotProps = Pick<GallerySectionData, 'id' | 'layout' | 'images' | 'title'>;
