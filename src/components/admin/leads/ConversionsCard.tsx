import { EM_DASH, formatDateFr } from '@/lib/admin/format';
import { formatEuroCents } from '@/lib/admin/funnel';
import type { ConversionLadder, LeadConversion } from '@/lib/server/ads/conversions';

function When({ row }: { row: LeadConversion }) {
  return (
    <>
      {formatDateFr(row.occurredAt)}{' '}
      <span className="pt-lead-trunc pt-lead-mono" title={row.eventId}>
        {row.eventId}
      </span>
    </>
  );
}

// Journal serveur des conversions, en lecture seule. Aucune valeur estimée.
export default function ConversionsCard({ ladder }: { ladder: ConversionLadder | null }) {
  return (
    <section className="pt-card" aria-labelledby="lead-conv-title">
      <h2 id="lead-conv-title" className="pt-heading">
        Conversions
      </h2>
      <p className="pt-helper">
        Journal serveur des conversions. Aucun envoi aux plateformes publicitaires pour l&apos;instant.
      </p>
      {!ladder ? (
        <p className="pt-error">Impossible de charger les conversions.</p>
      ) : (
        <>
          <dl className="pt-summary">
            {ladder.ranks.map(({ rank, label, row }) => (
              <div key={rank} style={{ display: 'contents' }}>
                <dt>{label}</dt>
                <dd>
                  {!row ? (
                    <>
                      {EM_DASH} <span className="pt-lead-dim">Non atteint</span>
                    </>
                  ) : (
                    <>
                      <When row={row} />
                      {rank === 4 ? (
                        row.valueCents !== null ? (
                          <> {formatEuroCents(row.valueCents)}</>
                        ) : (
                          <>
                            {' '}
                            <span className="pt-lead-dim">Valeur manquante</span>
                            <span className="pt-helper" style={{ display: 'block' }}>
                              Aucun devis actif au moment du passage à Signé.
                            </span>
                          </>
                        )
                      ) : null}
                    </>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          {ladder.tracking.length > 0 ? (
            <>
              <h3 className="pt-lead-subhead">Suivi</h3>
              <ul>
                {ladder.tracking.map(({ label, row }) => (
                  <li key={`${row.eventName}-${row.eventId}`}>
                    {label} : <When row={row} />
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
