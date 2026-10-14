import { DIRECT_NO_LEAD, type SourceRow } from '@/lib/server/pilotage/attribution';
import { formatShareBp, formatSignedEuros } from './format';
import './pilotage.css';
import TableScroll from '@/components/admin/shared/TableScroll';

type Props = { sources: { rows: SourceRow[]; totalCents: number } };

export default function SourceTable({ sources }: Props) {
  return (
    <section aria-labelledby="sources-title">
      <h2 id="sources-title" className="pt-heading">
        CA signé par source du lead
      </h2>
      <p className="pt-helper">Source figée du lead d&apos;origine, corrigée par vous le cas échéant.</p>
      {sources.rows.length === 0 ? (
        <p className="pt-empty">Aucun CA signé sur cette période. Changez de période ou consultez le pipeline.</p>
      ) : (
        <TableScroll label="Chiffre d'affaires signé par source">
<table className="pt-table pt-admin-table pt-pilot-table">
          <caption className="pt-sr-only">CA signé par source du lead</caption>
          <thead>
            <tr>
              <th scope="col">Source figée du lead</th>
              <th scope="col">Campagne</th>
              <th scope="col" className="pt-num">
                Projets
              </th>
              <th scope="col" className="pt-num">
                CA signé
              </th>
              <th scope="col" className="pt-num">
                Part
              </th>
            </tr>
          </thead>
          <tbody>
            {sources.rows.map((r) => (
              <tr key={r.key}>
                <td data-label="Source figée du lead">{r.isNoLead ? DIRECT_NO_LEAD : r.source}</td>
                <td data-label="Campagne">{r.campaign ?? '—'}</td>
                <td data-label="Projets" className="pt-num">
                  {r.projectIds.length}
                </td>
                <td data-label="CA signé" className="pt-num">
                  {formatSignedEuros(r.signedCents)}
                </td>
                <td data-label="Part" className="pt-num">
                  {formatShareBp(r.shareBp)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={3}>
                Total
              </th>
              <td data-label="CA signé" className="pt-num">
                {formatSignedEuros(sources.totalCents)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
</TableScroll>
      )}
    </section>
  );
}
