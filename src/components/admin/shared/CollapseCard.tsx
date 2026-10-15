import type { ReactNode } from 'react';

type Props = {
  /** Identifiant du titre (aria-labelledby de la section). */
  titleId: string;
  title: string;
  /** Résumé visible repliée : l'essentiel se lit sans ouvrir. */
  preview?: ReactNode;
  /** Ouverte par défaut (sections de travail) ; fermée pour le secondaire. */
  defaultOpen?: boolean;
  children: ReactNode;
};

/**
 * Carte repliable pour les fiches (lead, projet) : natif <details>, aucun JavaScript, état conservé par
 * le navigateur, focus et clavier gérés nativement. Le titre reste un h2 dans le résumé.
 */
export default function CollapseCard({ titleId, title, preview, defaultOpen = false, children }: Props) {
  return (
    <details className="pt-card pt-collapse" open={defaultOpen}>
      <summary className="pt-collapse-summary">
        <h2 id={titleId} className="pt-heading">
          {title}
        </h2>
        {preview ? <span className="pt-collapse-preview">{preview}</span> : null}
      </summary>
      <div className="pt-collapse-body">{children}</div>
    </details>
  );
}
