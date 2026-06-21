import { ShoppingCart, Shield, Award, Gem } from 'lucide-react';
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
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 40, background: '#000', borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 32, fontSize: 11, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)' }}>
            {showProducts && <a href="#products" style={{ textDecoration: 'none', color: 'inherit' }}>SHOP</a>}
            {showServices && <a href="#services" style={{ textDecoration: 'none', color: 'inherit' }}>BOOK</a>}
          </div>
          <span style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 22, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--brand-color, #c9a84c)' }}>
            {theme.companyName}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <a href="#footer" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>CONTACT</a>
            {showProducts && (
              <button type="button" aria-label="Open cart" onClick={() => setCartOpen(true)} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', padding: 0 }}>
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                  <span style={{ position: 'absolute', top: -6, right: -6, background: 'var(--brand-color, #c9a84c)', color: '#000', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{cartCount}</span>
                )}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', height: '90vh', minHeight: 520, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'flex-end' }}>
        <img src={heroImage} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #000 0%, rgba(0,0,0,0.4) 50%, transparent 100%)' }} />
        <div style={{ position: 'relative', zIndex: 10, maxWidth: 1280, margin: '0 auto', padding: '0 24px 80px', width: '100%' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--brand-color, #c9a84c)', marginBottom: 16, textTransform: 'uppercase' }}>Since 1987</p>
          <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 'clamp(48px, 8vw, 96px)', fontWeight: 400, lineHeight: 1.05, marginBottom: 20, color: '#fff' }}>
            {tagline}
          </h1>
          <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
            {showProducts && (
              <a href="#products" style={{ display: 'inline-block', padding: '12px 32px', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none', border: '1px solid var(--brand-color, #c9a84c)', color: 'var(--brand-color, #c9a84c)' }}>
                Explore Collection
              </a>
            )}
            {showServices && (
              <a href="#services" style={{ display: 'inline-block', padding: '12px 32px', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}>
                Private Consultation
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <div style={{ background: '#0a0a0a', borderTop: '1px solid rgba(201,168,76,0.1)', borderBottom: '1px solid rgba(201,168,76,0.1)', padding: '24px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 64, flexWrap: 'wrap' }}>
          {[{ icon: Shield, text: 'Ethically Sourced', sub: 'Materials you can trust' },
            { icon: Gem, text: 'Handcrafted', sub: 'By master artisans' },
            { icon: Award, text: 'Lifetime Warranty', sub: 'Our promise to you' }
          ].map(({ icon: Icon, text, sub }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Icon size={20} style={{ color: 'var(--brand-color, #c9a84c)', opacity: 0.8 }} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.8)' }}>{text}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Products */}
      {showProducts && (
        <section id="products" style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--brand-color, #c9a84c)', marginBottom: 12, textTransform: 'uppercase' }}>The Collection</p>
            <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 36, fontWeight: 400 }}>Curated Excellence</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24 }}>
            {displayProducts.map((product) => (
              <div key={product.id} style={{ background: '#0a0a0a', border: '1px solid rgba(201,168,76,0.1)' }}>
                <div style={{ aspectRatio: '3/4', overflow: 'hidden', background: '#111' }}>
                  <img src={product.imageUrls?.[0] ?? defaults.heroImageUrl} alt={product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s', display: 'block' }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')} />
                </div>
                <div style={{ padding: '20px 16px 24px' }}>
                  <h3 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 16, fontWeight: 400, marginBottom: 6 }}>{product.name}</h3>
                  {product.description && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12, lineHeight: 1.5 }}>{product.description}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--brand-color, #c9a84c)', fontSize: 14 }}>{formatPrice(product.priceCents, theme.currency)}</span>
                    <button type="button" onClick={() => openQuickView(product)}
                      style={{ fontSize: 10, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 2 }}>
                      {theme.paymentsEnabled ? 'Add to Cart' : 'View'}
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
        <section id="services" style={{ background: '#050505', padding: '80px 24px' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <p style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--brand-color, #c9a84c)', marginBottom: 12, textTransform: 'uppercase' }}>Private Services</p>
              <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 36, fontWeight: 400 }}>By Appointment</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
              {displayServices.map((service) => (
                <div key={service.id} style={{ background: '#0a0a0a', border: '1px solid rgba(201,168,76,0.12)', padding: 32 }}>
                  <h3 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 20, fontWeight: 400, marginBottom: 12 }}>{service.name}</h3>
                  {service.description && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24, lineHeight: 1.6 }}>{service.description}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>{service.durationMinutes} MIN</span>
                    <span style={{ color: 'var(--brand-color, #c9a84c)', fontSize: 18, fontFamily: 'Playfair Display, Georgia, serif' }}>{formatPrice(service.priceCents, theme.currency)}</span>
                  </div>
                  <button type="button" onClick={() => openBooking(service)} disabled={!theme.paymentsEnabled}
                    style={{ width: '100%', padding: '12px', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', background: 'transparent', border: '1px solid var(--brand-color, #c9a84c)', color: 'var(--brand-color, #c9a84c)', cursor: theme.paymentsEnabled ? 'pointer' : 'not-allowed', opacity: theme.paymentsEnabled ? 1 : 0.4 }}>
                    {theme.paymentsEnabled ? 'Request Appointment' : 'Coming Soon'}
                  </button>
                </div>
              ))}
            </div>
            {staff.length > 0 && (
              <div style={{ marginTop: 64, display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap' }}>
                {staff.map((member) => (
                  <div key={member.id} style={{ textAlign: 'center' }}>
                    {member.avatarUrl && <img src={member.avatarUrl} alt={member.name} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 16px', border: '1px solid rgba(201,168,76,0.3)' }} />}
                    <p style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 16 }}>{member.name}</p>
                    {member.bio && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>{member.bio}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer id="footer" style={{ background: '#000', borderTop: '1px solid rgba(201,168,76,0.15)', padding: '48px 24px', textAlign: 'center' }}>
        <p style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 20, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--brand-color, #c9a84c)', marginBottom: 8 }}>{theme.companyName}</p>
        {theme.city && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>{theme.city}</p>}
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 32, letterSpacing: '0.15em', textTransform: 'uppercase' }}>&copy; {new Date().getFullYear()} {theme.companyName}. All rights reserved.</p>
      </footer>

      <ProductQuickView product={quickViewProduct} onClose={closeQuickView} onAddToCart={(p, v) => { addToCart(p, v); closeQuickView(); }} currency={theme.currency} paymentsEnabled={theme.paymentsEnabled} />
      {showProducts && <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={cart} onUpdateQuantity={updateCartQuantity} onRemove={removeFromCart} onCheckout={openCheckout} />}
      <CheckoutModal isOpen={checkoutOpen} onClose={closeCheckout} items={cart} status={orderStatus} error={orderError} orderNumber={orderNumber} clientSecret={orderClientSecret} amountCents={orderAmountCents} stripeAccountId={theme.stripeAccountId} currency={theme.currency} onSubmit={submitOrder} onPaymentSuccess={confirmOrderPayment} onPaymentCancel={cancelOrderPayment} />
      <BookingModal isOpen={bookingOpen} onClose={closeBooking} service={bookingService} selectedDate={selectedDate} selectedSlot={selectedSlot} availableSlots={availableSlots} onSelectDate={selectBookingDate} onSelectSlot={selectBookingSlot} onConfirm={confirmBooking} />
      <BookingStatusOverlay status={bookingStatus} error={bookingError} clientSecret={bookingClientSecret} amountCents={bookingAmountCents} stripeAccountId={theme.stripeAccountId} currency={theme.currency} onClose={closeBooking} onDismiss={dismissBookingStatus} onPaymentSuccess={confirmBookingPayment} onPaymentCancel={cancelBookingPayment} />
    </div>
  );
}
