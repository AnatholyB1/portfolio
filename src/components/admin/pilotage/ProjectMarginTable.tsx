import Link from 'next/link';
import type { ProjectLine } from '@/lib/server/pilotage/dashboard';
import { pilotageHref, type PilotageParams } from '@/lib/server/pilotage/params';
import { formatSignedEuros } from './format';
import './pilotage.css';

type Props = { projects: ProjectLine[]; globalMarginCents: number; params: PilotageParams };

export default function ProjectMarginTable({ projects, globalMarginCents, params }: Props) {
  return (
    <section id="marge-projets" aria-labelledby="marge-projets-title">
      <h2 id="marge-projets-title" className="pt-heading">
        Marge par projet
      </h2>
      <p className="pt-helper">
        Montants de la période ; le reste à facturer porte sur toute la durée du projet.
      </p>
      <table className="pt-table pt-admin-table">
        <thead>
          <tr>
            <th scope="col">Projet</th>
            <th scope="col">Client</th>
            <th scope="col">Signé</th>
            <th scope="col">Facturé</th>
            <th scope="col">Encaissé</th>
            <th scope="col">Coûts</th>
            <th scope="col">Marge</th>
            <th scope="col">Reste à facturer</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((r) => (
            <tr key={r.projectId}>
              <td data-label="Projet">
                <Link href={`/admin/projets/${r.projectId}`}>{r.title}</Link>
              </td>
              <td data-label="Client">{r.clientName}</td>
              <td data-label="Signé" className="pt-funnel-num">
                <Link href={pilotageHref(params, { detail: 'signe', projectId: r.projectId, page: 1 })}>
                  {formatSignedEuros(r.signedCents)}
                </Link>
              </td>
              <td data-label="Facturé" className="pt-funnel-num">
                <Link href={pilotageHref(params, { detail: 'facture', projectId: r.projectId, page: 1 })}>
                  {formatSignedEuros(r.invoicedCents)}
                </Link>
              </td>
              <td data-label="Encaissé" className="pt-funnel-num">
                <Link href={pilotageHref(params, { detail: 'paiement', projectId: r.projectId, page: 1 })}>
                  {formatSignedEuros(r.collectedCents)}
                </Link>
              </td>
              <td data-label="Coûts" className="pt-funnel-num">
                {formatSignedEuros(r.costsCents)}
              </td>
              <td data-label="Marge" className="pt-funnel-num">
                {formatSignedEuros(r.marginCents)}
              </td>
              <td data-label="Reste à facturer" className="pt-funnel-num">
                {formatSignedEuros(r.remainingCents)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={6}>
              Marge globale (coûts récurrents de la période déduits)
            </th>
            <td data-label="Marge globale" className="pt-funnel-num">
              {formatSignedEuros(globalMarginCents)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </section>
  );
}
