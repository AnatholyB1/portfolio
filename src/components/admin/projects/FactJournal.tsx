'use client';

import { useEffect, useRef, useState } from 'react';
import { formatDateFr } from '@/lib/admin/format';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { actorKindLabel } from '@/lib/documents/numberFormat';
import { FACT_LABELS, type Fact } from '@/lib/projects/steps';
import RevokePanel from './RevokePanel';
import '../leads/leads.css';

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
  // Focus et annonce : le déclencheur est démonté à l'ouverture du panneau, le panneau l'est à la fermeture.
  const [announcement, setAnnouncement] = useState('');
  const refocus = useRef<{ id: number; target: 'trigger' | 'row' } | null>(null);
  const triggers = useRef(new Map<number, HTMLButtonElement>());
  const rowRefs = useRef(new Map<number, HTMLLIElement>());
  useEffect(() => {
    const next = refocus.current;
    if (!next || openId !== null) return;
    refocus.current = null;
    const el = next.target === 'trigger' ? triggers.current.get(next.id) : rowRefs.current.get(next.id);
    (el ?? rowRefs.current.get(next.id))?.focus();
  }, [openId]);
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
    <>
      <div className="pt-sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
      <ol className="pt-lead-list" aria-label="Journal des faits">
        {rows.map((f) => {
          const isRevoke = f.type === 'fact_revoked';
          const isRevoked = revoked.has(f.id);
          const target = isRevoke && f.targetFactId !== null ? byId.get(f.targetFactId) : undefined;
          const note = notes[f.id];
          const label = FACT_LABELS[f.type] ?? f.type;
          return (
            <li
              key={f.id}
              className="pt-lead-item"
              tabIndex={-1}
              ref={(el) => {
                if (el) rowRefs.current.set(f.id, el);
                else rowRefs.current.delete(f.id);
              }}
            >
              <p className="pt-lead-sub">
                {formatDateFr(f.createdAt)} · {actorKindLabel(f.actorKind)}
              </p>
              <p>
                {isRevoke ? `Invalide : ${target ? FACT_LABELS[target.type] : label}` : label}{' '}
                {isRevoked ? <span className="pt-lead-badge">{PROJECT_COPY.facts.revoked}</span> : null}
              </p>
              {note ? <p className="pt-lead-sub">Motif : {note}</p> : null}
              {!isRevoke && !isRevoked ? (
                openId === f.id ? (
                  <RevokePanel
                    projectId={projectId}
                    factId={f.id}
                    factLabel={label}
                    onClose={(done) => {
                      refocus.current = { id: f.id, target: done ? 'row' : 'trigger' };
                      if (done) setAnnouncement(`Le fait « ${label} » est invalidé.`);
                      setOpenId(null);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="pt-btn-text"
                    ref={(el) => {
                      if (el) triggers.current.set(f.id, el);
                      else triggers.current.delete(f.id);
                    }}
                    aria-label={`Invalider ce fait : ${label}`}
                    onClick={() => setOpenId(f.id)}
                  >
                    Invalider ce fait
                  </button>
                )
              ) : null}
            </li>
          );
        })}
      </ol>
    </>
  );
}
