'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import type { Lang } from '@/lib/translations';
import { SevalysWordmark } from '@/components/ui/SevalysMark';

const LANGS: Lang[] = ['fr', 'en', 'th'];
const SECTIONS = ['contact', 'work', 'manifeste'] as const; // reverse order: last wins

export default function Navbar() {
  const { t, lang, setLang } = useLanguage();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Section detection — only on landing page
  useEffect(() => {
    if (pathname !== '/') { setActiveSection(null); return; }

    const observers: IntersectionObserver[] = [];
    const visible = new Set<string>();

    SECTIONS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
          // pick the first visible in reading order
          const found = SECTIONS.slice().reverse().find((s) => visible.has(s));
          setActiveSection(found ?? null);
        },
        { threshold: 0.3 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [pathname]);

  const isServices = pathname === '/services';

  return (
    <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <a href="/#top" className="nav-brand" aria-label="Sèvalys — accueil">
        <SevalysWordmark />
      </a>

      <div className="nav-links">
        <a href="/#manifeste" className={activeSection === 'manifeste' ? 'active' : ''}>{t.nav.manifeste}</a>
        <a href="/#work"      className={activeSection === 'work'      ? 'active' : ''}>{t.nav.work}</a>
        <a href="/services"   className={isServices                    ? 'active' : ''}>{t.nav.services}</a>
        <a href="/#contact"   className={activeSection === 'contact'   ? 'active' : ''}>{t.nav.contact}</a>

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
