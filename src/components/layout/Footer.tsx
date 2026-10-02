'use client';
import { useLanguage } from '@/context/LanguageContext';
import { SevalysWordmark } from '@/components/ui/SevalysMark';
import Link from 'next/link';
import { openConsent } from '@/lib/consent/store';

export default function Footer() {
  const { t } = useLanguage();
  const f = t.landing.footer;

  return (
    <>
      {/* Wordmark block — links to /services */}
      <Link href="/services" className="wordmark wordmark-link">
        <div className="wrap">
          <div className="wordmark-row">
            <span>Sèvalys</span>
            <span className="it">·</span>
            <span>services</span>
            <span className="it">·</span>
            <span>2026</span>
          </div>
        </div>
      </Link>

      <footer>
        <div className="wrap foot">
          <div className="foot-brand">
            <SevalysWordmark />
          </div>
          <span className="label">{f.built}</span>
          <div className="foot-links">
            <Link href="/#manifeste">Manifeste</Link>
            <Link href="/#work">Work</Link>
            <Link href="/services">Services</Link>
            <Link href="/#contact">Contact</Link>
            <a href="/mentions-legales">{f.legal}</a>
            <button type="button" onClick={openConsent}>{f.manageCookies}</button>
          </div>
        </div>
      </footer>
    </>
  );
}
