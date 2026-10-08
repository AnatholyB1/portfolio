import Link from 'next/link';
import './leads/leads.css';

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

// Navigation de l'administration (UI-SPEC A1). Composant serveur.
export default function AdminNav({ current }: { current: AdminNavItem }) {
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
    </nav>
  );
}
