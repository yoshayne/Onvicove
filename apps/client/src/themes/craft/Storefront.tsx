import { useState } from 'react';
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
import { useStorefrontForms } from '../shared/useStorefrontForms';
import CustomOrderModal from '../shared/CustomOrderModal';

export default function Storefront({ theme, products, services, staff }: ThemeProps) {
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
  const tagline = theme.tagline || defaults.tagline;
  const showProducts = (theme.mode === 'store' || theme.mode === 'both') && displayProducts.length > 0;
  const showServices = (theme.mode === 'book' || theme.mode === 'both') && displayServices.length > 0;
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const categories = ['Candles', 'Soaps', 'Home Goods', 'Gift Sets'];

  return (
    <div style={{ minHeight: '100vh', background: '#f5f0e8', color: '#2c1f14', fontFamily: 'Inter, sans-serif' }}>
      {/* Nav */}
      <nav style={{ background: '#f5f0e8', borderBottom: '1px solid #c4b49a', padding: '0 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: 200 }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 20, fontWeight: 700, letterSpacing: '0.05em' }}>{theme.companyName}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, width: 200, justifyContent: 'flex-end' }}>
              {showProducts && (
                <button type="button" aria-label="Open cart" onClick={() => setCartOpen(true)} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: '#5c4a32', padding: 0 }}>
                  <ShoppingCart size={18} />
                  {cartCount > 0 && <span style={{ position: 'absolute', top: -5, right: -5, background: '#5c4a32', color: '#f5f0e8', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700 }}>{cartCount}</span>}
                </button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, fontSize: 11, letterSpacing: '0.15em', paddingBottom: 12, color: '#5c4a32', textTransform: 'uppercase' }}>
            {showProducts && <a href="#products" style={{ textDecoration: 'none', color: 'inherit' }}>Shop</a>}
            <a href="#footer" style={{ textDecoration: 'none', color: 'inherit' }}>About</a>
            {showServices && <a href="#services" style={{ textDecoration: 'none', color: 'inherit' }}>Workshops</a>}
            <a href="#footer" style={{ textDecoration: 'none', color: 'inherit' }}>Journal</a>
            <a href="#footer" style={{ textDecoration: 'none', color: 'inherit' }}>Contact</a>
          </div>
        </div>
      </nav>

      {/* Hero — split layout */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '64px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center', minHeight: '65vh' }}>
        <div>
          {/* Stamp badge */}
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 24 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', border: '2px solid #5c4a32', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700, letterSpacing: '0.15em', textAlign: 'center', color: '#5c4a32', lineHeight: 1.3, padding: 8, textTransform: 'uppercase' }}>
              HANDMADE<br />WITH CARE
            </div>
          </div>
          <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 'clamp(40px, 5vw, 68px)', fontWeight: 400, lineHeight: 1.1, marginBottom: 20 }}>{tagline}</h1>
          <p style={{ fontSize: 15, color: '#5c4a32', lineHeight: 1.7, marginBottom: 32, maxWidth: 420 }}>
            Small batch goods for a slower, more intentional life. Made with seasonal botanicals and ancestral techniques.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            {showProducts && (
              <a href="#products" style={{ display: 'inline-block', padding: '12px 28px', fontSize: 12, letterSpacing: '0.15em', textDecoration: 'none', background: '#5c4a32', color: '#f5f0e8', textTransform: 'uppercase' }}>
                Shop All
              </a>
            )}
            {showServices && (
              <a href="#services" style={{ display: 'inline-block', padding: '12px 28px', fontSize: 12, letterSpacing: '0.15em', textDecoration: 'none', border: '1px solid #5c4a32', color: '#5c4a32', textTransform: 'uppercase' }}>
                Workshops
              </a>
            )}
            <button type="button" onClick={() => setCustomOrderOpen(true)} style={{ display: 'inline-block', padding: '12px 28px', fontSize: 12, letterSpacing: '0.15em', border: '1px solid #5c4a32', color: '#5c4a32', textTransform: 'uppercase', background: 'none', cursor: 'pointer' }}>
              Custom Order
            </button>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <img src={heroImage} alt="" style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover', borderRadius: 8, display: 'block' }} />
        </div>
      </section>

      {/* Category navigation */}
      {showProducts && (
        <div style={{ background: '#ece5d8', borderTop: '1px solid #c4b49a', borderBottom: '1px solid #c4b49a', padding: '16px 24px' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', gap: 48, justifyContent: 'center', fontSize: 12, letterSpacing: '0.15em', color: '#5c4a32', textTransform: 'uppercase' }}>
            {categories.map((cat) => (
              <a key={cat} href="#products" style={{ textDecoration: 'none', color: 'inherit' }}>
                {cat} <span style={{ color: '#c4b49a' }}>→</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Products */}
      {showProducts && (
        <section id="products" style={{ maxWidth: 1280, margin: '0 auto', padding: '64px 24px' }}>
          <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 28, fontWeight: 400, marginBottom: 40, textAlign: 'center' }}>From the Workshop</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 24 }}>
            {displayProducts.map((product) => (
              <div key={product.id} style={{ background: '#ece5d8', borderRadius: 8, overflow: 'hidden', border: '1px solid #c4b49a' }}>
                <div style={{ aspectRatio: '1/1', overflow: 'hidden' }}>
                  <img src={product.imageUrls?.[0] ?? defaults.heroImageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.5s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')} />
                </div>
                <div style={{ padding: 16 }}>
                  <h3 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 15, fontWeight: 400, marginBottom: 4 }}>{product.name}</h3>
                  {product.description && <p style={{ fontSize: 12, color: '#7a6650', marginBottom: 12, lineHeight: 1.5 }}>{product.description}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, color: '#5c4a32', fontWeight: 600 }}>{formatPrice(product.priceCents, theme.currency)}</span>
                    <button type="button" onClick={() => openQuickView(product)}
                      style={{ fontSize: 11, padding: '6px 14px', background: '#5c4a32', color: '#f5f0e8', border: 'none', borderRadius: 4, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      {theme.paymentsEnabled ? 'Add' : 'View'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Services / Workshops */}
      {showServices && (
        <section id="services" style={{ background: '#ece5d8', padding: '64px 24px', borderTop: '1px solid #c4b49a' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <p style={{ fontSize: 11, letterSpacing: '0.2em', color: '#7a6650', marginBottom: 12, textTransform: 'uppercase' }}>Learn & Create</p>
              <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 32, fontWeight: 400 }}>Workshops</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
              {displayServices.map((service) => (
                <div key={service.id} style={{ background: '#f5f0e8', padding: 28, border: '1px solid #c4b49a', borderRadius: 8 }}>
                  {service.imageUrls?.[0] && (
                    <div style={{ marginBottom: 20, borderRadius: 6, overflow: 'hidden', aspectRatio: '16/9' }}>
                      <img src={service.imageUrls[0]} alt={service.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <h3 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 20, fontWeight: 400, marginBottom: 10 }}>{service.name}</h3>
                  {service.description && <p style={{ fontSize: 13, color: '#7a6650', marginBottom: 20, lineHeight: 1.6 }}>{service.description}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #c4b49a' }}>
                    <span style={{ fontSize: 12, color: '#7a6650' }}>{service.durationMinutes} min</span>
                    <span style={{ fontSize: 16, fontFamily: 'Playfair Display, Georgia, serif', color: '#5c4a32' }}>{formatPrice(service.priceCents, theme.currency)}</span>
                  </div>
                  <button type="button" onClick={() => openBooking(service)} disabled={!theme.paymentsEnabled}
                    style={{ width: '100%', padding: '12px', fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', background: '#5c4a32', color: '#f5f0e8', border: 'none', borderRadius: 4, cursor: theme.paymentsEnabled ? 'pointer' : 'not-allowed', opacity: theme.paymentsEnabled ? 1 : 0.4 }}>
                    {theme.paymentsEnabled ? 'Reserve a Spot' : 'Coming Soon'}
                  </button>
                </div>
              ))}
            </div>
            {staff.length > 0 && (
              <div style={{ marginTop: 64, display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
                {staff.map((member) => (
                  <div key={member.id} style={{ textAlign: 'center', maxWidth: 240 }}>
                    {member.avatarUrl && <img src={member.avatarUrl} alt={member.name} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 16px', border: '2px solid #c4b49a' }} />}
                    <p style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 16, marginBottom: 6 }}>{member.name}</p>
                    {member.bio && <p style={{ fontSize: 12, color: '#7a6650', lineHeight: 1.6 }}>{member.bio}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer id="footer" style={{ background: '#2c1f14', color: '#f5f0e8', padding: '48px 24px', textAlign: 'center' }}>
        <p style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 18, marginBottom: 8 }}>{theme.companyName}</p>
        {theme.city && <p style={{ fontSize: 12, color: 'rgba(245,240,232,0.5)', marginBottom: 16 }}>{theme.city}</p>}
        <p style={{ fontSize: 11, letterSpacing: '0.2em', color: 'rgba(245,240,232,0.3)', textTransform: 'uppercase' }}>Small Batch · Handmade · Slow Made</p>
        <form onSubmit={(e) => { e.preventDefault(); subscribe(emailInput); }} className="mt-6 flex justify-center gap-2">
          <input type="email" placeholder="Your email" value={emailInput} onChange={(ev) => setEmailInput(ev.target.value)} className="rounded border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/50 focus:outline-none focus:border-white/60" />
          <button type="submit" disabled={subscribeStatus === 'loading' || subscribeStatus === 'success'} className="rounded bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30 transition-colors disabled:opacity-50">
            {subscribeStatus === 'success' ? '✓ Subscribed!' : subscribeStatus === 'loading' ? '...' : 'Subscribe'}
          </button>
        </form>
        <p style={{ fontSize: 10, color: 'rgba(245,240,232,0.2)', marginTop: 24 }}>&copy; {new Date().getFullYear()} {theme.companyName}</p>
      </footer>

      <ProductQuickView product={quickViewProduct} onClose={closeQuickView} onAddToCart={(p, v) => { addToCart(p, v); closeQuickView(); }} currency={theme.currency} paymentsEnabled={theme.paymentsEnabled} />
      {showProducts && <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={cart} onUpdateQuantity={updateCartQuantity} onRemove={removeFromCart} onCheckout={openCheckout} />}
      <CheckoutModal isOpen={checkoutOpen} onClose={closeCheckout} items={cart} status={orderStatus} error={orderError} orderNumber={orderNumber} clientSecret={orderClientSecret} amountCents={orderAmountCents} stripeAccountId={theme.stripeAccountId} currency={theme.currency} onSubmit={submitOrder} onPaymentSuccess={confirmOrderPayment} onPaymentCancel={cancelOrderPayment} />
      <BookingModal isOpen={bookingOpen} onClose={closeBooking} service={bookingService} selectedDate={selectedDate} selectedSlot={selectedSlot} availableSlots={availableSlots} onSelectDate={selectBookingDate} onSelectSlot={selectBookingSlot} onConfirm={confirmBooking} />
      <BookingStatusOverlay status={bookingStatus} error={bookingError} clientSecret={bookingClientSecret} amountCents={bookingAmountCents} stripeAccountId={theme.stripeAccountId} currency={theme.currency} onClose={closeBooking} onDismiss={dismissBookingStatus} onPaymentSuccess={confirmBookingPayment} onPaymentCancel={cancelBookingPayment} />
      <CustomOrderModal isOpen={customOrderOpen} onClose={() => setCustomOrderOpen(false)} companyName={theme.companyName} status={customOrderStatus} onSubmit={submitCustomOrder} />
    </div>
  );
}
