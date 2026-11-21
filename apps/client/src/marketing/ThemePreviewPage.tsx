import { useParams } from 'react-router-dom';
import { FullPreview, SHOWCASE_THEME_IDS } from './ThemeShowcase';
import type { ThemeId } from '../themes/types';

/** One theme with sample content, full page. The home page shows this inside a frame so it keeps its real proportions. */
export default function ThemePreviewPage() {
  const { id } = useParams<{ id: string }>();
  if (!id || !SHOWCASE_THEME_IDS.includes(id as ThemeId)) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Theme not found.</div>;
  }
  return <FullPreview themeId={id as ThemeId} />;
}
