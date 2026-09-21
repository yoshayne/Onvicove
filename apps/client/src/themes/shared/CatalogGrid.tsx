import { useState, useEffect } from 'react';
import type { ProductData, ServiceData, ProductLayout, ServiceLayout } from '../types';
import { formatPrice } from '../types';

// ── Visitor toggle icons ───────────────────────────────────────────────────────

function GridIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={active ? 'opacity-100' : 'opacity-40'}>
      <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor" />
      <rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor" />
      <rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor" />
      <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" />
    </svg>
  );
}

function ListIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={active ? 'opacity-100' : 'opacity-40'}>
      <rect x="1" y="2" width="14" height="3" rx="1" fill="currentColor" />
      <rect x="1" y="7" width="14" height="3" rx="1" fill="currentColor" />
      <rect x="1" y="12" width="14" height="3" rx="1" fill="currentColor" />
    </svg>
  );
}

// ── View toggle (visitor-side) ─────────────────────────────────────────────────

type VisitorView = 'grid' | 'list';

function useVisitorView(storeSlug: string, section: string, defaultView: VisitorView): [VisitorView, (v: VisitorView) => void] {
  const key = `catalog-view:${storeSlug}:${section}`;
  const [view, setViewState] = useState<VisitorView>(() => {
    try { return (localStorage.getItem(key) as VisitorView) || defaultView; } catch { return defaultView; }
  });
  function setView(v: VisitorView) {
    setViewState(v);
    try { localStorage.setItem(key, v); } catch {}
  }
  return [view, setView];
}

interface ToggleProps {
  view: VisitorView;
  onChange: (v: VisitorView) => void;
  accentColor?: string;
}

function ViewToggle({ view, onChange, accentColor = '#111' }: ToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-current/10 p-1" style={{ color: accentColor }}>
      <button
        type="button"
        aria-label="Grid view"
        onClick={() => onChange('grid')}
        className="rounded p-1 transition-colors"
        style={{ background: view === 'grid' ? `${accentColor}18` : 'transparent' }}
      >
        <GridIcon active={view === 'grid'} />
      </button>
      <button
        type="button"
        aria-label="List view"
        onClick={() => onChange('list')}
        className="rounded p-1 transition-colors"
        style={{ background: view === 'list' ? `${accentColor}18` : 'transparent' }}
      >
        <ListIcon active={view === 'list'} />
      </button>
    </div>
  );
}

// ── Product layouts ────────────────────────────────────────────────────────────

interface ProductGridProps {
  products: ProductData[];
  layout: ProductLayout;
  currency?: string;
  paymentsEnabled?: boolean;
  accentColor?: string;
  textColor?: string;
  surfaceColor?: string;
  onSelect: (p: ProductData) => void;
}

function ProductListRow({ product, currency, paymentsEnabled, accentColor, textColor, onSelect }: {
  product: ProductData; currency?: string; paymentsEnabled?: boolean;
  accentColor?: string; textColor?: string; onSelect: (p: ProductData) => void;
}) {
  return (
    <div
      className="flex items-center gap-4 py-4 cursor-pointer group"
      style={{ borderBottom: `1px solid ${textColor ?? '#111'}18` }}
      onClick={() => onSelect(product)}
    >
      <div className="w-16 h-16 shrink-0 overflow-hidden rounded-lg bg-black/5">
        {product.imageUrls?.[0] && (
          <img src={product.imageUrls[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate" style={{ color: textColor }}>{product.name}</p>
        {product.description && (
          <p className="text-sm opacity-50 truncate mt-0.5">{product.description}</p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="font-semibold text-sm" style={{ color: accentColor ?? textColor }}>{formatPrice(product.priceCents, currency)}</p>
        <p className="text-xs opacity-40 mt-0.5">{paymentsEnabled ? 'Add to cart →' : 'View →'}</p>
      </div>
    </div>
  );
}

export function ProductCatalog({
  products, layout, currency, paymentsEnabled, accentColor, textColor, surfaceColor,
  onSelect, slug = '', allowToggle = true,
}: ProductGridProps & { slug?: string; allowToggle?: boolean }) {
  // Visitor view: list toggle overrides layout grid variants
  const defaultView: VisitorView = layout === 'list' ? 'list' : 'grid';
  const [visitorView, setVisitorView] = useVisitorView(slug, 'products', defaultView);

  // Effective layout: if visitor chose list, show list regardless of tenant layout
  const effectiveLayout = visitorView === 'list' ? 'list' : layout;

  const cols =
    effectiveLayout === 'grid-2' ? 'grid-cols-1 sm:grid-cols-2' :
    effectiveLayout === 'magazine' ? 'grid-cols-1' :
    effectiveLayout === 'masonry' ? 'grid-cols-2 sm:grid-cols-3' :
    'grid-cols-2 lg:grid-cols-4'; // grid-4 default

  if (effectiveLayout === 'list') {
    return (
      <div>
        {allowToggle && (
          <div className="flex justify-end mb-4">
            <ViewToggle view={visitorView} onChange={setVisitorView} accentColor={accentColor ?? textColor} />
          </div>
        )}
        <div>
          {products.map((p) => (
            <ProductListRow key={p.id} product={p} currency={currency} paymentsEnabled={paymentsEnabled}
              accentColor={accentColor} textColor={textColor} onSelect={onSelect} />
          ))}
        </div>
      </div>
    );
  }

  if (effectiveLayout === 'magazine') {
    const [hero, ...rest] = products;
    return (
      <div>
        {allowToggle && (
          <div className="flex justify-end mb-4">
            <ViewToggle view={visitorView} onChange={setVisitorView} accentColor={accentColor ?? textColor} />
          </div>
        )}
        <div className="flex flex-col gap-6">
          {hero && (
            <div className="grid md:grid-cols-2 gap-6 cursor-pointer group" onClick={() => onSelect(hero)}>
              <div className="aspect-[4/3] overflow-hidden rounded-xl" style={{ background: surfaceColor }}>
                {hero.imageUrls?.[0] && <img src={hero.imageUrls[0]} alt={hero.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
              </div>
              <div className="flex flex-col justify-center gap-3">
                <p className="text-xs uppercase tracking-widest opacity-40">Featured</p>
                <h3 className="text-3xl font-bold leading-tight" style={{ color: textColor }}>{hero.name}</h3>
                {hero.description && <p className="opacity-60 text-sm leading-relaxed line-clamp-3">{hero.description}</p>}
                <p className="text-2xl font-bold" style={{ color: accentColor ?? textColor }}>{formatPrice(hero.priceCents, currency)}</p>
                <button type="button" onClick={(e) => { e.stopPropagation(); onSelect(hero); }}
                  className="self-start rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{ background: accentColor ?? textColor, color: surfaceColor ?? '#fff' }}>
                  {paymentsEnabled ? 'Add to Cart' : 'View Details'}
                </button>
              </div>
            </div>
          )}
          {rest.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {rest.map((p) => (
                <ProductCard key={p.id} product={p} currency={currency} paymentsEnabled={paymentsEnabled}
                  accentColor={accentColor} textColor={textColor} surfaceColor={surfaceColor} onSelect={onSelect} compact />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // masonry: CSS columns trick
  if (effectiveLayout === 'masonry') {
    return (
      <div>
        {allowToggle && (
          <div className="flex justify-end mb-4">
            <ViewToggle view={visitorView} onChange={setVisitorView} accentColor={accentColor ?? textColor} />
          </div>
        )}
        <div className="columns-2 sm:columns-3 gap-4 space-y-4">
          {products.map((p, i) => (
            <div key={p.id} className="break-inside-avoid cursor-pointer group" onClick={() => onSelect(p)}
              style={{ marginBottom: '1rem' }}>
              <div className={`overflow-hidden rounded-lg ${i % 3 === 0 ? 'aspect-[3/4]' : i % 3 === 1 ? 'aspect-square' : 'aspect-[4/3]'}`}
                style={{ background: surfaceColor }}>
                {p.imageUrls?.[0] && <img src={p.imageUrls[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />}
              </div>
              <div className="mt-2 px-1">
                <p className="text-sm font-medium" style={{ color: textColor }}>{p.name}</p>
                <p className="text-sm font-bold mt-0.5" style={{ color: accentColor ?? textColor }}>{formatPrice(p.priceCents, currency)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // grid-2 and grid-4
  return (
    <div>
      {allowToggle && (
        <div className="flex justify-end mb-4">
          <ViewToggle view={visitorView} onChange={setVisitorView} accentColor={accentColor ?? textColor} />
        </div>
      )}
      <div className={`grid gap-x-6 gap-y-10 ${cols}`}>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} currency={currency} paymentsEnabled={paymentsEnabled}
            accentColor={accentColor} textColor={textColor} surfaceColor={surfaceColor} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function ProductCard({ product, currency, paymentsEnabled, accentColor, textColor, surfaceColor, onSelect, compact = false }: {
  product: ProductData; currency?: string; paymentsEnabled?: boolean;
  accentColor?: string; textColor?: string; surfaceColor?: string;
  onSelect: (p: ProductData) => void; compact?: boolean;
}) {
  return (
    <div className="group cursor-pointer" onClick={() => onSelect(product)}>
      <div className={`overflow-hidden rounded-lg ${compact ? 'aspect-square' : 'aspect-[3/4]'} mb-3`} style={{ background: surfaceColor ?? '#f5f5f5' }}>
        {product.imageUrls?.[0] && (
          <img src={product.imageUrls[0]} alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        )}
      </div>
      <p className={`font-medium ${compact ? 'text-sm' : 'text-base'} leading-snug`} style={{ color: textColor }}>{product.name}</p>
      <p className={`font-bold mt-1 ${compact ? 'text-sm' : ''}`} style={{ color: accentColor ?? textColor }}>{formatPrice(product.priceCents, currency)}</p>
      {!compact && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onSelect(product); }}
          className="mt-2 text-xs font-semibold uppercase tracking-wider opacity-50 hover:opacity-100 transition-opacity"
          style={{ color: textColor }}>
          {paymentsEnabled ? 'Add to Cart' : 'View Details'}
        </button>
      )}
    </div>
  );
}

// ── Service layouts ────────────────────────────────────────────────────────────

interface ServiceCatalogProps {
  services: ServiceData[];
  layout: ServiceLayout;
  currency?: string;
  paymentsEnabled?: boolean;
  accentColor?: string;
  textColor?: string;
  surfaceColor?: string;
  slug?: string;
  allowToggle?: boolean;
  onBook: (s: ServiceData) => void;
}

export function ServiceCatalog({
  services, layout, currency, paymentsEnabled, accentColor, textColor, surfaceColor,
  slug = '', allowToggle = true, onBook,
}: ServiceCatalogProps) {
  const defaultView: VisitorView = layout === 'list' ? 'list' : 'grid';
  const [visitorView, setVisitorView] = useVisitorView(slug, 'services', defaultView);
  const effectiveLayout: ServiceLayout = visitorView === 'list' ? 'list' : layout;

  if (effectiveLayout === 'pricing-table') {
    return (
      <div>
        {allowToggle && (
          <div className="flex justify-end mb-4">
            <ViewToggle view={visitorView} onChange={setVisitorView} accentColor={accentColor ?? textColor} />
          </div>
        )}
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: `${textColor ?? '#111'}18` }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: `${textColor ?? '#111'}08`, borderBottom: `1px solid ${textColor ?? '#111'}18` }}>
                <th className="px-5 py-3 text-left font-semibold" style={{ color: textColor }}>Service</th>
                <th className="px-5 py-3 text-left font-semibold opacity-60" style={{ color: textColor }}>Duration</th>
                <th className="px-5 py-3 text-right font-semibold" style={{ color: textColor }}>Price</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {services.map((s, i) => (
                <tr key={s.id} style={{ borderTop: i > 0 ? `1px solid ${textColor ?? '#111'}10` : undefined }}>
                  <td className="px-5 py-4">
                    <p className="font-medium" style={{ color: textColor }}>{s.name}</p>
                    {s.description && <p className="text-xs opacity-50 mt-0.5 line-clamp-1">{s.description}</p>}
                  </td>
                  <td className="px-5 py-4 opacity-50" style={{ color: textColor }}>{s.durationMinutes} min</td>
                  <td className="px-5 py-4 text-right font-bold" style={{ color: accentColor ?? textColor }}>
                    {formatPrice(s.priceCents, currency)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button type="button" onClick={() => onBook(s)} disabled={!paymentsEnabled}
                      className="rounded-full px-4 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-30"
                      style={{ background: accentColor ?? textColor, color: surfaceColor ?? '#fff' }}>
                      Book
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (effectiveLayout === 'list') {
    return (
      <div>
        {allowToggle && (
          <div className="flex justify-end mb-4">
            <ViewToggle view={visitorView} onChange={setVisitorView} accentColor={accentColor ?? textColor} />
          </div>
        )}
        <div className="flex flex-col gap-3">
          {services.map((s) => (
            <ServiceListRow key={s.id} service={s} currency={currency} paymentsEnabled={paymentsEnabled}
              accentColor={accentColor} textColor={textColor} surfaceColor={surfaceColor} onBook={onBook} />
          ))}
        </div>
      </div>
    );
  }

  // cards (default)
  return (
    <div>
      {allowToggle && (
        <div className="flex justify-end mb-4">
          <ViewToggle view={visitorView} onChange={setVisitorView} accentColor={accentColor ?? textColor} />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((s) => (
          <ServiceCard key={s.id} service={s} currency={currency} paymentsEnabled={paymentsEnabled}
            accentColor={accentColor} textColor={textColor} surfaceColor={surfaceColor} onBook={onBook} />
        ))}
      </div>
    </div>
  );
}

function ServiceListRow({ service, currency, paymentsEnabled, accentColor, textColor, surfaceColor, onBook }: {
  service: ServiceData; currency?: string; paymentsEnabled?: boolean;
  accentColor?: string; textColor?: string; surfaceColor?: string; onBook: (s: ServiceData) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${textColor ?? '#111'}15` }}>
      <button type="button" className="w-full flex items-center gap-4 px-5 py-4 text-left"
        onClick={() => setOpen((v) => !v)}>
        {service.imageUrls?.[0] && (
          <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden">
            <img src={service.imageUrls[0]} alt={service.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold" style={{ color: textColor }}>{service.name}</p>
          <p className="text-xs opacity-50 mt-0.5">{service.durationMinutes} min</p>
        </div>
        <div className="shrink-0 flex items-center gap-3">
          <p className="font-bold text-sm" style={{ color: accentColor ?? textColor }}>{formatPrice(service.priceCents, currency)}</p>
          <span className="opacity-40 text-sm" style={{ color: textColor }}>{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div className="px-5 pb-4 flex items-end justify-between gap-4" style={{ borderTop: `1px solid ${textColor ?? '#111'}10` }}>
          {service.description && (
            <p className="text-sm opacity-60 leading-relaxed flex-1" style={{ color: textColor }}>{service.description}</p>
          )}
          <button type="button" onClick={() => onBook(service)} disabled={!paymentsEnabled}
            className="shrink-0 rounded-full px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-30"
            style={{ background: accentColor ?? textColor, color: surfaceColor ?? '#fff' }}>
            {paymentsEnabled ? 'Book Now' : 'Coming Soon'}
          </button>
        </div>
      )}
    </div>
  );
}

function ServiceCard({ service, currency, paymentsEnabled, accentColor, textColor, surfaceColor, onBook }: {
  service: ServiceData; currency?: string; paymentsEnabled?: boolean;
  accentColor?: string; textColor?: string; surfaceColor?: string; onBook: (s: ServiceData) => void;
}) {
  return (
    <div className="rounded-xl overflow-hidden flex flex-col" style={{ border: `1px solid ${textColor ?? '#111'}15`, background: surfaceColor }}>
      {service.imageUrls?.[0] && (
        <div className="aspect-[4/3] overflow-hidden">
          <img src={service.imageUrls[0]} alt={service.name} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex flex-col flex-1 p-5 gap-3">
        <div>
          <h3 className="font-semibold text-base" style={{ color: textColor }}>{service.name}</h3>
          {service.description && <p className="text-sm opacity-60 mt-1 line-clamp-2 leading-relaxed">{service.description}</p>}
        </div>
        <div className="flex items-center justify-between text-sm mt-auto">
          <span className="opacity-50" style={{ color: textColor }}>{service.durationMinutes} min</span>
          <span className="font-bold" style={{ color: accentColor ?? textColor }}>{formatPrice(service.priceCents, currency)}</span>
        </div>
        <button type="button" onClick={() => onBook(service)} disabled={!paymentsEnabled}
          className="w-full rounded-lg py-2.5 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-30"
          style={{ background: accentColor ?? textColor, color: surfaceColor === '#fff' || !surfaceColor ? '#fff' : surfaceColor }}>
          {paymentsEnabled ? 'Book Now' : 'Coming Soon'}
        </button>
      </div>
    </div>
  );
}
