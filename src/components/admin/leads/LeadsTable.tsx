import Link from 'next/link';
import { RotateCcw, TriangleAlert } from 'lucide-react';
import { EM_DASH, formatDateFr } from '@/lib/admin/format';
import StatusPill from './StatusPill';
import './leads.css';

export interface LeadRow {
  id: string;
  status: string;
  source_source: string | null;
  source_medium: string | null;
  source_campaign: string | null;
  created_at: string;
  last_contact_at: string | null;
  unseen_return: boolean | null;
  erased_at: string | null;
  contact_nom: string | null;
  contact_email: string | null;
  source_nonconformity: string[] | null;
}

function orDash(v: string | null | undefined): string {
  return v && v.trim() ? v : EM_DASH;
}

function ReturnBadge() {
  return (
    <span className="pt-lead-badge">
      <RotateCcw size={14} aria-hidden="true" />
      Revenu
    </span>
  );
}

function OffConventionBadge() {
  return (
    <span className="pt-lead-badge">
      <TriangleAlert size={16} aria-hidden="true" />
      Hors convention
    </span>
  );
}

// Tableau des leads (UI-SPEC A1). Données lues via le client RLS par la page.
export default function LeadsTable({ rows }: { rows: LeadRow[] }) {
  return (
    <table className="pt-table pt-admin-table" role="table">
      <caption className="pt-sr-only">Leads</caption>
      <thead role="rowgroup">
        <tr role="row">
          <th scope="col" role="columnheader">Lead</th>
          <th scope="col" role="columnheader">Source</th>
          <th scope="col" role="columnheader">Statut</th>
          <th scope="col" role="columnheader">Arrivé le</th>
          <th scope="col" role="columnheader">Dernier contact</th>
          <th scope="col" role="columnheader">Retour</th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        {rows.map((r) => {
          const erased = Boolean(r.erased_at);
          const name = erased ? 'Effacé' : orDash(r.contact_nom || r.contact_email);
          return (
            <tr key={r.id} role="row">
              <td role="cell" data-label="Lead">
                <Link href={`/admin/leads/${r.id}`}>{name}</Link>
                {!erased && r.contact_nom && r.contact_email ? (
                  <span className="pt-lead-sub">{r.contact_email}</span>
                ) : null}
              </td>
              <td role="cell" data-label="Source">
                {orDash(r.source_source)} / {orDash(r.source_medium)}
                {r.source_campaign ? <span className="pt-lead-sub">{r.source_campaign}</span> : null}
                {r.source_nonconformity && r.source_nonconformity.length > 0 ? (
                  <OffConventionBadge />
                ) : null}
              </td>
              <td role="cell" data-label="Statut">
                <StatusPill leadId={r.id} status={r.status} />
              </td>
              <td role="cell" data-label="Arrivé le">{formatDateFr(r.created_at)}</td>
              <td role="cell" data-label="Dernier contact">{formatDateFr(r.last_contact_at)}</td>
              <td role="cell" data-label="Retour">
                {r.unseen_return ? <ReturnBadge /> : EM_DASH}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
