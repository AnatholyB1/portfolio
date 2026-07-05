'use client';
import { useLanguage } from '@/context/LanguageContext';
import { SevalysWordmark } from '@/components/ui/SevalysMark';

export default function Footer() {
  const { t } = useLanguage();
  const f = t.landing.footer;

  return (
    <>
      {/* Wordmark block — links to /services */}
      <a href="/services" className="wordmark wordmark-link">
        <div className="wrap">
          <div className="wordmark-row">
            <span>Sèvalys</span>
            <span className="it">·</span>
            <span>services</span>
            <span className="it">·</span>
            <span>2026</span>
          </div>
        </div>
      </a>

      <footer>
        <div className="wrap foot">
          <div className="foot-brand">
            <SevalysWordmark />
          </div>
          <span className="label">{f.built}</span>
          <div className="foot-links">
            <a href="/#manifeste">Manifeste</a>
            <a href="/#work">Work</a>
            <a href="/services">Services</a>
            <a href="/#contact">Contact</a>
            <a href="/mentions-legales">{f.legal}</a>
          </div>
        </div>
      </footer>
    </>
  );
}
