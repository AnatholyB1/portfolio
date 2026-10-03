import Link from 'next/link';
import { ChevronDown, ChevronUp, CircleCheck, Clock, Moon, UserRound } from 'lucide-react';
import { daysSince, type AdminProjectRow, type SortKey } from '@/lib/projects/blocking';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { OFFER_LABELS, type OfferSlug } from '@/lib/projects/offers';
import { STEPS } from '@/lib/projects/steps';
import '../leads/leads.css';
import './projects.css';

export interface ProjectsTableProps {
  rows: AdminProjectRow[];
  tri?: SortKey;
  ordre: 'asc' | 'desc';
  etape?: string;
  blocage?: string;
}

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'client', label: 'Client' },
  { key: 'offre', label: 'Offre' },
  { key: 'etape', label: 'Étape' },
  { key: 'attente', label: 'Qui attend' },
  { key: 'depuis', label: 'Depuis' },
];

function stepLabel(r: AdminProjectRow): string {
  if (r.state.done || !r.state.currentStep) return PROJECT_COPY.blocage.done;
  const step = STEPS.find((s) => s.index === r.state.currentStep);
  return `${r.state.currentStep}/6 ${step?.name ?? ''}`.trim();
}

function Waiting({ r }: { r: AdminProjectRow }) {
  if (r.state.done) {
    return (
      <span className="pt-lead-badge">
        <CircleCheck size={14} aria-hidden="true" />
        {PROJECT_COPY.blocage.done}
      </span>
    );
  }
  if (r.state.waitingOn === 'client') {
    return (
      <span className="pt-lead-badge">
        <UserRound size={14} aria-hidden="true" />
        Client
      </span>
    );
  }
  return (
    <span className="pt-lead-badge">
      <Clock size={14} aria-hidden="true" />
      Sèvalys
      <span className="pt-lead-dot" aria-hidden="true" />
    </span>
  );
}

// Tableau des projets (UI-SPEC S2). Données lues via le client RLS par la page.
export default function ProjectsTable({ rows, tri, ordre, etape, blocage }: ProjectsTableProps) {
  const now = new Date();
  const sortHref =(key: SortKey) => {
    const q = new URLSearchParams();
    if (etape) q.set('etape', etape);
    if (blocage) q.set('blocage', blocage);
    q.set('tri', key);
    q.set('ordre', tri === key && ordre === 'asc' ? 'desc' : 'asc');
    return `/admin/projets?${q.toString()}`;
  };

  return (
    <table className="pt-table pt-admin-table" role="table">
      <caption className="pt-sr-only">Projets</caption>
      <thead role="rowgroup">
        <tr role="row">
          {COLUMNS.map((c) => {
            const active = tri === c.key;
            return (
              <th
                key={c.key}
                scope="col"
                role="columnheader"
                aria-sort={active ? (ordre === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                <Link href={sortHref(c.key)} className="pt-proj-sort">
                  {c.label}
                  {active ? (
                    ordre === 'asc' ? (
                      <ChevronUp size={14} aria-hidden="true" />
                    ) : (
                      <ChevronDown size={14} aria-hidden="true" />
                    )
                  ) : null}
                </Link>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody role="rowgroup">
        {rows.map((r) => (
          <tr key={r.projectId} role="row">
            <td role="cell" data-label="Client">
              <Link href={`/admin/projets/${r.projectId}`}>{r.clientName}</Link>
              <span className="pt-lead-sub">{r.title}</span>
            </td>
            <td role="cell" data-label="Offre">
              {OFFER_LABELS[r.offer as OfferSlug] ?? r.offer}
            </td>
            <td role="cell" data-label="Étape">
              {stepLabel(r)}
            </td>
            <td role="cell" data-label="Qui attend">
              <span className="pt-proj-badges">
                <Waiting r={r} />
                {r.isDormant ? (
                  <span className="pt-lead-badge">
                    <Moon size={14} aria-hidden="true" />
                    {PROJECT_COPY.blocage.dormant(daysSince(r.lastActivityAt, now))}
                  </span>
                ) : null}
              </span>
            </td>
            <td role="cell" data-label="Depuis" className="pt-proj-days">
              {r.daysWaiting} j
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
