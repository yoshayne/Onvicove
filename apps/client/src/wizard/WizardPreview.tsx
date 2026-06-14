import { useEffect, useState } from 'react';
import { useWizardStore } from './wizardStore';
import ThemeRenderer from '../themes/ThemeRenderer';
import type { ThemeProps, ProductData, ServiceData, StaffData } from '../themes/types';

export default function WizardPreview() {
  const {
    businessName,
    tagline,
    brandColor,
    mode,
    city,
    industry,
    themeId,
    heroImagePreviewUrl,
    logoPreviewUrl,
    products,
    services,
    staff,
  } = useWizardStore();

  const [isSwitching, setIsSwitching] = useState(false);
  const [renderedThemeId, setRenderedThemeId] = useState(themeId);

  useEffect(() => {
    if (themeId !== renderedThemeId) {
      setIsSwitching(true);
      const timeout = setTimeout(() => {
        setRenderedThemeId(themeId);
        setIsSwitching(false);
      }, 350);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [themeId, renderedThemeId]);

  const themeProps: ThemeProps = {
    theme: {
      companyName: businessName || 'Your Business',
      tagline,
      logoUrl: logoPreviewUrl,
      heroImageUrl: heroImagePreviewUrl,
      brandColor,
      mode,
      currency: 'USD',
      city,
      industry,
      themeId: renderedThemeId,
    },
    products: products.map(
      (p): ProductData => ({
        id: p.id,
        name: p.name || 'Untitled product',
        description: p.description,
        priceCents: p.priceCents,
        imageUrls: p.imageUrl ? [p.imageUrl] : [],
      })
    ),
    services: services.map(
      (s): ServiceData => ({
        id: s.id,
        name: s.name || 'Untitled service',
        description: s.description,
        priceCents: s.priceCents,
        durationMinutes: s.durationMinutes,
      })
    ),
    staff: staff.map((s): StaffData => ({ id: s.id, name: s.name })),
  };

  return (
    <div className="relative h-full w-full overflow-y-auto bg-white">
      {isSwitching && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-gray-500" />
            <p className="text-sm text-gray-500">Switching theme…</p>
          </div>
        </div>
      )}
      <div className={isSwitching ? 'pointer-events-none opacity-40' : ''}>
        <ThemeRenderer themeId={renderedThemeId} {...themeProps} />
      </div>
    </div>
  );
}
