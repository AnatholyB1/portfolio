import Link from 'next/link';
import { PROJECT_COPY } from '@/lib/projects/copy';
import './project.css';

// Navigation de l'espace client : Projet et Documents actifs, Paiements à venir.
export default function ClientNav({ current }: { current: 'projet' | 'documents' }) {
  const nav = PROJECT_COPY.documents.nav;
  return (
    <nav aria-label="Espace client" className="pt-client-nav">
      <ul>
        <li>
          <Link
            href="/espace-client"
            aria-current={current === 'projet' ? 'page' : undefined}
            className={current === 'projet' ? 'pt-client-nav-active' : undefined}
          >
            {nav.project}
          </Link>
        </li>
        <li>
          <Link
            href="/espace-client/documents"
            aria-current={current === 'documents' ? 'page' : undefined}
            className={current === 'documents' ? 'pt-client-nav-active' : undefined}
          >
            {nav.documents}
          </Link>
        </li>
        <li>
          <span aria-disabled="true" className="pt-client-nav-off">
            {nav.payments}
          </span>
        </li>
      </ul>
    </nav>
  );
}
