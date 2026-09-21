'use client';
import { useLanguage } from '@/context/LanguageContext';

export default function PhoneAgent() {
  const { t } = useLanguage();
  const pa = t.landing.phone;

  return (
    <section className="sec border-t" id="phone">
      <div className="wrap" style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
        <span className="phone-badge" data-reveal>
          <span className="live" />{pa.badge}
        </span>
        <h2 className="sec-title" data-reveal>
          {pa.title_l1}<br />{pa.title_l2} <em className="it">{pa.title_l3_it}</em>
        </h2>
        <p className="sec-intro">{pa.sub}</p>
        <a href="/services/agent-vocal-ia" className="btn btn-primary">
          {pa.cta_roi} <span className="ar">→</span>
        </a>
      </div>
    </section>
  );
}
