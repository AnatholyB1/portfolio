import Link from 'next/link';
import './admin.css';

export type AdminNavItem = 'clients' | 'leads' | 'projets' | 'entonnoir' | 'liens' | 'pilotage' | 'avis' | 'emails';

const ITEMS: { key: AdminNavItem; href: string; label: string }[] = [
  { key: 'clients', href: '/admin', label: 'Clients' },
  { key: 'leads', href: '/admin/leads', label: 'Leads' },
  { key: 'projets', href: '/admin/projets', label: 'Projets' },
  { key: 'entonnoir', href: '/admin/entonnoir', label: 'Entonnoir' },
  { key: 'liens', href: '/admin/liens', label: 'Liens' },
  { key: 'pilotage', href: '/admin/pilotage', label: 'Pilotage' },
  { key: 'avis', href: '/admin/avis', label: 'Avis' },
  { key: 'emails', href: '/admin/emails', label: 'E-mails' },
];

/** Entrée de navigation correspondant à un chemin (frontières loading, error et not-found). */
export function adminNavKeyForPath(pathname: string | null | undefined): AdminNavItem | undefined {
  if (!pathname) return undefined;
  const clean = pathname.split('?')[0].replace(/\/+$/, '');
  if (clean === '/admin' || clean === '') return 'clients';
  return ITEMS.find((i) => i.href !== '/admin' && (clean === i.href || clean.startsWith(`${i.href}/`)))?.key;
}

// Navigation de l'administration (UI-SPEC A1). Composant serveur.
// Les liens passent à la ligne (aucun défilement masqué à 360px, les 8 liens restent
// atteignables). L'ancre `#admin-contenu` en fin de navigation est la cible du lien
// d'évitement posé par le layout.
export default function AdminNav({ current }: { current?: AdminNavItem }) {
  return (
    <nav aria-label="Administration" className="pt-admin-nav">
      <ul>
        {ITEMS.map((i) => (
          <li key={i.key}>
            <Link
              href={i.href}
              aria-current={i.key === current ? 'page' : undefined}
              className={i.key === current ? 'pt-admin-nav-active' : undefined}
            >
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
      <span id="admin-contenu" tabIndex={-1} className="pt-admin-anchor" />
    </nav>
  );
}
