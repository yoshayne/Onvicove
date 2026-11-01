import { useEffect, useState } from 'react';
import { useWizardStore } from './wizardStore';
import ThemeRenderer from '../themes/ThemeRenderer';
import type { ThemeProps, ProductData, ServiceData, StaffData } from '../themes/types';
import { demoContentFor } from '../themes/shared/demoContent';

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

  // Until the owner adds their own, show example photos, products, services and team so the theme looks like a
  // finished site. Their own items win; an item with no photo borrows a sample one so they see how photos sit.
  const demo = demoContentFor(renderedThemeId);
  const heroImageUrl = heroImagePreviewUrl || demo.heroImageUrl;
  const productList: ProductData[] =
    products.length > 0
      ? products.map((p, i) => ({
          id: p.id,
          name: p.name || 'Untitled product',
          description: p.description,
          priceCents: p.priceCents,
          imageUrls: p.imageUrl ? [p.imageUrl] : demo.products[i % Math.max(demo.products.length, 1)]?.imageUrls ?? [],
        }))
      : demo.products;
  const serviceList: ServiceData[] =
    services.length > 0
      ? services.map((s, i) => ({
          id: s.id,
          name: s.name || 'Untitled service',
          description: s.description,
          priceCents: s.priceCents,
          durationMinutes: s.durationMinutes,
          category: s.category,
          imageUrls: s.imageUrl ? [s.imageUrl] : demo.services[i % Math.max(demo.services.length, 1)]?.imageUrls ?? [],
        }))
      : demo.services;
  const staffList: StaffData[] = staff.length > 1
    ? staff.map((s, i): StaffData => ({ id: s.id, name: s.name || 'Team member', avatarUrl: demo.staff[i]?.avatarUrl }))
    : demo.staff;
  const usingSamples = !heroImagePreviewUrl || products.some((p) => !p.imageUrl) || products.length === 0 || services.length === 0;

  const themeProps: ThemeProps = {
    theme: {
      companyName: businessName || 'Your Business',
      tagline,
      logoUrl: logoPreviewUrl,
      heroImageUrl,
      brandColor,
      mode,
      currency: 'USD',
      city,
      industry,
      themeId: renderedThemeId,
    },
    products: productList,
    services: serviceList,
    staff: staffList,
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
      {usingSamples && !isSwitching && (
        <p className="pointer-events-none sticky top-2 z-20 mx-auto mt-2 w-fit rounded-full bg-black/70 px-3 py-1 text-[11px] font-medium text-white backdrop-blur">
          Sample photos and items. Yours replace them as you add them.
        </p>
      )}
      <div className={isSwitching ? 'pointer-events-none opacity-40' : ''}>
        <ThemeRenderer themeId={renderedThemeId} {...themeProps} />
      </div>
    </div>
  );
}
