import Link from 'next/link';
import './project.css';

// Navigation de l'espace client : Projet actif, Documents et Paiements à venir.
export default function ClientNav() {
  return (
    <nav aria-label="Espace client" className="pt-client-nav">
      <ul>
        <li>
          <Link href="/espace-client" aria-current="page" className="pt-client-nav-active">
            Projet
          </Link>
        </li>
        <li>
          <span aria-disabled="true" className="pt-client-nav-off">
            Documents (bientôt)
          </span>
        </li>
        <li>
          <span aria-disabled="true" className="pt-client-nav-off">
            Paiements (bientôt)
          </span>
        </li>
      </ul>
    </nav>
  );
}
