import Link from 'next/link';
import { PROJECT_COPY } from '@/lib/projects/copy';
import './project.css';

// Navigation de l'espace client : Projet, Documents et Paiements, trois liens actifs.
export default function ClientNav({ current }: { current: 'projet' | 'documents' | 'paiements' }) {
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
          <Link
            href="/espace-client/paiements"
            aria-current={current === 'paiements' ? 'page' : undefined}
            className={current === 'paiements' ? 'pt-client-nav-active' : undefined}
          >
            {nav.payments}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
