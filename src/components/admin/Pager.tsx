import Link from 'next/link';
import './admin.css';

export const ADMIN_PAGE_SIZE = 25;

/** Numéro de page demandé (`?page=`), 1 par défaut, jamais inférieur à 1. */
export function parsePage(raw: string | string[] | undefined): number {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(v ?? '1', 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/**
 * Une page au-delà de la dernière fait répondre PostgREST « Requested range not satisfiable »
 * (PGRST103, HTTP 416). Ce n'est pas une panne : la page doit afficher un état vide avec un
 * lien vers la première page, et non « indisponible ».
 */
export function isPageOutOfRange(
  error: { code?: string | null; message?: string | null } | null | undefined,
  page: number,
): boolean {
  if (!error || page <= 1) return false;
  return error.code === 'PGRST103' || /range not satisfiable/i.test(error.message ?? '');
}

export interface PagerProps {
  /** Page courante (1 = première). */
  page: number;
  /** Une page suivante existe. */
  hasNext: boolean;
  /** Construit l'adresse d'une page donnée (conserve les filtres de l'appelant). */
  hrefFor: (page: number) => string;
  /** Nom de la liste pour l'étiquette de navigation (« Pagination des avis »). */
  label?: string;
}

// Pagination unique des listes d'administration : « Précédent » / « Suivant »
// (pt-btn-ghost, cibles 44px), numéro de page annoncé. Composant serveur.
export default function Pager({ page, hasNext, hrefFor, label }: PagerProps) {
  if (page <= 1 && !hasNext) return null;
  return (
    <nav className="pt-pager" aria-label={label ? `Pagination : ${label}` : 'Pagination'}>
      {page > 1 ? (
        <Link className="pt-btn-ghost" href={hrefFor(page - 1)} rel="prev">
          Précédent
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
      <span className="pt-pager-info">Page {page}</span>
      {hasNext ? (
        <Link className="pt-btn-ghost" href={hrefFor(page + 1)} rel="next">
          Suivant
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
    </nav>
  );
}
