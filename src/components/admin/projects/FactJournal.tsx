'use client';

import { useState } from 'react';
import { formatDateFr } from '@/lib/admin/format';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { FACT_LABELS, type ActorKind, type Fact } from '@/lib/projects/steps';
import RevokePanel from './RevokePanel';
import '../leads/leads.css';

const ACTOR_LABEL: Record<ActorKind, string> = {
  system: 'Système',
  admin: 'Admin',
  client: 'Client',
};

// Journal append-only (D-09) : rien n'est retiré, les faits annulés restent listés.
export default function FactJournal({
  projectId,
  facts,
  notes,
}: {
  projectId: string;
  facts: Fact[];
  notes: Record<number, string>;
}) {
  const [openId, setOpenId] = useState<number | null>(null);
  const byId = new Map(facts.map((f) => [f.id, f]));
  const revoked = new Set<number>();
  for (const f of facts) {
    if (f.type === 'fact_revoked' && f.targetFactId !== null) revoked.add(f.targetFactId);
  }
  const rows = [...facts].sort((a, b) => b.id - a.id);

  if (rows.length === 0) {
    return <p className="pt-field-help">{PROJECT_COPY.facts.emptyJournal}</p>;
  }

  return (
    <ol className="pt-lead-list" aria-label="Journal des faits">
      {rows.map((f) => {
        const isRevoke = f.type === 'fact_revoked';
        const isRevoked = revoked.has(f.id);
        const target = isRevoke && f.targetFactId !== null ? byId.get(f.targetFactId) : undefined;
        const note = notes[f.id];
        const label = FACT_LABELS[f.type] ?? f.type;
        return (
          <li key={f.id} className="pt-lead-item">
            <p className="pt-lead-sub">
              {formatDateFr(f.createdAt)} · {ACTOR_LABEL[f.actorKind]}
            </p>
            <p>
              {isRevoke ? `Annule : ${target ? FACT_LABELS[target.type] : label}` : label}{' '}
              {isRevoked ? <span className="pt-lead-badge">{PROJECT_COPY.facts.revoked}</span> : null}
            </p>
            {note ? <p className="pt-lead-sub">Motif : {note}</p> : null}
            {!isRevoke && !isRevoked ? (
              openId === f.id ? (
                <RevokePanel
                  projectId={projectId}
                  factId={f.id}
                  factLabel={label}
                  onClose={() => setOpenId(null)}
                />
              ) : (
                <button type="button" className="pt-btn-text" onClick={() => setOpenId(f.id)}>
                  Annuler ce fait
                </button>
              )
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
