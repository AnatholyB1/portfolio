'use client';
import { useLanguage } from '@/context/LanguageContext';

export default function FinalCtaSection() {
  const { t } = useLanguage();
  const ts = t.services.finalCta;

  return (
    <section className="final-cta" id="contact-final">
      <div className="wrap">
        <div className="num" data-reveal>{ts.num}</div>
        <h2 className="final-title split">
          <span className="line"><span>{ts.title_l1}</span></span>
          <span className="line"><span>{ts.title_l2}</span></span>
          <span className="line"><span><em className="it">{ts.title_l3_it}</em></span></span>
        </h2>
        <p className="final-desc" data-reveal data-reveal-delay="1">{ts.desc}</p>
        <div className="final-buttons" data-reveal data-reveal-delay="2">
          <a href="/#contact" className="btn btn-primary">
            {ts.cta} <span className="ar">→</span>
          </a>
          <a
            href="mailto:business@contact-selenium-studio.com"
            className="btn btn-ghost"
          >
            {ts.email}
          </a>
        </div>
        <div className="final-note" data-reveal data-reveal-delay="3">{ts.note}</div>
      </div>
    </section>
  );
}
