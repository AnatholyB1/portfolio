import Link from 'next/link';
import { CircleCheck } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { buildQueueTiles, type QueueCounts } from '@/lib/admin/workQueue';
import './admin.css';

// « À traiter » : ce qui attend l'admin, chaque ligne mène à la liste concernée.
// `counts` vient de loadWorkQueue (une lecture par tuile, `null` si elle a échoué).
// Le total n'additionne que les lectures réussies : une tuile en échec n'est jamais comptée comme zéro.
export default function WorkQueue({ counts }: { counts: QueueCounts }) {
  const { tiles, empty } = buildQueueTiles(counts);
  const total = tiles.reduce((sum, t) => sum + (t.count ?? 0), 0);
  return (
    <section className="pt-card pt-queue-card" aria-labelledby="queue-title">
      <div className="pt-queue-head">
        <h2 id="queue-title" className="pt-heading">
          À traiter
        </h2>
        {empty ? null : (
          <p className="pt-queue-total">{total === 1 ? '1 élément en attente' : `${total} éléments en attente`}</p>
        )}
      </div>
      {empty ? (
        <EmptyState
          compact
          icon={<CircleCheck size={32} />}
          title="Rien à traiter"
          description="Aucun lead à qualifier, aucune signature ni facture en retard. Les nouveautés apparaîtront ici."
        />
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
