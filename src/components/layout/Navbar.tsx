'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import type { Lang } from '@/lib/translations';
import { SevalysWordmark } from '@/components/ui/SevalysMark';

const LANGS: Lang[] = ['fr', 'en', 'th'];
const MENU_LABEL: Record<Lang, string> = { fr: 'Menu', en: 'Menu', th: 'เมนู' };
const CLOSE_LABEL: Record<Lang, string> = { fr: 'Fermer', en: 'Close', th: 'ปิด' };
const SECTIONS = ['contact', 'work', 'manifeste'] as const; // reverse order: last wins

export default function Navbar() {
  const { t, lang, setLang } = useLanguage();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [deep, setDeep] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onScroll = () => { setScrolled(window.scrollY > 40); setDeep(window.scrollY > 520); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); burgerRef.current?.focus(); }
    };
    const onResize = () => { if (window.innerWidth > 900) setOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  // Section detection — only on landing page
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset active section when leaving the landing page
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
  const showCta = !open && deep && !pathname.startsWith('/simulateur');
  const links = [
    { href: '/#manifeste', label: t.nav.manifeste },
    { href: '/#work', label: t.nav.work },
    { href: '/services', label: t.nav.services },
    { href: '/#contact', label: t.nav.contact },
  ];

  return (
    <>
    <nav className={`nav ${scrolled ? 'scrolled' : ''}${open ? ' menu-open' : ''}`}>
      <Link href="/#top" className="nav-brand" aria-label="Sèvalys — accueil">
        <SevalysWordmark />
      </Link>

      <button
        ref={burgerRef}
        type="button"
        className={`nav-burger${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-controls="nav-panel"
        aria-label={open ? CLOSE_LABEL[lang] : MENU_LABEL[lang]}
        onClick={() => setOpen((v) => !v)}
      >
        <span /><span />
      </button>

      <div className="nav-links">
        <Link href="/#manifeste" className={activeSection === 'manifeste' ? 'active' : ''}>{t.nav.manifeste}</Link>
        <Link href="/#work"      className={activeSection === 'work'      ? 'active' : ''}>{t.nav.work}</Link>
        <Link href="/services"   className={isServices                    ? 'active' : ''}>{t.nav.services}</Link>
        <Link href="/#contact"   className={activeSection === 'contact'   ? 'active' : ''}>{t.nav.contact}</Link>

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

    {open && (
      <div id="nav-panel" className="nav-panel" ref={panelRef} role="dialog" aria-modal="true" aria-label={MENU_LABEL[lang]}>
        <ul className="np-links">
          {links.map((l) => (
            <li key={l.href}>
              <a className="np-link" href={l.href} onClick={closeMenu}>
                <span>{l.label}</span><span aria-hidden="true">→</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="np-foot">
          <div className="lang-switch">
            {LANGS.map((l) => (
              <button key={l} type="button" onClick={() => setLang(l)} className={lang === l ? 'active' : ''}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <a className="btn btn-primary np-cta" href="/simulateur" onClick={closeMenu}>
            {t.landing.hero.cta_primary} <span className="ar">→</span>
          </a>
        </div>
      </div>
    )}

    <div className={`mcta${showCta ? ' mcta-show' : ''}`} aria-hidden={!showCta}>
      <a className="btn btn-primary" href="/simulateur" tabIndex={showCta ? 0 : -1}>
        {t.landing.hero.cta_primary} <span className="ar">→</span>
      </a>
    </div>
    </>
  );
}
