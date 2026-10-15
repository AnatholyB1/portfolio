/**
 * Squelette de chargement (V3) — back-office uniquement (admin, portail).
 *
 * Usage :
 *   <Skeleton variant="lines" lines={4} />                     // paragraphe
 *   <Skeleton variant="card" />                                // carte 160 px
 *   <Skeleton variant="table" rows={5} columns={4} />          // tableau
 *   <Skeleton label="Chargement des paiements" />              // libellé lu par les lecteurs d'écran
 *
 * Le conteneur est une région `role="status"` + `aria-busy="true"` avec un libellé masqué visuellement ;
 * les formes sont `aria-hidden`. Shimmer 1,4 s linéaire, remplacé par un fond fixe sous
 * prefers-reduced-motion (primitives.css). Hauteurs fixes : pas de décalage de mise en page (CLS 0).
 * Composant serveur : utilisable directement dans loading.tsx.
 */

export type SkeletonVariant = 'lines' | 'card' | 'table';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  /** variant="lines" : nombre de lignes (1–12). */
  lines?: number;
  /** variant="table" : lignes (1–20) et colonnes (1–8). */
  rows?: number;
  columns?: number;
  label?: string;
  className?: string;
}

/** Borne et arrondit un compteur ; valeur invalide -> défaut. */
export function clampCount(value: number | undefined, min: number, max: number, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export default function Skeleton({ variant = 'lines', lines, rows, columns, label = 'Chargement en cours', className }: SkeletonProps) {
  const cls = ['pt-skeleton', `pt-skeleton-${variant}`, className ?? ''].filter(Boolean).join(' ');
  let shapes;
  if (variant === 'card') {
    shapes = <span className="pt-sk pt-sk-block" />;
  } else if (variant === 'table') {
    const r = clampCount(rows, 1, 20, 5);
    const c = clampCount(columns, 1, 8, 4);
    shapes = Array.from({ length: r }, (_, i) => (
      <span className="pt-sk-row" key={i} style={{ gridTemplateColumns: `repeat(${c}, minmax(0, 1fr))` }}>
        {Array.from({ length: c }, (_, j) => (
          <span className="pt-sk" key={j} />
        ))}
      </span>
    ));
  } else {
    const n = clampCount(lines, 1, 12, 3);
    shapes = Array.from({ length: n }, (_, i) => <span className={`pt-sk pt-sk-line${i === n - 1 && n > 1 ? ' pt-sk-short' : ''}`} key={i} />);
  }
  return (
    <div className={cls} role="status" aria-busy="true" aria-live="polite">
      <span className="pt-ui-sr">{label}</span>
      <span className="pt-sk-shapes" aria-hidden="true">
        {shapes}
      </span>
    </div>
  );
}
