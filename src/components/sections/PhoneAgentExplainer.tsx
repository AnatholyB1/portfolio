'use client';
import { useLanguage } from '@/context/LanguageContext';

export default function PhoneAgentExplainer() {
  const { t } = useLanguage();
  const ts = t.services.phone;

  return (
    <section className="sec border-t" id="phone-agent">
      <div className="wrap">
        <div className="sec-head" data-reveal>
          <div className="sec-num">{ts.num}</div>
          <h2 className="sec-title">
            {ts.title_l1}<br />
            {ts.title_l2} <em className="it">{ts.title_l3_it}</em>
          </h2>
          <p className="sec-intro">{ts.sub}</p>
        </div>

        <div className="phone-steps">
          {ts.steps.map((s, i) => (
            <div
              className="ph-step"
              key={i}
              data-reveal
              data-reveal-delay={String(i)}
            >
              <div className="ico">{String(i + 1).padStart(2, '0')}</div>
              <h4>{s.label}</h4>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="phone-cta" data-reveal style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/demo" className="btn btn-primary">
            {ts.cta} <span className="ar">→</span>
          </a>
          <a href="/calculateur-roi" className="btn btn-ghost">{ts.cta_roi}</a>
        </div>
      </div>
    </section>
  );
}
