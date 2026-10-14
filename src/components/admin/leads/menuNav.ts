// Navigation clavier d'un menu d'actions (pastille de statut) : fonction pure, testable sans DOM.
// Retourne l'index à focaliser, 'close' pour fermer le menu, ou null si la touche n'est pas gérée.
export type MenuNavResult = number | 'close' | null;

export function menuNavTarget(key: string, index: number, count: number): MenuNavResult {
  if (count <= 0) return key === 'Escape' || key === 'Tab' ? 'close' : null;
  switch (key) {
    case 'ArrowDown':
      return (index + 1) % count;
    case 'ArrowUp':
      return (index - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    case 'Escape':
    case 'Tab':
      return 'close';
    default:
      return null;
  }
}

/** Le clic (ou toucher) tombe-t-il hors du conteneur du menu ? Sert à fermer le menu au clic extérieur. */
export function isOutside(container: { contains(node: unknown): boolean } | null, target: unknown): boolean {
  return container !== null && !container.contains(target);
}
