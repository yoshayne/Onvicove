import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import type { ThemeProps } from '../types';
import ContactBlock from '../shared/ContactBlock';
import Gallery from '../shared/Gallery';
import type { GallerySectionData } from '../shared/Gallery';
import { formatPrice } from '../types';
import { defaults } from './config';
import CartDrawer from './CartDrawer';
import BookingModal from './BookingModal';
import CheckoutModal from '../shared/CheckoutModal';
import BookingStatusOverlay from '../shared/BookingStatusOverlay';
import ProductQuickView from '../shared/ProductQuickView';
import { useStorefrontCommerce } from '../shared/useStorefrontCommerce';
import { useStorefrontForms } from '../shared/useStorefrontForms';
import CustomOrderModal from '../shared/CustomOrderModal';

export default function Storefront({ theme, products, services, staff, visibleSections, galleries }: ThemeProps) {
  const [customOrderOpen, setCustomOrderOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const { subscribe, subscribeStatus, submitCustomOrder, customOrderStatus } = useStorefrontForms(theme.slug ?? '');
  const commerce = useStorefrontCommerce(theme.slug);
  const {
    cart, cartOpen, setCartOpen, addToCart, updateCartQuantity, removeFromCart,
    quickViewProduct, openQuickView, closeQuickView,
    checkoutOpen, openCheckout, closeCheckout, orderStatus, orderError, orderNumber, submitOrder,
    orderClientSecret, orderAmountCents, confirmOrderPayment, cancelOrderPayment,
    bookingService, bookingOpen, openBooking, closeBooking, selectedDate, selectedSlot,
    availableSlots, selectBookingDate, selectBookingSlot, bookingStatus, bookingError,
    confirmBooking, confirmBookingPayment, cancelBookingPayment, dismissBookingStatus,
    bookingClientSecret, bookingAmountCents,
  } = commerce;

  const displayProducts = products.length > 0 ? products : defaults.products;
  const displayServices = services.length > 0 ? services : defaults.services;
  const heroImage = theme.heroImageUrl || defaults.heroImageUrl;
  const heroOpacity = theme.heroImageOpacity !== undefined ? theme.heroImageOpacity / 100 : 1;
  const tagline = theme.tagline || defaults.tagline;
  const isVis = (s: string) => !visibleSections || visibleSections.includes(s);
  const secOrder = (s: string) => visibleSections ? (visibleSections.indexOf(s) + 1 || 99) : 0;
  const showProducts = isVis('featured-products') && (theme.mode === 'store' || theme.mode === 'both') && displayProducts.length > 0;
  const showServices = isVis('services') && (theme.mode === 'book' || theme.mode === 'both') && displayServices.length > 0;
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f1', color: '#1a1a1a', fontFamily: 'Inter, sans-serif' }}>
      {/* Nav */}
      <nav style={{ background: '#f8f6f1', borderBottom: '1px solid #d0cdc8', padding: '0 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, letterSpacing: '0.2em', color: '#1a1a1a', lineHeight: 1.2 }}>
            <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 700 }}>{theme.companyName}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, fontSize: 12, letterSpacing: '0.1em', color: '#1a1a1a' }}>
            {showProducts && <a href="#products" style={{ textDecoration: 'none', color: 'inherit' }}>Shop</a>}
            {showServices && <a href="#services" style={{ textDecoration: 'none', color: 'inherit' }}>Book</a>}
            <a href="#footer" style={{ textDecoration: 'none', color: 'inherit' }}>Contact</a>
            {showProducts && (
              <button type="button" aria-label="Open cart" onClick={() => setCartOpen(true)} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: '#1a1a1a', padding: 0 }}>
                <ShoppingCart size={18} />
                {cartCount > 0 && <span style={{ position: 'absolute', top: -5, right: -5, background: '#1a1a1a', color: '#f8f6f1', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700 }}>{cartCount}</span>}
              </button>
            )}
          </div>
        </div>
      </nav>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Hero — asymmetric editorial layout */}
      {isVis('hero') && (
      <section style={{ order: secOrder('hero'), maxWidth: 1280, margin: '0 auto', padding: '60px 24px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, minHeight: '70vh', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: 11, letterSpacing: '0.3em', color: '#1a1a1a', opacity: 0.4, marginBottom: 24, textTransform: 'uppercase' }}>
            01 / {String(displayProducts.length + displayServices.length).padStart(2, '0')}
          </p>
          <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 'clamp(40px, 5vw, 72px)', fontWeight: 400, lineHeight: 1.05, marginBottom: 24 }}>{tagline}</h1>
          <p style={{ fontSize: 14, color: '#1a1a1a', opacity: 0.55, lineHeight: 1.7, maxWidth: 400, marginBottom: 32 }}>
            Editorial-style photography for those who appreciate the art of timeless imagery.
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            {showProducts && <a href="#products" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, letterSpacing: '0.15em', textDecoration: 'none', color: '#1a1a1a', borderBottom: '1px solid #1a1a1a', paddingBottom: 4 }}>Shop</a>}
            {showServices && <a href="#services" style={{ display: 'inline-block', padding: '10px 24px', fontSize: 12, letterSpacing: '0.15em', textDecoration: 'none', background: '#1a1a1a', color: '#f8f6f1' }}>Book</a>}
            <button type="button" onClick={() => setCustomOrderOpen(true)} style={{ display: 'inline-block', padding: '10px 24px', fontSize: 12, letterSpacing: '0.15em', background: 'none', border: '1px solid #1a1a1a', color: '#1a1a1a', cursor: 'pointer' }}>Custom Order</button>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: -20, right: -24, fontSize: 11, letterSpacing: '0.2em', color: '#1a1a1a', opacity: 0.3, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            PORTRAITS — EDITORIAL — BRAND
          </div>
          <img src={heroImage} alt="" style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block', opacity: heroOpacity }} />
        </div>
      </section>
      )}

      {/* Products — editorial masonry grid */}
      {showProducts && (
        <section id="products" style={{ order: secOrder('featured-products'), maxWidth: 1280, margin: '0 auto', padding: '80px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 40, borderBottom: '1px solid #d0cdc8', paddingBottom: 16 }}>
            <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 28, fontWeight: 400 }}>Shop</h2>
            <span style={{ fontSize: 11, letterSpacing: '0.2em', color: '#1a1a1a', opacity: 0.4 }}>VIEW ALL</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
            {displayProducts.map((product, i) => (
              <div key={product.id} style={{ gridRow: i === 0 ? 'span 2' : 'span 1' }}>
                <div style={{ overflow: 'hidden', background: '#eeece7', marginBottom: 12, aspectRatio: i === 0 ? '3/5' : '4/3' }}>
                  <img src={product.imageUrls?.[0] ?? defaults.heroImageUrl} alt={product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div>
                    <h3 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 14, fontWeight: 400, marginBottom: 2 }}>{product.name}</h3>
                    <p style={{ fontSize: 12, color: '#1a1a1a', opacity: 0.45 }}>{formatPrice(product.priceCents, theme.currency)}</p>
                  </div>
                  <button type="button" onClick={() => openQuickView(product)}
                    style={{ fontSize: 11, color: '#1a1a1a', opacity: 0.5, background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.1em' }}>
                    →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Services */}
      {showServices && (
        <section id="services" style={{ order: secOrder('services'), background: '#eeece7', padding: '80px 24px' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 28, fontWeight: 400, marginBottom: 40 }}>Book</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {displayServices.map((service, i) => (
                <div key={service.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: 24, alignItems: 'center', padding: '32px 0', borderTop: '1px solid #d0cdc8' }}>
                  <span style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 28, color: '#1a1a1a', opacity: 0.2, fontWeight: 400 }}>{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <h3 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 20, fontWeight: 400, marginBottom: 6 }}>{service.name}</h3>
                    {service.description && <p style={{ fontSize: 13, color: '#1a1a1a', opacity: 0.55, lineHeight: 1.6 }}>{service.description}</p>}
                    <p style={{ fontSize: 12, color: '#1a1a1a', opacity: 0.4, marginTop: 8 }}>{service.durationMinutes} min · {formatPrice(service.priceCents, theme.currency)}</p>
                  </div>
                  <button type="button" onClick={() => openBooking(service)} disabled={!theme.paymentsEnabled}
                    style={{ padding: '10px 24px', fontSize: 12, letterSpacing: '0.1em', background: '#1a1a1a', color: '#f8f6f1', border: 'none', cursor: theme.paymentsEnabled ? 'pointer' : 'not-allowed', opacity: theme.paymentsEnabled ? 1 : 0.4, whiteSpace: 'nowrap' }}>
                    {theme.paymentsEnabled ? 'Book Now' : 'Coming Soon'}
                  </button>
                </div>
              ))}
            </div>
            {staff.length > 0 && (
              <div style={{ marginTop: 64, display: 'flex', gap: 48, flexWrap: 'wrap' }}>
                {staff.map((member) => (
                  <div key={member.id} style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                    {member.avatarUrl && <img src={member.avatarUrl} alt={member.name} style={{ width: 72, height: 72, objectFit: 'cover' }} />}
                    <div>
                      <p style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 16, marginBottom: 4 }}>{member.name}</p>
                      {member.bio && <p style={{ fontSize: 12, color: '#1a1a1a', opacity: 0.5 }}>{member.bio}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      {galleries && galleries.length > 0 && galleries.map((g) => (
        <div key={g.id} style={{ order: secOrder(g.id) }}>
          <Gallery layout={g.layout} images={g.images ?? []} title={g.title} />
        </div>
      ))}
      </div>{/* end ordered sections */}

      <footer id="footer" style={{ borderTop: '1px solid #d0cdc8', padding: '40px 24px', background: '#f8f6f1' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 16 }}>{theme.companyName}</p>
          {theme.city && <p style={{ fontSize: 12, color: '#1a1a1a', opacity: 0.4 }}>{theme.city}</p>}
          <form onSubmit={(e) => { e.preventDefault(); subscribe(emailInput); }} className="mt-6 flex justify-center gap-2">
            <input
              type="email"
              placeholder="Your email"
              value={emailInput}
              onChange={(ev) => setEmailInput(ev.target.value)}
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-gray-500"
            />
            <button
              type="submit"
              disabled={subscribeStatus === 'loading' || subscribeStatus === 'success'}
              className="rounded bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 transition-colors disabled:opacity-50"
            >
              {subscribeStatus === 'success' ? '✓ Subscribed!' : subscribeStatus === 'loading' ? '...' : 'Subscribe'}
            </button>
          </form>
          <ContactBlock theme={theme} useInlineStyles textColor="rgba(26,26,26,0.5)" />
          <p style={{ fontSize: 11, color: '#1a1a1a', opacity: 0.3, letterSpacing: '0.1em', marginTop: 16 }}>&copy; {new Date().getFullYear()}</p>
        </div>
      </footer>

      <ProductQuickView product={quickViewProduct} onClose={closeQuickView} onAddToCart={(p, v) => { addToCart(p, v); closeQuickView(); }} currency={theme.currency} paymentsEnabled={theme.paymentsEnabled} />
      {showProducts && <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={cart} onUpdateQuantity={updateCartQuantity} onRemove={removeFromCart} onCheckout={openCheckout} />}
      <CheckoutModal isOpen={checkoutOpen} onClose={closeCheckout} items={cart} status={orderStatus} error={orderError} orderNumber={orderNumber} clientSecret={orderClientSecret} amountCents={orderAmountCents} stripeAccountId={theme.stripeAccountId} currency={theme.currency} onSubmit={submitOrder} onPaymentSuccess={confirmOrderPayment} onPaymentCancel={cancelOrderPayment} />
      <BookingModal isOpen={bookingOpen} onClose={closeBooking} service={bookingService} selectedDate={selectedDate} selectedSlot={selectedSlot} availableSlots={availableSlots} onSelectDate={selectBookingDate} onSelectSlot={selectBookingSlot} onConfirm={confirmBooking} />
      <BookingStatusOverlay status={bookingStatus} error={bookingError} clientSecret={bookingClientSecret} amountCents={bookingAmountCents} stripeAccountId={theme.stripeAccountId} currency={theme.currency} onClose={closeBooking} onDismiss={dismissBookingStatus} onPaymentSuccess={confirmBookingPayment} onPaymentCancel={cancelBookingPayment} />
      <CustomOrderModal
        isOpen={customOrderOpen}
        onClose={() => setCustomOrderOpen(false)}
        companyName={theme.companyName}
        status={customOrderStatus}
        onSubmit={submitCustomOrder}
      />
    </div>
  );
}
