'use client';
import { useLanguage } from '@/context/LanguageContext';

export default function PhoneAgent() {
  const { t } = useLanguage();
  const pa = t.landing.phone;

  return (
    <section className="sec border-t" id="phone">
      <div className="wrap phone-band">
        <div data-reveal>
          <span className="phone-badge">
            <span className="live" />{pa.badge}
          </span>
          <h2 className="sec-title">
            {pa.title_l1}<br />{pa.title_l2} <em className="it">{pa.title_l3_it}</em>
          </h2>
        </div>
        <div data-reveal data-reveal-delay="1">
          <p className="sec-intro">{pa.sub}</p>
          <a href="/services/agent-vocal-ia" className="btn btn-primary">
            {pa.cta_roi} <span className="ar">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
