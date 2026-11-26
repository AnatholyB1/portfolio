import Link from 'next/link';
import type { ServicePageLink } from '@/lib/translations';

/**
 * « Guides liés » : liens contextuels à ancres descriptives (maillage interne).
 * Ne rend rien si aucun lien n'est fourni, donc sans effet sur les services
 * qui n'utilisent pas `internalLinks`.
 */
export default function RelatedGuides({
  heading,
  links,
}: {
  heading: string;
  links: ServicePageLink[] | undefined;
}) {
  if (!links || links.length === 0) return null;
  return (
    <section className="svc-sec" aria-labelledby="svc-guides-h">
      <div className="wrap">
        <div className="svc-split">
          <h2 className="svc-h2" id="svc-guides-h">{heading}</h2>
          <ul className="svc-guides">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="svc-guide-link">{l.label}</Link>
                {l.description ? <p>{l.description}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
