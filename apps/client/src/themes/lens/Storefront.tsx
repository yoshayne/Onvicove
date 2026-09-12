import { useState, useEffect } from 'react';
import { Menu, X, ShoppingCart, Clock, ArrowRight, Instagram } from 'lucide-react';
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

function ServiceDesc({ desc }: { desc: string }) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 120;
  if (desc.length <= LIMIT) {
    return <p style={{ fontSize: 13, color: 'rgba(240,237,232,0.55)', lineHeight: 1.55, marginBottom: 16 }}>{desc}</p>;
  }
  return (
    <p style={{ fontSize: 13, color: 'rgba(240,237,232,0.55)', lineHeight: 1.55, marginBottom: 16 }}>
      {expanded ? desc : desc.slice(0, LIMIT) + '…'}
      {' '}
      <button onClick={() => setExpanded(!expanded)} style={{ fontSize: 11, color: '#c8a96e', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}>
        {expanded ? 'Show less' : 'Read more'}
      </button>
    </p>
  );
}

export default function Storefront({ theme, products, services, staff, visibleSections, galleries }: ThemeProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [customOrderOpen, setCustomOrderOpen] = useState(false);
  const { subscribe, subscribeStatus, submitCustomOrder, customOrderStatus } = useStorefrontForms(theme.slug ?? '');

  const {
    cart, cartOpen, setCartOpen, addToCart, updateCartQuantity, removeFromCart,
    quickViewProduct, openQuickView, closeQuickView,
    checkoutOpen, openCheckout, closeCheckout, orderStatus, orderError, orderNumber, submitOrder,
    orderClientSecret, orderAmountCents, confirmOrderPayment, cancelOrderPayment,
    bookingService, bookingOpen, openBooking, closeBooking, selectedDate, selectedSlot,
    availableSlots, bookingCityLabel, selectBookingDate, selectBookingSlot, bookingStatus, bookingError,
    confirmBooking, confirmBookingPayment, cancelBookingPayment, dismissBookingStatus,
    bookingClientSecret, bookingAmountCents,
  } = useStorefrontCommerce(theme.slug);

  const displayProducts = products.length > 0 ? products : defaults.products;
  const displayServices = services.length > 0 ? services : defaults.services;
  const heroImage = theme.heroImageUrl || defaults.heroImageUrl;
  const heroOpacity = theme.heroImageOpacity !== undefined ? theme.heroImageOpacity / 100 : 1;
  const tagline = theme.tagline || defaults.tagline;
  const accent = theme.brandColor || '#c8a96e';

  const isVis = (s: string) => !visibleSections || visibleSections.includes(s);
  const secOrder = (s: string) => visibleSections ? (visibleSections.indexOf(s) + 1 || 99) : 0;
  const showProducts = isVis('featured-products') && (theme.mode === 'store' || theme.mode === 'both') && displayProducts.length > 0;
  const showServices = isVis('services') && (theme.mode === 'book' || theme.mode === 'both') && displayServices.length > 0;
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => {
    const el = document.querySelector('link[data-font="cormorant"]');
    if (el) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap';
    link.setAttribute('data-font', 'cormorant');
    document.head.appendChild(link);
  }, []);

  return (
    <div style={{ background: '#0c0c0c', color: '#f0ede8', fontFamily: 'Inter, sans-serif', minHeight: '100vh' }}>
      <style>{`
        .lens-heading { font-family: 'Cormorant Garamond', Georgia, serif; }
        .lens-card-img { transition: transform 0.7s ease; }
        .lens-card:hover .lens-card-img { transform: scale(1.04); }
        .lens-pkg-card { border: 1px solid rgba(200,169,110,0.15); transition: border-color 0.3s, background 0.3s; }
        .lens-pkg-card:hover { border-color: rgba(200,169,110,0.5); background: rgba(200,169,110,0.04); }
        @media (max-width: 640px) {
          .lens-sessions-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .lens-service-card { display: flex !important; flex-direction: row !important; overflow: hidden; cursor: pointer; }
          .lens-service-img-wrap { width: 120px !important; min-width: 120px; aspect-ratio: unset !important; height: 160px !important; }
          .lens-service-info { position: static !important; padding: 16px !important; flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
          .lens-service-info h3 { font-size: 18px !important; margin-bottom: 4px !important; }
          .lens-sessions-section { padding: 48px 0 !important; }
          .lens-hero-content { padding: 16px 20px 32px !important; }
          .lens-hero-content h1 { font-size: clamp(2rem, 9vw, 3rem) !important; }
        }
      `}</style>

      {/* ── Nav ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(12,12,12,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(240,237,232,0.08)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="lens-heading" style={{ fontSize: 22, letterSpacing: '0.04em', fontWeight: 400 }}>{theme.companyName}</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <div style={{ display: 'none', alignItems: 'center', gap: 32, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(240,237,232,0.5)' }} className="lens-nav-links">
              {showServices && <a href="#sessions" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = accent)} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,237,232,0.5)')}>Sessions</a>}
              {showProducts && <a href="#packages" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = accent)} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,237,232,0.5)')}>Packages</a>}
              {galleries && galleries.length > 0 && <a href="#gallery" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = accent)} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,237,232,0.5)')}>Gallery</a>}
              <a href="#contact" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = accent)} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,237,232,0.5)')}>Contact</a>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {showProducts && (
                <button type="button" onClick={() => setCartOpen(true)} style={{ position: 'relative', background: 'none', border: 'none', color: '#f0ede8', cursor: 'pointer', padding: 8 }}>
                  <ShoppingCart size={18} />
                  {cartCount > 0 && <span style={{ position: 'absolute', top: 2, right: 2, width: 14, height: 14, borderRadius: '50%', background: accent, color: '#0c0c0c', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cartCount}</span>}
                </button>
              )}
              <button type="button" onClick={() => setMobileMenuOpen(true)} style={{ background: 'none', border: 'none', color: '#f0ede8', cursor: 'pointer', display: 'block', padding: 8 }}>
                <Menu size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#0c0c0c', display: 'flex', flexDirection: 'column', padding: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 48 }}>
            <span className="lens-heading" style={{ fontSize: 22 }}>{theme.companyName}</span>
            <button type="button" onClick={() => setMobileMenuOpen(false)} style={{ background: 'none', border: 'none', color: '#f0ede8', cursor: 'pointer' }}><X size={24} /></button>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {showServices && <a href="#sessions" onClick={() => setMobileMenuOpen(false)} className="lens-heading" style={{ fontSize: 44, color: '#f0ede8', textDecoration: 'none', fontWeight: 300, letterSpacing: '0.02em' }}>Sessions</a>}
            {showProducts && <a href="#packages" onClick={() => setMobileMenuOpen(false)} className="lens-heading" style={{ fontSize: 44, color: '#f0ede8', textDecoration: 'none', fontWeight: 300, letterSpacing: '0.02em' }}>Packages</a>}
            {galleries && galleries.length > 0 && <a href="#gallery" onClick={() => setMobileMenuOpen(false)} className="lens-heading" style={{ fontSize: 44, color: '#f0ede8', textDecoration: 'none', fontWeight: 300, letterSpacing: '0.02em' }}>Gallery</a>}
            <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="lens-heading" style={{ fontSize: 44, color: '#f0ede8', textDecoration: 'none', fontWeight: 300, letterSpacing: '0.02em' }}>Contact</a>
          </nav>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' }}>

        {/* ── Hero ── */}
        {isVis('hero') && (
          <section className="lens-hero" style={{ order: secOrder('hero'), position: 'relative', background: '#0c0c0c', height: '75vh', overflow: 'hidden' }}>
            {heroImage && (
              <img
                src={heroImage}
                alt=""
                data-hero-img="1"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block', opacity: heroOpacity }}
              />
            )}
            {/* gradient + text overlay */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(12,12,12,0.88) 0%, rgba(12,12,12,0.15) 60%, transparent 100%)', pointerEvents: 'none' }} />
            <div className="lens-hero-content" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '0 32px 56px', width: '100%', boxSizing: 'border-box' }}>
              <p style={{ fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: accent, marginBottom: 16, fontWeight: 500 }}>{theme.city || theme.industry || 'Photography'}</p>
              <h1 className="lens-heading" style={{ fontSize: 'clamp(3rem, 8vw, 7rem)', fontWeight: 300, lineHeight: 1.05, marginBottom: 24, letterSpacing: '-0.01em' }}>{theme.companyName}</h1>
              <p style={{ fontSize: 16, color: 'rgba(240,237,232,0.65)', maxWidth: 480, lineHeight: 1.6, marginBottom: 40 }}>{tagline}</p>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {showServices && (
                  <a href="#sessions" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', background: accent, color: '#0c0c0c', textDecoration: 'none', fontSize: 12, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    Book a Session <ArrowRight size={14} />
                  </a>
                )}
                {showProducts && (
                  <a href="#packages" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', border: '1px solid rgba(240,237,232,0.3)', color: '#f0ede8', textDecoration: 'none', fontSize: 12, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    View Packages
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Sessions (Services) ── */}
        {showServices && (
          <section id="sessions" className="lens-sessions-section" style={{ order: secOrder('services'), padding: '96px 0', background: '#0c0c0c' }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
              <div style={{ marginBottom: 64 }}>
                <p style={{ fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: accent, marginBottom: 12 }}>— What I Offer</p>
                <h2 className="lens-heading" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 300, letterSpacing: '0.01em' }}>Sessions</h2>
              </div>
              <div className="lens-sessions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
                {displayServices.map((service) => (
                  <div key={service.id} className="lens-card lens-service-card" style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer' }} onClick={() => openBooking(service)}>
                    <div className="lens-service-img-wrap" style={{ aspectRatio: '4/5', overflow: 'hidden', background: '#181818' }}>
                      {service.imageUrls?.[0] ? (
                        <img src={service.imageUrls[0]} alt={service.name} className="lens-card-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: '#181818', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="lens-heading" style={{ fontSize: 48, color: 'rgba(240,237,232,0.1)' }}>✦</span>
                        </div>
                      )}
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(12,12,12,0.9) 0%, transparent 55%)' }} />
                    </div>
                    <div className="lens-service-info" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 24px 28px' }}>
                      <h3 className="lens-heading" style={{ fontSize: 26, fontWeight: 400, marginBottom: 6, letterSpacing: '0.01em' }}>{service.name}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: service.description ? 10 : 0 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(240,237,232,0.5)', letterSpacing: '0.1em' }}>
                          <Clock size={11} /> {service.durationMinutes} min
                        </span>
                        <span style={{ color: accent, fontSize: 18, fontWeight: 500 }}>{formatPrice(service.priceCents, theme.currency)}</span>
                      </div>
                      {service.description && <ServiceDesc desc={service.description} />}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openBooking(service); }}
                        disabled={!theme.paymentsEnabled}
                        style={{ width: '100%', padding: '12px', background: 'transparent', border: `1px solid ${accent}`, color: accent, fontSize: 11, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: theme.paymentsEnabled ? 'pointer' : 'default', opacity: theme.paymentsEnabled ? 1 : 0.5 }}
                      >
                        {theme.paymentsEnabled ? 'Book Now' : 'Coming Soon'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Packages / Products ── */}
        {showProducts && (
          <section id="packages" style={{ order: secOrder('featured-products'), padding: '96px 0', background: '#0f0f0f' }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
              <div style={{ marginBottom: 64 }}>
                <p style={{ fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: accent, marginBottom: 12 }}>— Take It Home</p>
                <h2 className="lens-heading" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 300, letterSpacing: '0.01em' }}>Packages & Prints</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                {displayProducts.map((product) => (
                  <div key={product.id} className="lens-pkg-card" style={{ padding: 28, cursor: 'pointer' }} onClick={() => openQuickView(product)}>
                    <div style={{ aspectRatio: '3/2', overflow: 'hidden', background: '#181818', marginBottom: 20 }}>
                      {product.imageUrls?.[0] ? (
                        <img src={product.imageUrls[0]} alt={product.name} className="lens-card-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: '#1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 32, color: 'rgba(240,237,232,0.1)' }}>✦</span>
                        </div>
                      )}
                    </div>
                    {product.category && (
                      <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, marginBottom: 6 }}>{product.category}</p>
                    )}
                    <h3 className="lens-heading" style={{ fontSize: 22, fontWeight: 400, marginBottom: 8 }}>{product.name}</h3>
                    {product.description && (
                      <p style={{ fontSize: 13, color: 'rgba(240,237,232,0.5)', lineHeight: 1.6, marginBottom: 16 }}>{product.description}</p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 20, color: '#f0ede8', fontWeight: 300 }}>{formatPrice(product.priceCents, theme.currency)}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                        style={{ padding: '8px 18px', background: accent, color: '#0c0c0c', border: 'none', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Team / Photographer bio ── */}
        {staff.length > 0 && isVis('staff') && (
          <section style={{ order: secOrder('staff'), padding: '96px 0', background: '#0c0c0c' }}>
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>
              <p style={{ fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: accent, marginBottom: 12 }}>— The Photographer</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
                {staff.map((member) => (
                  <div key={member.id} style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 40, alignItems: 'start' }}>
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt={member.name} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', filter: 'grayscale(20%)' }} />
                    ) : (
                      <div style={{ width: '100%', aspectRatio: '1', background: '#1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="lens-heading" style={{ fontSize: 48, color: 'rgba(240,237,232,0.1)' }}>{member.name[0]}</span>
                      </div>
                    )}
                    <div>
                      <h3 className="lens-heading" style={{ fontSize: 36, fontWeight: 300, marginBottom: 16, letterSpacing: '0.01em' }}>{member.name}</h3>
                      {member.bio && <p style={{ fontSize: 15, color: 'rgba(240,237,232,0.6)', lineHeight: 1.75 }}>{member.bio}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Galleries ── */}
        {galleries && galleries.length > 0 && galleries.map((g) => (
          <div key={g.id} id={g === galleries[0] ? 'gallery' : undefined} style={{ order: secOrder(g.id) }}>
            <Gallery layout={g.layout} images={g.images ?? []} title={g.title} />
          </div>
        ))}

      </div>{/* end ordered sections */}

      {/* ── Footer / Contact ── */}
      <footer id="contact" style={{ background: '#080808', borderTop: '1px solid rgba(240,237,232,0.06)', padding: '80px 0 48px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 48, marginBottom: 64 }}>
            <div>
              <span className="lens-heading" style={{ fontSize: 28, fontWeight: 300, display: 'block', marginBottom: 12 }}>{theme.companyName}</span>
              <p style={{ fontSize: 13, color: 'rgba(240,237,232,0.4)', lineHeight: 1.7 }}>{tagline}</p>
              {theme.city && <p style={{ marginTop: 12, fontSize: 12, color: 'rgba(240,237,232,0.3)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{theme.city}</p>}
            </div>
            <div>
              <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(240,237,232,0.25)', marginBottom: 20 }}>Navigate</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {showServices && <a href="#sessions" style={{ color: 'rgba(240,237,232,0.5)', textDecoration: 'none', fontSize: 14, transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = accent)} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,237,232,0.5)')}>Sessions</a>}
                {showProducts && <a href="#packages" style={{ color: 'rgba(240,237,232,0.5)', textDecoration: 'none', fontSize: 14, transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = accent)} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,237,232,0.5)')}>Packages & Prints</a>}
                <button type="button" onClick={() => setCustomOrderOpen(true)} style={{ background: 'none', border: 'none', color: 'rgba(240,237,232,0.5)', fontSize: 14, cursor: 'pointer', padding: 0, textAlign: 'left', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = accent)} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,237,232,0.5)')}>Custom Project</button>
              </div>
            </div>
            <div>
              <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(240,237,232,0.25)', marginBottom: 20 }}>Stay Connected</p>
              <p style={{ fontSize: 13, color: 'rgba(240,237,232,0.4)', marginBottom: 16, lineHeight: 1.6 }}>Get session openings and new work straight to your inbox.</p>
              <form onSubmit={(e) => { e.preventDefault(); subscribe(emailInput); }} style={{ display: 'flex', gap: 0 }}>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  style={{ flex: 1, background: '#141414', border: '1px solid rgba(240,237,232,0.12)', borderRight: 'none', padding: '12px 16px', color: '#f0ede8', fontSize: 13, outline: 'none' }}
                />
                <button
                  type="submit"
                  disabled={subscribeStatus === 'loading' || subscribeStatus === 'success'}
                  style={{ padding: '12px 20px', background: accent, border: 'none', color: '#0c0c0c', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', opacity: subscribeStatus === 'loading' ? 0.6 : 1 }}
                >
                  {subscribeStatus === 'success' ? '✓' : subscribeStatus === 'loading' ? '…' : 'Join'}
                </button>
              </form>
            </div>
          </div>
          <ContactBlock theme={theme} textColor="rgba(240,237,232,0.4)" />
          <div style={{ borderTop: '1px solid rgba(240,237,232,0.06)', marginTop: 40, paddingTop: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <p style={{ fontSize: 12, color: 'rgba(240,237,232,0.2)', letterSpacing: '0.1em' }}>© {new Date().getFullYear()} {theme.companyName}</p>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <Instagram size={16} style={{ color: 'rgba(240,237,232,0.25)', cursor: 'pointer' }} />
            </div>
          </div>
        </div>
      </footer>

      {/* ── Commerce overlays ── */}
      <ProductQuickView
        product={quickViewProduct}
        onClose={closeQuickView}
        onAddToCart={(product, variant) => { addToCart(product, variant); closeQuickView(); }}
        currency={theme.currency}
        paymentsEnabled={theme.paymentsEnabled}
      />
      {showProducts && (
        <CartDrawer
          isOpen={cartOpen}
          onClose={() => setCartOpen(false)}
          items={cart}
          onUpdateQuantity={updateCartQuantity}
          onRemove={removeFromCart}
          onCheckout={openCheckout}
        />
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
        onSubmit={submitOrder}
        onPaymentSuccess={confirmOrderPayment}
        onPaymentCancel={cancelOrderPayment}
      />
      <BookingModal
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
