'use client';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { services } from '@/data/services';

// Offres mises en avant sur l'accueil, dans l'ordre des cartes de t.landing.servicesPreview.cards.
// Les autres services restent atteignables par la ligne « Aussi » et par /services.
const FEATURED_SLUGS = ['site-vitrine', 'seo-referencement', 'rebranding-site-premium', 'google-ads', 'agent-vocal-ia'];

export default function ServicesPreview() {
  const { t } = useLanguage();
  const ts = t.landing.servicesPreview;
  const featured = FEATURED_SLUGS.map((slug) => services.find((s) => s.slug === slug)).filter(
    (s): s is (typeof services)[number] => Boolean(s),
  );
  const others = services.filter((s) => !FEATURED_SLUGS.includes(s.slug));

  return (
    <section className="sec border-t" id="services-preview">
      <div className="wrap">
        <div className="idx-head" data-reveal>
          <div>
            <span className="sec-num">{ts.num}</span>
            <h2 className="sec-title">
              {ts.title_l1}{' '}<br /><em className="it">{ts.title_l2_it}</em>
            </h2>
          </div>
          <p className="sec-intro">{ts.intro}</p>
        </div>

        <ol className="offers">
          {featured.map((s, i) => {
            const card = ts.cards[i];
            return (
              <li key={s.slug} className="offer" data-reveal>
                <h3>{card.t}</h3>
                <p>{card.d}</p>
                <Link className="offer-link" href={`/services/${s.slug}`}>
                  {card.link} <span aria-hidden="true">→</span>
                </Link>
                {s.slug === 'site-vitrine' && (
                  <Link className="offer-guide" href="/guides/prix-site-vitrine">{ts.guide_price}</Link>
                )}
                {s.slug === 'seo-referencement' && (
                  <Link className="offer-guide" href="/guides/seo-local">{ts.guide_seo}</Link>
                )}
              </li>
            );
          })}
        </ol>

        <p className="offers-more" data-reveal>
          <span className="offers-more-label mono">{ts.others}</span>
          {others.map((s) => (
            <Link key={s.slug} href={`/services/${s.slug}`}>{t.services.pages.items[s.index].name}</Link>
          ))}
          <Link className="offers-all" href="/services">{ts.all} <span aria-hidden="true">→</span></Link>
        </p>
        <p className="offers-vat mono">{ts.vat}</p>
      </div>
    </section>
  );
}
