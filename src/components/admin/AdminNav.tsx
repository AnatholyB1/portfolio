import Link from 'next/link';
import './leads/leads.css';

export type AdminNavItem = 'clients' | 'leads' | 'entonnoir';

const ITEMS: { key: AdminNavItem; href: string; label: string }[] = [
  { key: 'clients', href: '/admin', label: 'Clients' },
  { key: 'leads', href: '/admin/leads', label: 'Leads' },
  { key: 'entonnoir', href: '/admin/entonnoir', label: 'Entonnoir' },
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
