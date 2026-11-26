'use client';
import { useLanguage } from '@/context/LanguageContext';

// Réponses toujours visibles dans le HTML rendu serveur (pas d'accordéon). Le JSON-LD FAQPage de
// l'accueil (src/app/page.tsx) reprend exactement ces textes en français.
export default function FaqSection() {
  const { t } = useLanguage();
  const f = t.landing.faq;

  return (
    <section className="sec border-t" id="faq">
      <div className="wrap">
        <div className="sec-head" data-reveal>
          <span className="sec-num">{f.num}</span>
          <h2 className="sec-title">
            {f.title_l1}{' '}<br /><em className="it">{f.title_l2_it}</em>
          </h2>
        </div>
        <div className="faq-list">
          {f.items.map((item) => (
            <div key={item.q} className="faq-item" data-reveal>
              <h3>{item.q}</h3>
              <p>{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
