/**
 * État vide (V11) — back-office uniquement (admin, portail), jamais sur les pages publiques.
 *
 * Usage :
 *   <EmptyState
 *     icon={<FileText size={32} />}          // optionnel, décoratif (aria-hidden)
 *     title="Aucun document pour l'instant"
 *     description="Vos documents apparaîtront ici dès qu'ils seront prêts."
 *     action={<button type="button" className="pt-btn-ghost">Actualiser</button>}   // une action max
 *     headingLevel={3}                        // 2 | 3 | 4, défaut 3 : à régler selon le plan de page
 *   />
 *
 * `compact` réduit les marges pour un usage dans une cellule de tableau ou une carte.
 * Composant serveur : aucun état, aucun effet.
 */

import type { ReactNode } from 'react';

export type EmptyStateHeadingLevel = 2 | 3 | 4;

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  headingLevel?: EmptyStateHeadingLevel;
  compact?: boolean;
  className?: string;
}

export default function EmptyState({ title, description, icon, action, headingLevel = 3, compact = false, className }: EmptyStateProps) {
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const cls = ['pt-emptystate',compact ? 'pt-emptystate-compact' : '', className ?? ''].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      {icon ? (
        <span className="pt-emptystate-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <Heading className="pt-emptystate-title">{title}</Heading>
      {description ? <p className="pt-emptystate-desc">{description}</p> : null}
      {action ? <div className="pt-emptystate-action">{action}</div> : null}
    </div>
  );
}
