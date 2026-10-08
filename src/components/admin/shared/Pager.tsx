import Link from 'next/link';
import './inline.css';

/*
 * Pagination commune des listes admin : mêmes mots que la liste des leads (« Précédent » / « Suivant »),
 * liens en .pt-btn-ghost (cibles de 44 px). Composant serveur, sans état.
 */
export default function Pager({
  page,
  hasNext,
  hrefFor,
  pageCount,
  label = 'Pagination',
}: {
  page: number;
  hasNext: boolean;
  hrefFor: (page: number) => string;
  pageCount?: number;
  label?: string;
}) {
  if (page <= 1 && !hasNext) return null;
  return (
    <nav className="pt-pager" aria-label={label}>
      {page > 1 ? (
        <Link className="pt-btn-ghost" href={hrefFor(page - 1)} rel="prev">
          Précédent
        </Link>
      ) : (
        <span />
      )}
      {pageCount ? <span className="pt-dim-14">{`Page ${page} sur ${pageCount}`}</span> : null}
      {hasNext ? (
        <Link className="pt-btn-ghost" href={hrefFor(page + 1)} rel="next">
          Suivant
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
