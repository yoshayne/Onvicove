import { ShoppingCart } from 'lucide-react';
import type { ThemeProps } from '../types';
import { formatPrice } from '../types';
import { defaults } from './config';
import CartDrawer from './CartDrawer';
import BookingModal from './BookingModal';
import CheckoutModal from '../shared/CheckoutModal';
import BookingStatusOverlay from '../shared/BookingStatusOverlay';
import ProductQuickView from '../shared/ProductQuickView';
import { useStorefrontCommerce } from '../shared/useStorefrontCommerce';

export default function Storefront({ theme, products, services, staff }: ThemeProps) {
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
  const tagline = theme.tagline || defaults.tagline;
  const showProducts = (theme.mode === 'store' || theme.mode === 'both') && displayProducts.length > 0;
  const showServices = (theme.mode === 'book' || theme.mode === 'both') && displayServices.length > 0;
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: '#000', fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .marquee-inner { display: flex; animation: marquee 20s linear infinite; white-space: nowrap; }
      `}</style>

      {/* Nav */}
      <nav style={{ background: '#fff', borderBottom: '3px solid #000', padding: '0 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {theme.companyName.toUpperCase()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <div style={{ display: 'flex', gap: 24, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em' }}>
              {showProducts && <a href="#products" style={{ textDecoration: 'none', color: '#000' }}>WORK</a>}
              {showServices && <a href="#services" style={{ textDecoration: 'none', color: '#000' }}>SERVICES</a>}
              <a href="#footer" style={{ textDecoration: 'none', color: '#000' }}>CONTACT</a>
            </div>
            {showProducts && (
              <button type="button" aria-label="Open cart" onClick={() => setCartOpen(true)} style={{ position: 'relative', background: 'none', border: '2px solid #000', cursor: 'pointer', color: '#000', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, fontSize: 11 }}>
                <ShoppingCart size={16} />
                ({cartCount}) CART
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, minHeight: '60vh', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: 'clamp(48px, 7vw, 96px)', lineHeight: 0.92, letterSpacing: '-0.03em', marginBottom: 20 }}>
            {tagline.split('.').map((part, i) => (
              <span key={i} style={{ display: 'block', color: i === tagline.split('.').length - 2 ? 'var(--brand-color, #0000ff)' : '#000' }}>
                {part.trim().toUpperCase()}{i < tagline.split('.').length - 2 ? '.' : ''}
              </span>
            ))}
          </h1>
          {theme.city && <p style={{ fontFamily: 'monospace', fontSize: 13, color: '#000', opacity: 0.5, marginBottom: 16 }}>{theme.industry} — {theme.city}</p>}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 32 }}>
            {showProducts && (
              <a href="#products" style={{ display: 'inline-block', padding: '14px 28px', fontSize: 12, fontWeight: 900, letterSpacing: '0.1em', textDecoration: 'none', background: '#000', color: '#fff' }}>
                VIEW OUR WORK
              </a>
            )}
            {showServices && (
              <a href="#services" style={{ display: 'inline-block', padding: '14px 28px', fontSize: 12, fontWeight: 900, letterSpacing: '0.1em', textDecoration: 'none', border: '2px solid #000', color: '#000' }}>
                SERVICES
              </a>
            )}
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <img src={heroImage} alt="" style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover', border: '3px solid #000', display: 'block' }} />
          <div style={{ position: 'absolute', bottom: -12, right: -12, background: 'var(--brand-color, #0000ff)', color: '#fff', padding: '8px 16px', fontWeight: 900, fontSize: 12, letterSpacing: '0.15em' }}>
            ★ SELECTED PROJECT
          </div>
        </div>
      </section>

      {/* Marquee ticker */}
      <div style={{ background: '#000', color: '#fff', padding: '12px 0', overflow: 'hidden' }}>
        <div className="marquee-inner">
          {[1, 2].map((rep) => (
            <span key={rep} style={{ fontWeight: 900, fontSize: 13, letterSpacing: '0.2em', marginRight: 0 }}>
              {['BRANDING', 'WEB DESIGN', 'PACKAGING', 'STRATEGY', 'CONTENT', 'IDENTITY', 'CAMPAIGNS'].map((item) => (
                <span key={item} style={{ marginRight: 0 }}>
                  &nbsp;·&nbsp;{item}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Products */}
      {showProducts && (
        <section id="products" style={{ maxWidth: 1280, margin: '0 auto', padding: '64px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '3px solid #000', paddingBottom: 16, marginBottom: 32 }}>
            <h2 style={{ fontWeight: 900, fontSize: 28, letterSpacing: '-0.02em' }}>THE DROP</h2>
            <span style={{ fontFamily: 'monospace', fontSize: 11 }}>({displayProducts.length} ITEMS)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 0 }}>
            {displayProducts.map((product) => (
              <div key={product.id} style={{ border: '2px solid #000', marginRight: -2, marginBottom: -2 }}>
                <div style={{ aspectRatio: '1/1', overflow: 'hidden', background: '#f0f0f0', borderBottom: '2px solid #000' }}>
                  <img src={product.imageUrls?.[0] ?? defaults.heroImageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
                <div style={{ padding: 16 }}>
                  <p style={{ fontWeight: 900, fontSize: 13, letterSpacing: '0.05em', marginBottom: 4 }}>{product.name}</p>
                  {product.description && <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#000', opacity: 0.5, marginBottom: 12, lineHeight: 1.4 }}>{product.description}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14 }}>{formatPrice(product.priceCents, theme.currency)}</span>
                    <button type="button" onClick={() => openQuickView(product)}
                      style={{ padding: '6px 14px', fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', background: '#000', color: '#fff', border: 'none', cursor: 'pointer' }}>
                      {theme.paymentsEnabled ? 'ADD' : 'VIEW'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Services */}
      {showServices && (
        <section id="services" style={{ background: '#f0f0f0', padding: '64px 24px', borderTop: '3px solid #000' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <h2 style={{ fontWeight: 900, fontSize: 28, letterSpacing: '-0.02em', marginBottom: 32 }}>SERVICES</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {displayServices.map((service) => (
                <div key={service.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center', padding: '24px 0', borderTop: '2px solid #000' }}>
                  <div>
                    <h3 style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.01em', marginBottom: 4 }}>{service.name}</h3>
                    {service.description && <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#000', opacity: 0.5 }}>{service.description}</p>}
                    <p style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--brand-color, #0000ff)', marginTop: 8, fontWeight: 700 }}>{formatPrice(service.priceCents, theme.currency)}</p>
                  </div>
                  <button type="button" onClick={() => openBooking(service)} disabled={!theme.paymentsEnabled}
                    style={{ padding: '12px 24px', fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', background: 'var(--brand-color, #0000ff)', color: '#fff', border: 'none', cursor: theme.paymentsEnabled ? 'pointer' : 'not-allowed', opacity: theme.paymentsEnabled ? 1 : 0.4, whiteSpace: 'nowrap' }}>
                    {theme.paymentsEnabled ? 'GET A QUOTE' : 'COMING SOON'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer id="footer" style={{ background: '#000', color: '#fff', padding: '48px 24px', borderTop: '3px solid var(--brand-color, #0000ff)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <p style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.02em' }}>{theme.companyName.toUpperCase()}</p>
          {theme.city && <p style={{ fontFamily: 'monospace', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{theme.city}</p>}
          <p style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>&copy; {new Date().getFullYear()}</p>
        </div>
      </footer>

      <ProductQuickView product={quickViewProduct} onClose={closeQuickView} onAddToCart={(p, v) => { addToCart(p, v); closeQuickView(); }} currency={theme.currency} paymentsEnabled={theme.paymentsEnabled} />
      {showProducts && <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={cart} onUpdateQuantity={updateCartQuantity} onRemove={removeFromCart} onCheckout={openCheckout} />}
      <CheckoutModal isOpen={checkoutOpen} onClose={closeCheckout} items={cart} status={orderStatus} error={orderError} orderNumber={orderNumber} clientSecret={orderClientSecret} amountCents={orderAmountCents} stripeAccountId={theme.stripeAccountId} currency={theme.currency} onSubmit={submitOrder} onPaymentSuccess={confirmOrderPayment} onPaymentCancel={cancelOrderPayment} />
      <BookingModal isOpen={bookingOpen} onClose={closeBooking} service={bookingService} selectedDate={selectedDate} selectedSlot={selectedSlot} availableSlots={availableSlots} onSelectDate={selectBookingDate} onSelectSlot={selectBookingSlot} onConfirm={confirmBooking} />
      <BookingStatusOverlay status={bookingStatus} error={bookingError} clientSecret={bookingClientSecret} amountCents={bookingAmountCents} stripeAccountId={theme.stripeAccountId} currency={theme.currency} onClose={closeBooking} onDismiss={dismissBookingStatus} onPaymentSuccess={confirmBookingPayment} onPaymentCancel={cancelBookingPayment} />
    </div>
  );
}
