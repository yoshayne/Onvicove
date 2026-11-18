import { useState, type CSSProperties } from 'react';
import { MapPin, Phone, Clock, ShoppingBag, Star } from 'lucide-react';
import type { ThemeProps } from '../types';
import { formatPrice, formatServicePrice } from '../types';
import type { BookingFirstPreset } from './presets';
import PresetBookingModal from './PresetBookingModal';
import PresetCartDrawer from './PresetCartDrawer';
import { staffForService } from '../shared/bookingFlow';
import CheckoutModal from '../shared/CheckoutModal';
import BookingStatusOverlay from '../shared/BookingStatusOverlay';
import ProductQuickView from '../shared/ProductQuickView';
import CustomOrderModal from '../shared/CustomOrderModal';
import Gallery from '../shared/Gallery';
import TestimonialsBlock from '../shared/TestimonialsBlock';
import FaqBlock from '../shared/FaqBlock';
import AboutBlock from '../shared/AboutBlock';
import { useStorefrontCommerce } from '../shared/useStorefrontCommerce';
import { useStorefrontForms } from '../shared/useStorefrontForms';
import { makeSectionOrder } from '../shared/sectionOrder';
import type { SectionDesign } from '../shared/sectionDesign';

const V = {
  bg: 'var(--bf-bg)', surface: 'var(--bf-surface)', text: 'var(--bf-text)', muted: 'var(--bf-muted)', border: 'var(--bf-border)',
  accent: 'var(--bf-accent)', onAccent: 'var(--bf-on-accent)',
};

/** 0 (black) to 1 (white), for deciding whether text on a colour should be light or dark */
function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

/**
 * The booking-first page shared by the Barber, Studio and Ink themes: your services and a Book button come first,
 * then your team, your work, reviews and your shop. Look and feel come from the preset.
 */
export default function BookingFirstStorefront({ preset: p, theme, products, services, staff, galleries = [], visibleSections, sectionDesigns }: ThemeProps & { preset: BookingFirstPreset }) {
  const [customOrderOpen, setCustomOrderOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [proFilter, setProFilter] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState('');
  const { subscribe, subscribeStatus, submitCustomOrder, customOrderStatus } = useStorefrontForms(theme.slug ?? '');
  const {
    cart, cartOpen, setCartOpen, addToCart, updateCartQuantity, removeFromCart,
    quickViewProduct, openQuickView, closeQuickView,
    checkoutOpen, openCheckout, closeCheckout, orderStatus, orderError, orderNumber, submitOrder,
    orderClientSecret, orderAmountCents, confirmOrderPayment, cancelOrderPayment,
    bookingService, bookingOpen, openBooking, closeBooking, selectedDate, selectedSlot,
    availableSlots, selectBookingDate, selectBookingSlot, bookingStatus, bookingError,
    confirmBooking, confirmBookingPayment, cancelBookingPayment, dismissBookingStatus,
    bookingClientSecret, bookingAmountCents,
    selectedStaffId, setSelectedStaffId, isDateClosed, bookingCityLabel,
  } = useStorefrontCommerce(theme.slug);

  const accent = V.accent;
  const radius = p.radius;
  const sec = (id: string) => !visibleSections || visibleSections.includes(id);
  const ord = makeSectionOrder(visibleSections);

  // Colours are CSS variables so any section can switch palette (the owner's "background" choice) without its
  // content being rewritten: a section just redefines the variables for everything inside it.
  const rootVars = {
    '--bf-bg': p.bg, '--bf-surface': p.surface, '--bf-text': p.text, '--bf-muted': p.muted, '--bf-border': p.border,
    '--bf-accent': `var(--brand-color, ${p.accent})`, '--bf-on-accent': p.onAccent,
  } as CSSProperties;
  const darkTheme = luminance(p.bg) < 0.5;
  const brandHex = /^#[0-9a-f]{6}$/i.test(theme.brandColor ?? '') ? (theme.brandColor as string) : p.accent;
  const onBrand = luminance(brandHex) < 0.5 ? '#ffffff' : '#111111';
  const palettes: Record<'soft' | 'contrast' | 'accent', Record<string, string>> = {
    soft: { '--bf-bg': p.surface, '--bf-surface': p.bg },
    contrast: darkTheme
      ? { '--bf-bg': '#f4f4f5', '--bf-surface': '#ffffff', '--bf-text': '#111111', '--bf-muted': 'rgba(17,17,17,0.62)', '--bf-border': 'rgba(0,0,0,0.14)', '--bf-accent': '#111111', '--bf-on-accent': '#ffffff' }
      : { '--bf-bg': '#111111', '--bf-surface': '#1c1c1c', '--bf-text': '#f4f4f5', '--bf-muted': 'rgba(244,244,245,0.62)', '--bf-border': 'rgba(255,255,255,0.16)', '--bf-accent': '#f4f4f5', '--bf-on-accent': '#111111' },
    accent: {
      '--bf-bg': `var(--brand-color, ${brandHex})`, '--bf-surface': onBrand === '#ffffff' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)', '--bf-text': onBrand,
      '--bf-muted': onBrand === '#ffffff' ? 'rgba(255,255,255,0.75)' : 'rgba(17,17,17,0.7)', '--bf-border': onBrand === '#ffffff' ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.2)',
      '--bf-accent': onBrand, '--bf-on-accent': `var(--brand-color, ${brandHex})`,
    },
  };
  const design = (id: string): SectionDesign => sectionDesigns?.[id] ?? {};
  /** Style for a section's outer element: its place in the page, plus the owner's background and spacing */
  const dz = (id: string, opts: { padded?: boolean } = {}): CSSProperties => {
    const d = design(id);
    const out: Record<string, unknown> = { ...ord(id) };
    if (d.bg && d.bg !== 'default') Object.assign(out, palettes[d.bg], { background: 'var(--bf-bg)', color: 'var(--bf-text)' });
    if (opts.padded) {
      if (d.spacing === 'compact') { out.paddingTop = 20; out.paddingBottom = 20; }
      if (d.spacing === 'roomy') { out.paddingTop = 88; out.paddingBottom = 88; }
    }
    return out as CSSProperties;
  };
  const alignClass = (id: string) => (design(id).align === 'center' ? 'mx-auto' : design(id).align === 'right' ? 'ml-auto' : '');
  const justifyClass = (id: string) => (design(id).align === 'center' ? 'justify-center' : design(id).align === 'right' ? 'justify-end' : '');
  /** Section heading with the owner's title, intro and alignment */
  const head = (id: string, fallback: string, cls = 'text-2xl md:text-3xl') => (
    <div className="mb-5" style={{ textAlign: design(id).align }}>
      <h2 className={cls} style={heading}>{design(id).title?.trim() || fallback}</h2>
      {design(id).intro?.trim() && <p className={`mt-2 max-w-2xl text-base ${alignClass(id)}`} style={{ color: V.muted }}>{design(id).intro}</p>}
    </div>
  );

  const hasStoreMode = theme.mode === 'store' || theme.mode === 'both';
  const hasBookMode = theme.mode === 'book' || theme.mode === 'both';
  // Real data when there is any; example content only so an empty preview isn't blank
  const displayServices = services.length > 0 ? services : p.services;
  const displayProducts = products.length > 0 ? products : p.products;
  const showServices = hasBookMode && sec('services');
  const showProducts = hasStoreMode && products.length > 0 && sec('featured-products');
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const heading = { fontFamily: p.headingFont, fontWeight: p.id === 'roster' ? 800 : undefined, textTransform: p.uppercaseHeadings ? ('uppercase' as const) : undefined, letterSpacing: p.uppercaseHeadings ? '0.04em' : undefined };
  const rounded = (n = 1) => Math.min(radius * n, 999);
  const btn = (solid: boolean): React.CSSProperties => ({
    background: solid ? accent : 'transparent',
    color: solid ? V.onAccent : V.text,
    border: solid ? '1px solid transparent' : `1px solid ${V.border}`,
    borderRadius: rounded(2),
  });

  // Services grouped by category, in the order the owner arranged them
  const groups: { name: string; items: typeof displayServices }[] = [];
  for (const sv of displayServices) {
    const key = sv.category?.trim() || '';
    let g = groups.find((x) => x.name === key);
    if (!g) {
      g = { name: key, items: [] };
      groups.push(g);
    }
    g.items.push(sv);
  }
  groups.sort((a, b) => (a.name === '' ? 1 : 0) - (b.name === '' ? 1 : 0));
  const showTabs = groups.length > 1;

  const ratings = (theme.testimonials ?? []).map((t) => t.rating).filter((r): r is number => typeof r === 'number');
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
  const phoneHref = theme.contactPhone ? `tel:${theme.contactPhone.replace(/[^+\d]/g, '')}` : null;
  const mapsHref = theme.contactAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(theme.contactAddress)}` : null;

  const galleryEls = galleries
    .filter((g) => g.enabled && g.images.length > 0)
    .map((g) => (
      <div key={g.id} style={{ background: V.bg, color: V.text, ...dz(g.id) }}>
        <Gallery layout={g.layout} images={g.images} title={g.title} />
      </div>
    ));
  const galleryFirst = p.galleryFirst && !visibleSections;

  const section = 'mx-auto w-full max-w-5xl px-5 py-10 md:py-14';

  return (
    <div className="flex min-h-screen flex-col pb-24 md:pb-0" style={{ ...rootVars, background: V.bg, color: V.text, fontFamily: p.bodyFont }}>
      {/* Top bar */}
      <header className="sticky top-0 z-40" style={{ background: V.bg, borderBottom: `1px solid ${V.border}` }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-3">
            {theme.logoUrl && <img src={theme.logoUrl} alt="" className="h-8 w-8 object-cover" style={{ borderRadius: rounded(1) }} />}
            <span className="text-lg" style={heading}>{theme.companyName}</span>
          </div>
          <div className="flex items-center gap-3">
            {showProducts && (
              <button type="button" aria-label="Open cart" onClick={() => setCartOpen(true)} className="relative p-1" style={{ color: V.text }}>
                <ShoppingBag size={20} />
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold" style={{ background: accent, color: V.onAccent }}>{cartCount}</span>
                )}
              </button>
            )}
            {showServices && (
              <a href="#services" className="hidden px-5 py-2 text-xs font-bold uppercase tracking-widest sm:inline-block" style={btn(true)}>Book now</a>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      {sec('hero') && (
        <section className="relative" style={{ ...ord('hero'), minHeight: 300 }}>
          <div
            className="absolute inset-0"
            style={{
              background: theme.heroImageUrl ? `url(${theme.heroImageUrl}) center/cover` : p.heroFallback,
              opacity: theme.heroImageUrl ? (theme.heroImageOpacity != null ? theme.heroImageOpacity / 100 : 1) : 1,
            }}
          />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, var(--bf-bg) 0%, color-mix(in srgb, var(--bf-bg) 80%, transparent) 30%, transparent 75%)` }} />
          <div
            className="relative mx-auto flex max-w-5xl flex-col justify-end px-5 pb-8 pt-28 md:pt-40"
            style={{ textAlign: design('hero').align, ...(design('hero').spacing === 'compact' ? { paddingTop: 64 } : design('hero').spacing === 'roomy' ? { paddingTop: 220 } : {}) }}
          >
            <h1 className="text-4xl md:text-6xl" style={heading}>{theme.companyName}</h1>
            {(theme.tagline || p.tagline) && <p className={`mt-2 max-w-xl text-base md:text-lg ${alignClass('hero')}`} style={{ color: V.muted }}>{theme.tagline || p.tagline}</p>}
            <div className={`mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm ${justifyClass('hero')}`} style={{ color: V.muted }}>
              {avg !== null && (
                <span className="inline-flex items-center gap-1" style={{ color: V.text }}>
                  <Star size={14} fill="currentColor" /> {avg.toFixed(1)} <span style={{ color: V.muted }}>({ratings.length})</span>
                </span>
              )}
              {theme.city && <span className="inline-flex items-center gap-1"><MapPin size={14} /> {theme.city}</span>}
            </div>
            <div className={`mt-5 flex flex-wrap gap-3 ${justifyClass('hero')}`}>
              {showServices && <a href="#services" className="px-6 py-3 text-sm font-bold uppercase tracking-widest" style={btn(true)}>Book now</a>}
              {phoneHref && <a href={phoneHref} className="inline-flex items-center gap-2 px-5 py-3 text-sm" style={btn(false)}><Phone size={15} /> Call</a>}
              {mapsHref && <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-3 text-sm" style={btn(false)}><MapPin size={15} /> Directions</a>}
            </div>
          </div>
        </section>
      )}

      {galleryFirst && galleryEls}

      {/* Services: Roster layout — choose a pro and category, then photo cards that open a side panel */}
      {showServices && p.servicesLayout === 'roster' && (() => {
        const pros = staff;
        const byPro = (sv: (typeof displayServices)[number]) => !proFilter || staffForService(pros.filter((m) => m.id === proFilter), sv).length > 0;
        const visible = displayServices.filter((sv) => byPro(sv) && (!catFilter || (sv.category?.trim() || '') === catFilter));
        const cats = [...new Set(displayServices.filter(byPro).map((sv) => sv.category?.trim() || '').filter(Boolean))];
        const chip = (on: boolean): React.CSSProperties => ({
          borderRadius: 999,
          background: on ? accent : 'transparent',
          color: on ? V.onAccent : V.text,
          border: `1px solid ${on ? 'transparent' : V.border}`,
          fontWeight: on ? 700 : 500,
        });
        return (
          <section id="services" className={`scroll-mt-16 ${section}`} style={dz('services', { padded: true })}>
            {head('services', 'Services', 'text-4xl md:text-6xl')}

            {pros.length > 1 && (
              <div className="mb-5">
                <p className="mb-2 text-xs uppercase tracking-widest" style={{ color: V.muted }}>Choose your pro</p>
                <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
                  {[{ id: null as string | null, name: 'Anyone', avatarUrl: undefined as string | undefined }, ...pros].map((m) => {
                    const on = proFilter === m.id;
                    return (
                      <button key={m.id ?? 'any'} type="button" aria-pressed={on} onClick={() => { setProFilter(m.id); setCatFilter(''); }} className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 text-center">
                        <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full text-lg font-bold" style={{ background: V.surface, border: `2px solid ${on ? accent : V.border}`, color: V.muted }}>
                          {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="h-full w-full object-cover" /> : m.id === null ? '★' : m.name.charAt(0)}
                        </span>
                        <span className="line-clamp-2 text-xs leading-tight" style={{ color: on ? V.text : V.muted, fontWeight: on ? 700 : 500 }}>{m.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {cats.length > 1 && (
              <div className="-mx-5 mb-6 flex gap-2 overflow-x-auto px-5 pb-1">
                {['', ...cats].map((c) => (
                  <button key={c || 'all'} type="button" aria-pressed={catFilter === c} onClick={() => setCatFilter(c)} className="shrink-0 px-4 py-1.5 text-sm" style={chip(catFilter === c)}>
                    {c || 'View all'}
                  </button>
                ))}
              </div>
            )}

            {visible.length === 0 ? (
              <p className="py-10 text-center text-sm" style={{ color: V.muted }}>
                {proFilter ? 'This professional does not offer anything in this category. Try "Anyone".' : 'No services yet.'}
              </p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {visible.map((sv) => (
                  <article key={sv.id} className="flex flex-col overflow-hidden" style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: rounded(1.5) }}>
                    <div className={`w-full overflow-hidden ${sv.imageUrls?.[0] ? 'aspect-[4/3]' : 'aspect-[16/6]'}`} style={{ background: V.bg }}>
                      {sv.imageUrls?.[0]
                        ? <img src={sv.imageUrls[0]} alt={sv.name} className="h-full w-full object-cover" loading="lazy" />
                        : <span className="flex h-full w-full items-center justify-center text-6xl" style={{ ...heading, color: V.border }}>{sv.name.charAt(0)}</span>}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-xl leading-tight" style={heading}>{sv.name}</h3>
                        <button
                          type="button"
                          onClick={() => { openBooking(sv); if (proFilter) setSelectedStaffId(proFilter); }}
                          disabled={!theme.paymentsEnabled}
                          className="shrink-0 px-5 py-2 text-sm font-bold disabled:opacity-40"
                          style={chip(false)}
                        >
                          {theme.paymentsEnabled ? 'Select' : 'Soon'}
                        </button>
                      </div>
                      {sv.description && <p className="line-clamp-3 text-sm" style={{ color: V.muted }}>{sv.description}</p>}
                      <p className="mt-auto pt-1 text-sm font-semibold">
                        {formatServicePrice(sv, theme.currency)}
                        <span style={{ color: V.muted, fontWeight: 400 }}> · {sv.durationMinutes} min{sv.requiresDeposit && sv.depositCents ? ` · ${formatPrice(sv.depositCents, theme.currency)} deposit` : ''}</span>
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        );
      })()}

      {/* Services */}
      {showServices && p.servicesLayout !== 'roster' && (
        <section id="services" className={`scroll-mt-16 ${section}`} style={dz('services', { padded: true })}>
          {head('services', 'Services')}
          {showTabs && (
            <div className="sticky top-[57px] z-30 -mx-5 mb-6 flex gap-2 overflow-x-auto px-5 py-3" style={{ background: V.bg }}>
              {groups.map((g) => (
                <a
                  key={g.name || 'other'}
                  href={`#cat-${(g.name || 'other').replace(/\W+/g, '-').toLowerCase()}`}
                  className="shrink-0 px-4 py-1.5 text-sm"
                  style={{ border: `1px solid ${V.border}`, borderRadius: rounded(2), color: V.text }}
                >
                  {g.name || 'More'}
                </a>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-10">
            {groups.map((g) => (
              <div key={g.name || 'other'} id={`cat-${(g.name || 'other').replace(/\W+/g, '-').toLowerCase()}`} className="scroll-mt-32">
                {showTabs && <h3 className="mb-3 text-sm uppercase tracking-widest" style={{ color: V.muted }}>{g.name || 'More services'}</h3>}
                <div className="flex flex-col" style={{ border: `1px solid ${V.border}`, borderRadius: rounded(1.5), background: V.surface, overflow: 'hidden' }}>
                  {g.items.map((sv, i) => (
                    <div key={sv.id} className="flex items-center gap-4 p-4" style={{ borderTop: i > 0 ? `1px solid ${V.border}` : undefined }}>
                      {sv.imageUrls?.[0] && <img src={sv.imageUrls[0]} alt="" className="h-16 w-16 shrink-0 object-cover" style={{ borderRadius: rounded(1) }} />}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{sv.name}</p>
                        {sv.description && <p className="mt-0.5 line-clamp-2 text-sm" style={{ color: V.muted }}>{sv.description}</p>}
                        <p className="mt-1 text-sm" style={{ color: V.muted }}>
                          {sv.durationMinutes} min
                          {sv.requiresDeposit && sv.depositCents ? ` · ${formatPrice(sv.depositCents, theme.currency)} deposit` : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className="font-bold">{formatServicePrice(sv, theme.currency)}</span>
                        <button
                          type="button"
                          onClick={() => openBooking(sv)}
                          disabled={!theme.paymentsEnabled}
                          className="px-4 py-2 text-xs font-bold uppercase tracking-widest disabled:opacity-40"
                          style={btn(true)}
                        >
                          {theme.paymentsEnabled ? 'Book' : 'Soon'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Team */}
      {sec('staff') && staff.length > 0 && (
        <section className={section} style={dz('staff', { padded: true })}>
          {head('staff', 'Meet the team')}
          <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-2">
            {staff.map((m) => (
              <div key={m.id} className="w-40 shrink-0 text-center">
                <div className="mx-auto mb-3 h-28 w-28 overflow-hidden" style={{ borderRadius: rounded(8), background: V.surface, border: `1px solid ${V.border}` }}>
                  {m.avatarUrl ? <img src={m.avatarUrl} alt={m.name} className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-3xl" style={{ ...heading, color: V.muted }}>{m.name.charAt(0)}</span>}
                </div>
                <p className="font-semibold">{m.name}</p>
                {m.bio && <p className="mt-1 line-clamp-3 text-xs" style={{ color: V.muted }}>{m.bio}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {!galleryFirst && galleryEls}

      {sec('about') && <AboutBlock text={theme.aboutText} style={{ background: V.surface, color: V.text, ...dz('about') }} headingStyle={heading} />}

      {sec('testimonials') && (
        <div style={{ background: V.bg, color: V.text, ...dz('testimonials') }}>
          <TestimonialsBlock testimonials={theme.testimonials} headingStyle={heading} cardStyle={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: rounded(1.5) }} />
        </div>
      )}

      {/* Shop (after booking) */}
      {showProducts && (
        <section id="products" className={`scroll-mt-16 ${section}`} style={dz('featured-products', { padded: true })}>
          {head('featured-products', 'Shop')}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {displayProducts.map((pr) => (
              <button key={pr.id} type="button" onClick={() => openQuickView(pr)} className="text-left">
                <div className="mb-2 aspect-square overflow-hidden" style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: rounded(1.5) }}>
                  {pr.imageUrls?.[0] ? <img src={pr.imageUrls[0]} alt={pr.name} className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-4xl" style={{ ...heading, color: V.muted }}>{pr.name.charAt(0)}</span>}
                </div>
                <p className="text-sm font-semibold">{pr.name}</p>
                <p className="text-sm" style={{ color: V.muted }}>{formatPrice(pr.priceCents, theme.currency)}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {sec('faq') && (
        <div style={{ background: V.bg, color: V.text, ...dz('faq') }}>
          <FaqBlock faqs={theme.faqs} headingStyle={heading} itemStyle={{ borderColor: V.border }} />
        </div>
      )}

      {/* Visit us + footer */}
      {sec('contact') && (
        <footer id="footer" className={`scroll-mt-16 ${section}`} style={{ borderTop: `1px solid ${V.border}`, ...dz('contact', { padded: true }) }}>
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="mb-4 text-2xl" style={heading}>{design('contact').title?.trim() || 'Visit us'}</h2>
              {design('contact').intro?.trim() && <p className="-mt-2 mb-4 text-sm" style={{ color: V.muted }}>{design('contact').intro}</p>}
              <ul className="flex flex-col gap-3 text-sm" style={{ color: V.muted }}>
                {theme.contactAddress && <li className="flex gap-3"><MapPin size={16} className="mt-0.5 shrink-0" /><a href={mapsHref ?? '#'} target="_blank" rel="noopener noreferrer" className="whitespace-pre-line hover:underline" style={{ color: V.text }}>{theme.contactAddress}</a></li>}
                {theme.contactHours && <li className="flex gap-3"><Clock size={16} className="mt-0.5 shrink-0" /><span className="whitespace-pre-line" style={{ color: V.text }}>{theme.contactHours}</span></li>}
                {theme.contactPhone && <li className="flex gap-3"><Phone size={16} className="mt-0.5 shrink-0" /><a href={phoneHref ?? '#'} className="hover:underline" style={{ color: V.text }}>{theme.contactPhone}</a></li>}
                {theme.contactEmail && <li><a href={`mailto:${theme.contactEmail}`} className="hover:underline" style={{ color: V.text }}>{theme.contactEmail}</a></li>}
              </ul>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); subscribe(emailInput); }} className="flex flex-col gap-2">
              <p className="text-sm font-semibold">Get news and offers</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="Your email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="min-w-0 flex-1 px-3 py-2.5 text-sm outline-none"
                  style={{ background: V.surface, color: V.text, border: `1px solid ${V.border}`, borderRadius: rounded(1) }}
                />
                <button type="submit" disabled={subscribeStatus === 'loading' || subscribeStatus === 'success'} className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest disabled:opacity-50" style={btn(true)}>
                  {subscribeStatus === 'success' ? 'Subscribed' : subscribeStatus === 'loading' ? '…' : 'Join'}
                </button>
              </div>
              {hasStoreMode && (
                <button type="button" onClick={() => setCustomOrderOpen(true)} className="mt-2 self-start text-sm underline" style={{ color: V.muted }}>Request a custom order</button>
              )}
            </form>
          </div>
          <p className="mt-8 text-xs" style={{ color: V.muted }}>&copy; {new Date().getFullYear()} {theme.companyName}</p>
        </footer>
      )}

      {/* Phone: Book button always in reach */}
      {showServices && (
        <div className="fixed inset-x-0 bottom-0 z-40 p-3 md:hidden" style={{ background: 'color-mix(in srgb, var(--bf-bg) 95%, transparent)', borderTop: `1px solid ${V.border}` }}>
          <a href="#services" className="block w-full py-3.5 text-center text-sm font-bold uppercase tracking-widest" style={btn(true)}>Book now</a>
        </div>
      )}

      <ProductQuickView
        product={quickViewProduct}
        onClose={closeQuickView}
        onAddToCart={(product, variant) => { addToCart(product, variant); closeQuickView(); }}
        currency={theme.currency}
        paymentsEnabled={theme.paymentsEnabled}
      />
      {showProducts && (
        <PresetCartDrawer preset={p} currency={theme.currency} isOpen={cartOpen} onClose={() => setCartOpen(false)} items={cart} onUpdateQuantity={updateCartQuantity} onRemove={removeFromCart} onCheckout={openCheckout} />
      )}
      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={closeCheckout}
        items={cart}
        status={orderStatus}
        error={orderError}
        orderNumber={orderNumber}
        clientSecret={orderClientSecret}
        amountCents={orderAmountCents}
        stripeAccountId={theme.stripeAccountId}
        currency={theme.currency}
        slug={theme.slug}
        onSubmit={submitOrder}
        onPaymentSuccess={confirmOrderPayment}
        onPaymentCancel={cancelOrderPayment}
      />
      <PresetBookingModal
        preset={p}
        currency={theme.currency}
        isOpen={bookingOpen}
        onClose={closeBooking}
        service={bookingService}
        selectedDate={selectedDate}
        selectedSlot={selectedSlot}
        availableSlots={availableSlots}
        cityLabel={bookingCityLabel}
        onSelectDate={selectBookingDate}
        onSelectSlot={selectBookingSlot}
        onConfirm={confirmBooking}
        staff={staffForService(staff, bookingService)}
        selectedStaffId={selectedStaffId}
        onSelectStaff={setSelectedStaffId}
        isDateClosed={isDateClosed}
      />
      <BookingStatusOverlay
        status={bookingStatus}
        error={bookingError}
        clientSecret={bookingClientSecret}
        amountCents={bookingAmountCents}
        stripeAccountId={theme.stripeAccountId}
        currency={theme.currency}
        onClose={closeBooking}
        onDismiss={dismissBookingStatus}
        onPaymentSuccess={confirmBookingPayment}
        onPaymentCancel={cancelBookingPayment}
      />
      <CustomOrderModal isOpen={customOrderOpen} onClose={() => setCustomOrderOpen(false)} companyName={theme.companyName} status={customOrderStatus} onSubmit={submitCustomOrder} />
    </div>
  );
}
