'use client';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import type { Lang } from '@/lib/translations';

const LANGS: Lang[] = ['fr', 'en', 'th'];

export default function Navbar() {
  const { t, lang, setLang } = useLanguage();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <a href="/#top" className="nav-brand">
        <span className="glyph" />
        BRICON ANATHOLY
      </a>

      <div className="nav-links">
        {/* Absolute hrefs so anchor links work from /services (pitfall documented in research) */}
        <a href="/#manifeste">{t.nav.manifeste}</a>
        <a href="/#work">{t.nav.work}</a>
        <a href="/services">{t.nav.services}</a>
        <a href="/#contact">{t.nav.contact}</a>

        <div className="lang-switch">
          {LANGS.map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={lang === l ? 'active' : ''}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
