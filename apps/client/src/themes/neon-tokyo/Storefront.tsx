import { useState } from 'react';
import { ShoppingCart, Zap, Truck, Shield } from 'lucide-react';
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

  return (
    <div style={{ minHeight: '100vh', background: '#050510', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        .neon-pink { color: #ff2d9b; text-shadow: 0 0 10px #ff2d9b, 0 0 30px #ff2d9b; }
        .neon-cyan { color: #00ffff; text-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff; }
        .neon-border { border: 1px solid #ff2d9b; box-shadow: 0 0 10px #ff2d9b30; }
        .neon-btn { background: #ff2d9b; box-shadow: 0 0 20px #ff2d9b60; }
        .neon-btn:hover { box-shadow: 0 0 30px #ff2d9b; }
        .product-card { background: #0a0a20; border: 1px solid rgba(255,45,155,0.2); transition: border-color 0.3s, box-shadow 0.3s; }
        .product-card:hover { border-color: #ff2d9b; box-shadow: 0 0 20px rgba(255,45,155,0.2); }
      `}</style>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(5,5,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,45,155,0.2)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '0.1em', background: 'linear-gradient(90deg, #ff2d9b, #00ffff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {theme.companyName.toUpperCase()}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, fontSize: 12, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em' }}>
            {showProducts && <a href="#products" style={{ textDecoration: 'none', color: 'inherit' }}>Shop</a>}
            {showServices && <a href="#services" style={{ textDecoration: 'none', color: 'inherit' }}>Book</a>}
            <a href="#footer" style={{ textDecoration: 'none', color: 'inherit' }}>Contact</a>
            {showProducts && (
              <button type="button" aria-label="Open cart" onClick={() => setCartOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(255,45,155,0.1)', border: '1px solid rgba(255,45,155,0.4)', borderRadius: 4, cursor: 'pointer', color: '#ff2d9b', fontSize: 11, fontWeight: 600 }}>
                <ShoppingCart size={14} />
                CART ({cartCount})
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', minHeight: '85vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <img src={heroImage} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.25, mixBlendMode: 'screen' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(5,5,16,0.95) 50%, rgba(5,5,16,0.4) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 10, maxWidth: 1280, margin: '0 auto', padding: '80px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: '0.3em', marginBottom: 16, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>NEXT-GEN STREETWEAR</p>
            <h1 className="neon-pink" style={{ fontSize: 'clamp(48px, 7vw, 80px)', fontWeight: 900, lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: 16 }}>
              {tagline}
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32, lineHeight: 1.7 }}>次世代のギア。ストリートのために。</p>
            <div style={{ display: 'flex', gap: 12 }}>
              {showProducts && (
                <a href="#products" className="neon-btn" style={{ display: 'inline-block', padding: '14px 28px', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', color: '#000', textDecoration: 'none', borderRadius: 4 }}>
                  Shop
                </a>
              )}
              {showServices && (
                <a href="#services" style={{ display: 'inline-block', padding: '14px 28px', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', color: '#00ffff', background: 'rgba(0,255,255,0.1)', border: '1px solid rgba(0,255,255,0.4)', textDecoration: 'none', borderRadius: 4 }}>
                  Book
                </a>
              )}
              <button type="button" onClick={() => setCustomOrderOpen(true)} style={{ display: 'inline-block', padding: '14px 28px', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(0,255,255,0.7)', background: 'none', border: '1px solid rgba(0,255,255,0.3)', borderRadius: 4, cursor: 'pointer' }}>
                Custom Order
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {displayProducts.slice(0, 2).map((p) => (
              <div key={p.id} className="product-card" style={{ borderRadius: 8, overflow: 'hidden' }}>
                <img src={p.imageUrls?.[0] ?? defaults.heroImageUrl} alt={p.name} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }} />
                <div style={{ padding: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>{p.name}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#ff2d9b' }}>{formatPrice(p.priceCents, theme.currency)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      {showProducts && (
        <section id="products" style={{ maxWidth: 1280, margin: '0 auto', padding: '64px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <h2 style={{ fontWeight: 800, fontSize: 24, letterSpacing: '-0.01em' }}>Shop</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {displayProducts.map((product) => (
              <div key={product.id} className="product-card" style={{ borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ aspectRatio: '3/4', overflow: 'hidden', background: '#0a0a20' }}>
                    <img src={product.imageUrls?.[0] ?? defaults.heroImageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')} />
                  </div>
                  {product.isFeatured && (
                    <span style={{ position: 'absolute', top: 12, left: 12, padding: '4px 10px', fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', background: '#ff2d9b', color: '#000', borderRadius: 2 }}>IN STOCK</span>
                  )}
                </div>
                <div style={{ padding: 16 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>{product.name}</h3>
                  {product.description && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 10, lineHeight: 1.4 }}>{product.description}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="neon-pink" style={{ fontSize: 15, fontWeight: 800 }}>¥{(product.priceCents / 100 * 150).toLocaleString()}</span>
                    <button type="button" onClick={() => openQuickView(product)}
                      style={{ padding: '6px 14px', fontSize: 11, fontWeight: 700, background: 'rgba(255,45,155,0.15)', border: '1px solid rgba(255,45,155,0.4)', color: '#ff2d9b', borderRadius: 4, cursor: 'pointer', letterSpacing: '0.05em' }}>
                      {theme.paymentsEnabled ? 'Add to Cart' : 'View Details'}
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
        <section id="services" style={{ padding: '64px 24px', background: 'rgba(255,45,155,0.03)', borderTop: '1px solid rgba(255,45,155,0.15)' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <h2 style={{ fontWeight: 800, fontSize: 24, letterSpacing: '-0.01em', marginBottom: 32 }}>Book</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {displayServices.map((service) => (
                <div key={service.id} className="neon-border" style={{ borderRadius: 8, padding: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>{service.name}</h3>
                  {service.description && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16, lineHeight: 1.6 }}>{service.description}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{service.durationMinutes > 0 ? `${service.durationMinutes} min` : 'Ongoing'}</span>
                    <span className="neon-pink" style={{ fontWeight: 700 }}>{formatPrice(service.priceCents, theme.currency)}</span>
                  </div>
                  <button type="button" onClick={() => openBooking(service)} disabled={!theme.paymentsEnabled}
                    className="neon-btn" style={{ width: '100%', padding: '12px', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#000', border: 'none', borderRadius: 4, cursor: theme.paymentsEnabled ? 'pointer' : 'not-allowed', opacity: theme.paymentsEnabled ? 1 : 0.4 }}>
                    {theme.paymentsEnabled ? 'Book Now' : 'Coming Soon'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Badges */}
      <div style={{ padding: '32px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap' }}>
          {[{ icon: Truck, text: 'Free Shipping', sub: 'Orders ¥10,000+' },
            { icon: Zap, text: 'Fast Delivery', sub: 'Tokyo same-day' },
            { icon: Shield, text: 'Secure Payments', sub: 'SSL encrypted' }
          ].map(({ icon: Icon, text, sub }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Icon size={20} style={{ color: '#ff2d9b', opacity: 0.8 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{text}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer id="footer" style={{ padding: '40px 24px', textAlign: 'center', borderTop: '1px solid rgba(255,45,155,0.2)' }}>
        <p style={{ fontWeight: 800, fontSize: 16, letterSpacing: '0.15em', background: 'linear-gradient(90deg, #ff2d9b, #00ffff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 }}>{theme.companyName.toUpperCase()}</p>
        {theme.city && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{theme.city}</p>}
        <form onSubmit={(e) => { e.preventDefault(); subscribe(emailInput); }} className="mt-6 flex justify-center gap-2">
          <input type="email" placeholder="Your email" value={emailInput} onChange={(ev) => setEmailInput(ev.target.value)} className="rounded border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/50 focus:outline-none focus:border-white/60" />
          <button type="submit" disabled={subscribeStatus === 'loading' || subscribeStatus === 'success'} className="rounded bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30 transition-colors disabled:opacity-50">
            {subscribeStatus === 'success' ? '✓ Subscribed!' : subscribeStatus === 'loading' ? '...' : 'Subscribe'}
          </button>
        </form>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 20 }}>&copy; {new Date().getFullYear()}</p>
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
