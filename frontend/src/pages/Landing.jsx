import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import './Landing.css';

const GALLERY_IMAGES = [
  { src: '/instagram/03_enfocada.jpg', alt: 'Enfocada en avanzar', span: 'tall' },
  { src: '/instagram/04_espalda.jpg', alt: 'Espalda marcada', span: '' },
  { src: '/instagram/11_post.jpg', alt: 'Verónica Isasmendi', span: '', pos: '50% 15%' },
  { src: '/instagram/gym3.jpg', alt: 'Gym motivation', span: 'tall' },
  { src: '/instagram/gym2.jpg', alt: 'Verónica Isasmendi', span: 'wide' },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const close = (e) => e.key === 'Escape' && setLightbox(null);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  const handleLogin = () => {
    navigate(user ? (user.role === 'admin' ? '/admin' : '/student') : '/login');
  };

  return (
    <div className="landing">

      {/* ─── NAV ─── */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="container nav-container">
          <div className="nav-brand"><span className="brand-vi">VI</span></div>
          <div className="nav-links">
            <a href="#about" className="nav-link">Sobre mí</a>
            <a href="#gallery" className="nav-link">Galería</a>
            <a href="#services" className="nav-link">Servicios</a>
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleLogin}>
            {user ? 'Mi Panel' : 'Iniciar Sesión'}
          </button>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="hero" id="hero">
        <div className="hero-bg-gradient" />
        <div className="hero-particles">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="particle" style={{
              left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`, animationDuration: `${3 + Math.random() * 4}s`
            }} />
          ))}
        </div>

        <div className="container hero-layout">
          {/* Text side */}
          <div className="hero-text">
            <div className="hero-monogram">
              <span className="monogram-v">V</span><span className="monogram-i">I</span>
            </div>
            <h1 className="hero-name">
              <span className="text-script">Verónica</span>
              <span className="hero-surname">ISASMENDI</span>
            </h1>
            <div className="hero-divider"><span className="divider-star">✦</span></div>
            <p className="hero-title">COACH FITNESS</p>
            <p className="hero-subtitle">ONLINE & PRESENCIAL</p>
            <div className="hero-tags">
              <span className="hero-tag">Transformación Corporal Femenina</span>
              <span className="hero-tag-sep">•</span>
              <span className="hero-tag">Fuerza</span>
              <span className="hero-tag-sep">•</span>
              <span className="hero-tag">Definición</span>
            </div>
            <div className="hero-actions">
              <a href="https://wa.me/5493875342706" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg">
                💬 Escribime
              </a>
              <button className="btn btn-secondary btn-lg" onClick={handleLogin}>
                {user ? 'Mi Panel' : 'Acceso Alumnos'}
              </button>
            </div>
          </div>

          {/* Photo side */}
          <div className="hero-photo-wrap">
            <div className="hero-photo-frame">
              <img src="/instagram/gym1.jpg" alt="Verónica Isasmendi" className="hero-photo" />
              <div className="hero-photo-badge">
                <span>🇦🇷</span>
                <span>Fitness Coach</span>
              </div>
            </div>
            <div className="hero-photo-accent hero-photo-accent-1" />
            <div className="hero-photo-accent hero-photo-accent-2" />
          </div>
        </div>

        <div className="hero-scroll-indicator"><div className="scroll-line" /></div>
      </section>

      {/* ─── ABOUT ─── */}
      <section className="about section" id="about">
        <div className="container">
          <div className="about-layout">

            {/* Photos column */}
            <div className="about-photos">
              <div className="about-photo-main">
                <img src="/instagram/gym2.jpg" alt="Verónica Isasmendi" />
                <div className="about-photo-tag">
                  <span>7.2K</span> seguidores
                </div>
              </div>
              <div className="about-photo-overlay">
                <img src="/instagram/gym3.jpg" alt="Entrenamiento" />
              </div>
            </div>

            {/* Text column */}
            <div className="about-text">
              <span className="about-eyebrow">✦ Sobre mí</span>
              <h2 className="about-name text-script">Verónica</h2>
              <p className="about-role">Coach Fitness · Argentina 🇦🇷</p>

              <blockquote className="about-quote-block">
                <p>"No entreno solo por un cuerpo,<br />entreno para ser <strong>MI MEJOR VERSIÓN</strong>."</p>
              </blockquote>

              <p className="about-bio">
                Soy Verónica Isasmendi, Coach Fitness especializada en <strong>transformación corporal femenina</strong>.
                Diseño planes de entrenamiento y nutrición 100% personalizados para que cada mujer alcance
                su mejor versión — con fuerza, disciplina y sin renunciar a su estilo de vida.
              </p>

              <div className="about-stats">
                <div className="about-stat">
                  <span className="about-stat-num">129</span>
                  <span className="about-stat-label">Publicaciones</span>
                </div>
                <div className="about-stat-divider" />
                <div className="about-stat">
                  <span className="about-stat-num">7.2K</span>
                  <span className="about-stat-label">Seguidoras</span>
                </div>
                <div className="about-stat-divider" />
                <div className="about-stat">
                  <span className="about-stat-num">100%</span>
                  <span className="about-stat-label">Personalizado</span>
                </div>
              </div>

              <a
                href="https://instagram.com/vero_isasmendiok"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                📸 Seguime en Instagram
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SERVICES ─── */}
      <section className="services section" id="services">
        <div className="container">
          <h2 className="section-title text-display"><span className="text-gradient">¿Qué hago por vos?</span></h2>
          <div className="services-grid">
            {[
              { icon: '🏋️‍♀️', title: 'Entrenamiento Personalizado', desc: 'Rutinas diseñadas para tus objetivos, tu nivel y tu disponibilidad.' },
              { icon: '📋', title: 'Planes 100% Adaptados', desc: 'Cada plan se adapta a tu ritmo de vida, ya sea online o presencial.' },
              { icon: '📈', title: 'Resultados Reales', desc: 'Seguimiento constante, ajustes semanales y motivación.' },
              { icon: '🥗', title: 'Plan Nutricional', desc: 'Alimentación organizada por día para acompañar tu entrenamiento.' },
            ].map((s, i) => (
              <div key={i} className="service-card">
                <div className="service-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── GALLERY ─── */}
      <section className="gallery section" id="gallery">
        <div className="container">
          <h2 className="section-title text-display"><span className="text-gradient">Resultados & Estilo</span></h2>
          <p className="section-subtitle">La transformación se ve, se siente y se vive.</p>

          <div className="gallery-grid">
            {GALLERY_IMAGES.map((img, i) => (
              <div
                key={i}
                className={`gallery-item ${img.span ? `gallery-item--${img.span}` : ''}`}
                onClick={() => setLightbox(img)}
              >
                <img src={img.src} alt={img.alt} loading="lazy" style={img.pos ? { objectPosition: img.pos } : {}} />
                <div className="gallery-overlay">
                  <span className="gallery-zoom">+</span>
                </div>
              </div>
            ))}
          </div>

          <div className="gallery-footer">
            <a
              href="https://instagram.com/vero_isasmendiok"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              📸 Ver más en @vero_isasmendiok
            </a>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="how-it-works section">
        <div className="container">
          <h2 className="section-title text-display"><span className="text-gradient">¿Cómo funciona?</span></h2>
          <div className="steps-grid">
            {[
              { n: '01', icon: '💬', t: 'Contactame', d: 'Escribime por WhatsApp y charlamos sobre tus objetivos y tu estilo de vida.' },
              { n: '02', icon: '📋', t: 'Plan a tu medida', d: 'Armo tu rutina y plan nutricional 100% personalizado para vos.' },
              { n: '03', icon: '📱', t: 'Accedé a tu plataforma', d: 'Entrá con tu usuario y encontrá todo organizado día por día.' },
              { n: '04', icon: '⚡', t: 'Transformate', d: 'Seguí tu plan, recibí ajustes semanales y lográ tus resultados.' },
            ].map((step, i) => (
              <div key={i} className="step-card">
                <div className="step-icon-wrap">{step.icon}</div>
                <div className="step-badge">{step.n}</div>
                <h3 className="step-title">{step.t}</h3>
                <p className="step-desc">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WEEK PREVIEW ─── */}
      <section className="schedule section">
        <div className="container">
          <h2 className="section-title text-display"><span className="text-gradient">Tu semana organizada</span></h2>
          <p className="section-subtitle">Cada día tiene su rutina y su plan nutricional. Todo en un solo lugar.</p>
          <div className="week-preview">
            {[
              { short: 'LUN', full: 'Lunes' },
              { short: 'MAR', full: 'Martes' },
              { short: 'MIÉ', full: 'Miércoles' },
              { short: 'JUE', full: 'Jueves' },
              { short: 'VIE', full: 'Viernes' },
              { short: 'SÁB', full: 'Sábado' },
              { short: 'DOM', full: 'Domingo' },
            ].map((day, i) => (
              <div key={day.short} className="day-card" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="day-name">{day.short}</div>
                <div className="day-pills">
                  <span className="day-pill day-pill--training">Entreno</span>
                  <span className="day-pill day-pill--nutrition">Nutrición</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="cta section">
        <div className="cta-bg">
          <img src="/instagram/04_espalda.jpg" alt="" aria-hidden="true" />
        </div>
        <div className="container">
          <div className="cta-content">
            <h2 className="text-display cta-title">¿Lista para empezar tu <span className="text-gradient">transformación</span>?</h2>
            <p className="cta-text">Escribime y empezamos juntas.</p>
            <div className="cta-buttons">
              <a href="https://wa.me/5493875342706" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg">💬 WhatsApp</a>
              <button className="btn btn-secondary btn-lg" onClick={handleLogin}>{user ? 'Mi Panel' : 'Acceso Alumnos'}</button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="landing-footer">
        <div className="container footer-content">
          <div className="footer-brand">
            <span className="brand-vi">VI</span>
            <span className="footer-name text-script">Verónica Isasmendi</span>
          </div>
          <p className="footer-tagline">Coach Fitness · Online & Presencial</p>
          <div className="footer-links">
            <a href="https://instagram.com/vero_isasmendiok" target="_blank" rel="noopener noreferrer">Instagram</a>
            <span>·</span>
            <a href="https://wa.me/5493875342706" target="_blank" rel="noopener noreferrer">WhatsApp</a>
            <span>·</span>
            <button className="footer-link-btn" onClick={handleLogin}>Acceso Alumnos</button>
          </div>
          <div className="footer-divider" />
          <p className="footer-copy">© 2026 Verónica Isasmendi. Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* ─── LIGHTBOX ─── */}
      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <img src={lightbox.src} alt={lightbox.alt} />
            {lightbox.alt && <p className="lightbox-desc">{lightbox.alt}</p>}
            <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
