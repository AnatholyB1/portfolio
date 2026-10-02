import {
  ERASE_REASONS,
  EVENT_LABELS,
  LOST_REASONS,
  STATUS_LABELS,
  type LeadStatus,
} from '@/lib/admin/leadLabels';
import { EM_DASH, formatDateFr } from '@/lib/admin/format';

export interface EventRow {
  id: number;
  type: string;
  actor: string;
  from_status: string | null;
  to_status: string | null;
  reason_code: string | null;
  detail: unknown;
  created_at: string;
}

export interface NoteRow {
  event_id: number | null;
  body: string;
}

function statusLabel(s: string | null): string {
  return s && s in STATUS_LABELS ? STATUS_LABELS[s as LeadStatus] : EM_DASH;
}

function reasonLabel(code: string | null): string | null {
  if (!code) return null;
  const all = [...LOST_REASONS, ...ERASE_REASONS];
  return all.find((r) => r.code === code)?.label ?? code;
}

function actorLabel(actor: string): string {
  if (actor === 'visitor') return 'Visiteur';
  if (actor === 'system') return 'Système';
  return 'Admin';
}

type Src = { source?: unknown; medium?: unknown; campaign?: unknown } | null;

function srcText(s: unknown): string {
  const o = (s && typeof s === 'object' ? s : null) as Src;
  if (!o) return EM_DASH;
  const parts = [o.source, o.medium, o.campaign].filter((p): p is string => typeof p === 'string' && p !== '');
  return parts.length ? parts.join(' / ') : EM_DASH;
}

// Journal en lecture seule (LEAD-03) : aucune commande de modification ou de suppression.
export default function LeadJournal({ events, notes }: { events: EventRow[]; notes: NoteRow[] }) {
  return (
    <section className="pt-card" aria-labelledby="lead-journal-title">
      <h2 id="lead-journal-title" className="pt-heading">
        Journal
      </h2>
      <p className="pt-warn">Le journal est en lecture seule.</p>
      <ol className="pt-lead-list">
        {events.map((e) => {
          const reason = reasonLabel(e.reason_code);
          const detail = (e.detail && typeof e.detail === 'object' ? e.detail : {}) as Record<string, unknown>;
          const note = notes.find((n) => n.event_id === e.id);
          const label = EVENT_LABELS[e.type] ?? e.type;
          return (
            <li key={e.id} className="pt-lead-item">
              <p className="pt-lead-sub">
                {formatDateFr(e.created_at)} · {actorLabel(e.actor)}
              </p>
              <p>
                {e.type === 'status_changed'
                  ? `${label} : ${statusLabel(e.from_status)} vers ${statusLabel(e.to_status)}`
                  : label}
              </p>
              {e.type === 'source_corrected' ? (
                <p className="pt-lead-sub">
                  {srcText(detail.from)} {'->'} {srcText(detail.to)}
                </p>
              ) : null}
              {reason ? <p className="pt-lead-sub">Motif : {reason}</p> : null}
              {note ? <p className="pt-lead-message">{note.body}</p> : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
