import type { ReactNode } from 'react';

type Props = { label: string; children: ReactNode; className?: string };

/**
 * Conteneur à défilement horizontal pour les tableaux admin : région nommée et focusable au
 * clavier (un conteneur qui défile doit pouvoir être atteint sans souris). Sous 768 px les
 * tableaux passent en cartes et le conteneur ne défile plus.
 */
export default function TableScroll({ label, children, className }: Props) {
  return (
    <div
      className={className ? `pt-table-scroll ${className}` : 'pt-table-scroll'}
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      {children}
    </div>
  );
}
