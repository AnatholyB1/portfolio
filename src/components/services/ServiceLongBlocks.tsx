import Link from 'next/link';
import type { Project } from '@/data/projects';
import type {
  ServicePageContent,
  ServicePageExtraLabels,
} from '@/lib/translations';

// Blocs « contenu long » optionnels des pages /services/[slug]. Chaque export
// ne rend rien quand sa donnée est absente. Volontairement sans data-reveal ni
// animation : contenu indexable, présent dès le premier rendu (LCP).

export function LongIntro({ paragraphs }: { paragraphs: ServicePageContent['longIntro'] }) {
  if (!paragraphs || paragraphs.length === 0) return null;
  return (
    <section className="svc-sec svc-intro">
      <div className="wrap">
        {paragraphs.map((para, i) => (
          <p className="svc-body" key={i}>{para}</p>
        ))}
      </div>
    </section>
  );
}

export function LongSections({ sections }: { sections: ServicePageContent['sections'] }) {
  if (!sections || sections.length === 0) return null;
  return (
    <>
      {sections.map((s, i) => (
        <section className="svc-sec" key={i}>
          <div className="wrap">
            <div className="svc-split">
              <h2 className="svc-h2">{s.h2}</h2>
              <div className="svc-long">
                {s.paragraphs.map((para, j) => (
                  <p className="svc-body" key={j}>{para}</p>
                ))}
                {s.list && s.list.length > 0 ? (
                  <ul className="svc-list">
                    {s.list.map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                ) : null}
                {s.link ? (
                  <Link className="svc-crosslink" href={s.link.href}>{s.link.label}</Link>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ))}
    </>
  );
}

export function StepsBlock({
  steps,
  labels,
}: {
  steps: ServicePageContent['steps'];
  labels: ServicePageExtraLabels;
}) {
  if (!steps || steps.length === 0) return null;
  return (
    <section className="svc-sec" aria-labelledby="svc-steps-h">
      <div className="wrap">
        <div className="svc-split">
          <h2 className="svc-h2" id="svc-steps-h">{labels.stepsHeading}</h2>
          <ol className="svc-steps">
            {steps.map((st, i) => (
              <li className="svc-step" key={i}>
                <span className="svc-step-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{st.title}</h3>
                  <p>{st.text}</p>
                  <p className="svc-step-d">{labels.stepDuration} : {st.duration}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

export function PricingBlock({
  pricing,
  labels,
  locale,
}: {
  pricing: ServicePageContent['pricing'];
  labels: ServicePageExtraLabels;
  locale: string;
}) {
  if (!pricing) return null;
  const amount = new Intl.NumberFormat(
    locale === 'fr' ? 'fr-FR' : locale === 'th' ? 'th-TH' : 'en-GB',
    { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }
  ).format(pricing.price);
  return (
    <section className="svc-sec svc-pricing" aria-labelledby="svc-pricing-h">
      <div className="wrap">
        <div className="svc-split">
          <h2 className="svc-h2" id="svc-pricing-h">{labels.pricingHeading}</h2>
          <div>
            <p className="svc-price">
              <span className="svc-price-from">{pricing.fromLabel}</span>{' '}
              <strong>{amount}</strong>{' '}
              <span className="svc-price-unit">{pricing.unit}</span>
            </p>
            <div className="svc-incl">
              <div>
                <h3>{labels.pricingIncludes}</h3>
                <ul className="svc-list svc-list-yes">
                  {pricing.includes.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
              {pricing.notIncluded.length > 0 ? (
                <div>
                  <h3>{labels.pricingNotIncluded}</h3>
                  <ul className="svc-list svc-list-no">
                    {pricing.notIncluded.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            {pricing.extras.length > 0 ? (
              <div className="svc-table-wrap">
                <table className="svc-table">
                  <caption>{labels.pricingExtras}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{labels.extrasColLabel}</th>
                      <th scope="col">{labels.extrasColPrice}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricing.extras.map((x, i) => (
                      <tr key={i}>
                        <th scope="row">{x.label}</th>
                        <td>{x.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            <p className="svc-note">{pricing.note}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AreasBlock({
  areas,
  labels,
}: {
  areas: ServicePageContent['areas'];
  labels: ServicePageExtraLabels;
}) {
  if (!areas || areas.length === 0) return null;
  return (
    <section className="svc-sec" aria-labelledby="svc-areas-h">
      <div className="wrap">
        <div className="svc-split">
          <h2 className="svc-h2" id="svc-areas-h">{labels.areasHeading}</h2>
          <ul className="svc-areas">
            {areas.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function ProofProjectsBlock({
  projects,
  labels,
}: {
  projects: Project[];
  labels: ServicePageExtraLabels;
}) {
  if (projects.length === 0) return null;
  return (
    <section className="svc-sec" aria-labelledby="svc-proof-h">
      <div className="wrap">
        <div className="svc-split">
          <h2 className="svc-h2" id="svc-proof-h">{labels.proofHeading}</h2>
          <ul className="svc-proofs">
            {projects.map((pr) => (
              <li key={pr.name}>
                <h3>{pr.name} <span>{pr.year}</span></h3>
                <p className="svc-proof-host">{pr.host}</p>
                {pr.href !== null ? (
                  <a className="svc-crosslink" href={pr.href}>
                    {labels.proofVisit} : {pr.name}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
