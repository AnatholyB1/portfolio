import Link from 'next/link';
import { buildQueueTiles, type QueueCounts } from '@/lib/admin/workQueue';
import './admin.css';

// « À traiter » : ce qui attend l'admin, chaque ligne mène à la liste concernée.
// `counts` vient de loadWorkQueue (une lecture par tuile, `null` si elle a échoué).
export default function WorkQueue({ counts }: { counts: QueueCounts }) {
  const { tiles, empty } = buildQueueTiles(counts);
  return (
    <section className="pt-card" aria-labelledby="queue-title">
      <h2 id="queue-title" className="pt-heading pt-admin-title-tight">
        À traiter
      </h2>
      {empty ? (
        <div className="pt-empty">
          <p className="pt-heading">Rien à traiter</p>
          <p className="pt-helper">
            Aucun lead à qualifier, aucune signature ni facture en retard. Les nouveautés apparaîtront ici.
          </p>
        </div>
      ) : (
        <ul className="pt-queue">
          {tiles.map((t) => (
            <li key={t.key}>
              <Link
                href={t.href}
                className={t.count === null ? 'pt-queue-link pt-queue-unavailable' : 'pt-queue-link'}
              >
                {t.count === null ? null : <span className="pt-queue-count">{t.count}</span>}
                <span className="pt-queue-label">{t.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
