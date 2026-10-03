import { ExternalLink } from 'lucide-react';
import { PROJECT_COPY } from '@/lib/projects/copy';
import './project.css';

type LinkView = { id: string; title: string; url: string };

function httpsHost(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' ? u.host : null;
  } catch {
    return null;
  }
}

// Liens utiles en lecture seule pour le client (D-15). https uniquement.
export default function PortalLinks({ links }: { links: LinkView[] }) {
  if (links.length === 0) return null;
  return (
    <section className="pt-card" aria-labelledby="portal-links-title">
      <h2 id="portal-links-title" className="pt-heading">
        {PROJECT_COPY.links.heading}
      </h2>
      <ul className="pt-client-list">
        {links.map((l) => {
          const host = httpsHost(l.url);
          return (
            <li key={l.id}>
              {host ? (
                <a href={l.url} target="_blank" rel="noopener noreferrer">
                  {l.title}
                  <ExternalLink size={14} aria-hidden="true" style={{ marginLeft: 6 }} />
                  <span className="pt-sr-only">{PROJECT_COPY.links.newTab}</span>
                </a>
              ) : (
                <span>{l.title}</span>
              )}
              {host ? <span className="pt-who-since"> {host}</span> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
