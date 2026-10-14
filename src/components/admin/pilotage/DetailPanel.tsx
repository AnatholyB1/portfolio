import Link from 'next/link';
import type { DetailRow, DetailView } from '@/lib/server/pilotage/dashboard';
import { pilotageHref, type PilotageParams } from '@/lib/server/pilotage/params';
import Pager from '@/components/admin/shared/Pager';
import { formatDateFr, formatSignedEuros } from './format';
import './pilotage.css';
import TableScroll from '@/components/admin/shared/TableScroll';

type Props = { detail: DetailView; params: PilotageParams };

const COLUMNS: Record<DetailView['kind'], string[]> = {
  facture: ['Numéro', 'Date', 'Client', 'Type', 'Montant'],
  paiement: ['Date', 'Facture', 'Mode', 'Montant'],
  devis: ['Référence', 'Projet', 'Émis le', 'Montant'],
  signe: ['Référence', 'Projet', 'Émis le', 'Montant'],
  cout: ['Date', 'Nature', 'Projet', 'Libellé', 'Montant'],
};

function cells(row: DetailRow): string[] {
  const amount = formatSignedEuros(row.amountCents);
  switch (row.type) {
    case 'facture':
      return [row.number, formatDateFr(row.date), row.clientName, row.kindLabel, amount];
    case 'paiement':
      return [formatDateFr(row.date), row.number, row.methodLabel, amount];
    case 'devis':
      return [row.reference, row.projectTitle, formatDateFr(row.date), amount];
    case 'cout':
      return [
        formatDateFr(row.date),
        'Coût',
        row.projectTitle ?? 'Charge récurrente',
        `${row.label} · ${row.categoryLabel}`,
        amount,
      ];
  }
}

function composedCells(row: DetailRow): string[] {
  if (row.type === 'paiement') {
    return [
      formatDateFr(row.date),
      'Encaissement',
      '—',
      `Facture ${row.number} · ${row.methodLabel}`,
      formatSignedEuros(row.amountCents),
    ];
  }
  return cells(row);
}

export default function DetailPanel({ detail, params }: Props) {
  const columns = COLUMNS[detail.kind];
  const composed = detail.kind === 'cout';
  const amountIndex = columns.length - 1;
  return (
    <section aria-labelledby="detail">
      <h2 id="detail" tabIndex={-1} className="pt-heading">
        {`Détail : ${detail.title}`}
      </h2>
      <p className="pt-helper">
        Total des lignes = <span className="pt-num">{formatSignedEuros(detail.totalCents)}</span>
      </p>
      <p>
        <Link
          className="pt-btn-ghost"
          href={pilotageHref(params, { detail: null, projectId: null, page: 1 })}
        >
          Fermer le détail
        </Link>
      </p>
      {detail.totalRows === 0 ? (
        <p className="pt-empty">Aucun élément ne compose ce chiffre pour cette période.</p>
      ) : (
        <>
          <TableScroll label="Détail du chiffre">
<table className="pt-table pt-admin-table pt-pilot-table">
            <caption className="pt-sr-only">{`Détail : ${detail.title}`}</caption>
            <thead>
              <tr>
                {columns.map((c, i) => (
                  <th key={c} scope="col" className={i === amountIndex ? 'pt-num' : undefined}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {detail.rows.map((row) => {
                const values = composed ? composedCells(row) : cells(row);
                return (
                  <tr key={`${row.type}-${row.id}`}>
                    {values.map((v, i) => (
                      <td
                        key={columns[i]}
                        data-label={columns[i]}
                        className={i === amountIndex ? 'pt-num' : undefined}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
</TableScroll>
          <Pager
            page={detail.page}
            pageCount={detail.pageCount}
            hasNext={detail.page < detail.pageCount}
            hrefFor={(page) => pilotageHref(params, { page })}
            label="Pagination du détail"
          />
        </>
      )}
    </section>
  );
}
