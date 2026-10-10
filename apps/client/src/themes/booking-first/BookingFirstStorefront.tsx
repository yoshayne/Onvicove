import { useState } from 'react';
import { MapPin, Phone, Clock, ShoppingBag, Star } from 'lucide-react';
import type { ThemeProps } from '../types';
import { formatPrice } from '../types';
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

/**
 * The booking-first page shared by the Barber, Studio and Ink themes: your services and a Book button come first,
 * then your team, your work, reviews and your shop. Look and feel come from the preset.
 */
export default function BookingFirstStorefront({ preset: p, theme, products, services, staff, galleries = [], visibleSections }: ThemeProps & { preset: BookingFirstPreset }) {
  const [customOrderOpen, setCustomOrderOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
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

  const accent = `var(--brand-color, ${p.accent})`;
  const radius = p.radius;
  const sec = (id: string) => !visibleSections || visibleSections.includes(id);
  const ord = makeSectionOrder(visibleSections);

  const hasStoreMode = theme.mode === 'store' || theme.mode === 'both';
  const hasBookMode = theme.mode === 'book' || theme.mode === 'both';
  // Real data when there is any; example content only so an empty preview isn't blank
  const displayServices = services.length > 0 ? services : p.services;
  const displayProducts = products.length > 0 ? products : p.products;
  const showServices = hasBookMode && sec('services');
  const showProducts = hasStoreMode && products.length > 0 && sec('featured-products');
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const heading = { fontFamily: p.headingFont, textTransform: p.uppercaseHeadings ? ('uppercase' as const) : undefined, letterSpacing: p.uppercaseHeadings ? '0.04em' : undefined };
  const rounded = (n = 1) => Math.min(radius * n, 999);
  const btn = (solid: boolean): React.CSSProperties => ({
    background: solid ? accent : 'transparent',
    color: solid ? p.onAccent : p.text,
    border: solid ? '1px solid transparent' : `1px solid ${p.border}`,
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
      <div key={g.id} style={{ ...ord(g.id), background: p.bg, color: p.text }}>
        <Gallery layout={g.layout} images={g.images} title={g.title} />
      </div>
    ));
  const galleryFirst = p.galleryFirst && !visibleSections;

  const section = 'mx-auto w-full max-w-5xl px-5 py-10 md:py-14';

  return (
    <div className="flex min-h-screen flex-col pb-24 md:pb-0" style={{ background: p.bg, color: p.text, fontFamily: p.bodyFont }}>
      {/* Top bar */}
      <header className="sticky top-0 z-40" style={{ background: p.bg, borderBottom: `1px solid ${p.border}` }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-3">
            {theme.logoUrl && <img src={theme.logoUrl} alt="" className="h-8 w-8 object-cover" style={{ borderRadius: rounded(1) }} />}
            <span className="text-lg" style={heading}>{theme.companyName}</span>
          </div>
          <div className="flex items-center gap-3">
            {showProducts && (
              <button type="button" aria-label="Open cart" onClick={() => setCartOpen(true)} className="relative p-1" style={{ color: p.text }}>
                <ShoppingBag size={20} />
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold" style={{ background: accent, color: p.onAccent }}>{cartCount}</span>
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
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${p.bg} 0%, ${p.bg}cc 30%, transparent 75%)` }} />
          <div className="relative mx-auto flex max-w-5xl flex-col justify-end px-5 pb-8 pt-28 md:pt-40">
            <h1 className="text-4xl md:text-6xl" style={heading}>{theme.companyName}</h1>
            {(theme.tagline || p.tagline) && <p className="mt-2 max-w-xl text-base md:text-lg" style={{ color: p.muted }}>{theme.tagline || p.tagline}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm" style={{ color: p.muted }}>
              {avg !== null && (
                <span className="inline-flex items-center gap-1" style={{ color: p.text }}>
                  <Star size={14} fill="currentColor" /> {avg.toFixed(1)} <span style={{ color: p.muted }}>({ratings.length})</span>
                </span>
              )}
              {theme.city && <span className="inline-flex items-center gap-1"><MapPin size={14} /> {theme.city}</span>}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {showServices && <a href="#services" className="px-6 py-3 text-sm font-bold uppercase tracking-widest" style={btn(true)}>Book now</a>}
              {phoneHref && <a href={phoneHref} className="inline-flex items-center gap-2 px-5 py-3 text-sm" style={btn(false)}><Phone size={15} /> Call</a>}
              {mapsHref && <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-3 text-sm" style={btn(false)}><MapPin size={15} /> Directions</a>}
            </div>
          </div>
        </section>
      )}

      {galleryFirst && galleryEls}

      {/* Services */}
      {showServices && (
        <section id="services" className={`scroll-mt-16 ${section}`} style={ord('services')}>
          <h2 className="mb-5 text-2xl md:text-3xl" style={heading}>Services</h2>
          {showTabs && (
            <div className="sticky top-[57px] z-30 -mx-5 mb-6 flex gap-2 overflow-x-auto px-5 py-3" style={{ background: p.bg }}>
              {groups.map((g) => (
                <a
                  key={g.name || 'other'}
                  href={`#cat-${(g.name || 'other').replace(/\W+/g, '-').toLowerCase()}`}
                  className="shrink-0 px-4 py-1.5 text-sm"
                  style={{ border: `1px solid ${p.border}`, borderRadius: rounded(2), color: p.text }}
                >
                  {g.name || 'More'}
                </a>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-10">
            {groups.map((g) => (
              <div key={g.name || 'other'} id={`cat-${(g.name || 'other').replace(/\W+/g, '-').toLowerCase()}`} className="scroll-mt-32">
                {showTabs && <h3 className="mb-3 text-sm uppercase tracking-widest" style={{ color: p.muted }}>{g.name || 'More services'}</h3>}
                <div className="flex flex-col" style={{ border: `1px solid ${p.border}`, borderRadius: rounded(1.5), background: p.surface, overflow: 'hidden' }}>
                  {g.items.map((sv, i) => (
                    <div key={sv.id} className="flex items-center gap-4 p-4" style={{ borderTop: i > 0 ? `1px solid ${p.border}` : undefined }}>
                      {sv.imageUrls?.[0] && <img src={sv.imageUrls[0]} alt="" className="h-16 w-16 shrink-0 object-cover" style={{ borderRadius: rounded(1) }} />}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{sv.name}</p>
                        {sv.description && <p className="mt-0.5 line-clamp-2 text-sm" style={{ color: p.muted }}>{sv.description}</p>}
                        <p className="mt-1 text-sm" style={{ color: p.muted }}>
                          {sv.durationMinutes} min
                          {sv.requiresDeposit && sv.depositCents ? ` · ${formatPrice(sv.depositCents, theme.currency)} deposit` : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className="font-bold">{formatPrice(sv.priceCents, theme.currency)}</span>
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
        <section className={section} style={ord('staff')}>
          <h2 className="mb-5 text-2xl md:text-3xl" style={heading}>Meet the team</h2>
          <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-2">
            {staff.map((m) => (
              <div key={m.id} className="w-40 shrink-0 text-center">
                <div className="mx-auto mb-3 h-28 w-28 overflow-hidden" style={{ borderRadius: rounded(8), background: p.surface, border: `1px solid ${p.border}` }}>
                  {m.avatarUrl ? <img src={m.avatarUrl} alt={m.name} className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-3xl" style={{ ...heading, color: p.muted }}>{m.name.charAt(0)}</span>}
                </div>
                <p className="font-semibold">{m.name}</p>
                {m.bio && <p className="mt-1 line-clamp-3 text-xs" style={{ color: p.muted }}>{m.bio}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {!galleryFirst && galleryEls}

      {sec('about') && <AboutBlock text={theme.aboutText} style={{ ...ord('about'), background: p.surface, color: p.text }} headingStyle={heading} />}

      {sec('testimonials') && (
        <div style={{ ...ord('testimonials'), background: p.bg, color: p.text }}>
          <TestimonialsBlock testimonials={theme.testimonials} headingStyle={heading} cardStyle={{ background: p.surface, border: `1px solid ${p.border}`, borderRadius: rounded(1.5) }} />
        </div>
      )}

      {/* Shop (after booking) */}
      {showProducts && (
        <section id="products" className={`scroll-mt-16 ${section}`} style={ord('featured-products')}>
          <h2 className="mb-5 text-2xl md:text-3xl" style={heading}>Shop</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {displayProducts.map((pr) => (
              <button key={pr.id} type="button" onClick={() => openQuickView(pr)} className="text-left">
                <div className="mb-2 aspect-square overflow-hidden" style={{ background: p.surface, border: `1px solid ${p.border}`, borderRadius: rounded(1.5) }}>
                  {pr.imageUrls?.[0] ? <img src={pr.imageUrls[0]} alt={pr.name} className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-4xl" style={{ ...heading, color: p.muted }}>{pr.name.charAt(0)}</span>}
                </div>
                <p className="text-sm font-semibold">{pr.name}</p>
                <p className="text-sm" style={{ color: p.muted }}>{formatPrice(pr.priceCents, theme.currency)}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {sec('faq') && (
        <div style={{ ...ord('faq'), background: p.bg, color: p.text }}>
          <FaqBlock faqs={theme.faqs} headingStyle={heading} itemStyle={{ borderColor: p.border }} />
        </div>
      )}

      {/* Visit us + footer */}
      {sec('contact') && (
        <footer id="footer" className={`scroll-mt-16 ${section}`} style={{ ...ord('contact'), borderTop: `1px solid ${p.border}` }}>
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="mb-4 text-2xl" style={heading}>Visit us</h2>
              <ul className="flex flex-col gap-3 text-sm" style={{ color: p.muted }}>
                {theme.contactAddress && <li className="flex gap-3"><MapPin size={16} className="mt-0.5 shrink-0" /><a href={mapsHref ?? '#'} target="_blank" rel="noopener noreferrer" className="whitespace-pre-line hover:underline" style={{ color: p.text }}>{theme.contactAddress}</a></li>}
                {theme.contactHours && <li className="flex gap-3"><Clock size={16} className="mt-0.5 shrink-0" /><span className="whitespace-pre-line" style={{ color: p.text }}>{theme.contactHours}</span></li>}
                {theme.contactPhone && <li className="flex gap-3"><Phone size={16} className="mt-0.5 shrink-0" /><a href={phoneHref ?? '#'} className="hover:underline" style={{ color: p.text }}>{theme.contactPhone}</a></li>}
                {theme.contactEmail && <li><a href={`mailto:${theme.contactEmail}`} className="hover:underline" style={{ color: p.text }}>{theme.contactEmail}</a></li>}
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
                  style={{ background: p.surface, color: p.text, border: `1px solid ${p.border}`, borderRadius: rounded(1) }}
                />
                <button type="submit" disabled={subscribeStatus === 'loading' || subscribeStatus === 'success'} className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest disabled:opacity-50" style={btn(true)}>
                  {subscribeStatus === 'success' ? 'Subscribed' : subscribeStatus === 'loading' ? '…' : 'Join'}
                </button>
              </div>
              {hasStoreMode && (
                <button type="button" onClick={() => setCustomOrderOpen(true)} className="mt-2 self-start text-sm underline" style={{ color: p.muted }}>Request a custom order</button>
              )}
            </form>
          </div>
          <p className="mt-8 text-xs" style={{ color: p.muted }}>&copy; {new Date().getFullYear()} {theme.companyName}</p>
        </footer>
      )}

      {/* Phone: Book button always in reach */}
      {showServices && (
        <div className="fixed inset-x-0 bottom-0 z-40 p-3 md:hidden" style={{ background: `${p.bg}f2`, borderTop: `1px solid ${p.border}` }}>
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
