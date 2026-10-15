// Calcul pur du placement d'une couche flottante ancrée (testable sans DOM).
export interface Box {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface FloatingPosition {
  /** Distance au haut du viewport (côté « below »), sinon null. */
  top: number | null;
  /** Distance au bas du viewport (côté « above »), sinon null. */
  bottom: number | null;
  left: number;
  width: number;
  maxHeight: number;
  side: 'below' | 'above' | 'fit';
}

export const FLOAT_GAP = 4;
export const FLOAT_MARGIN = 8;

export function computeFloatingPosition({
  anchor,
  viewport,
  layerHeight,
  width,
}: {
  anchor: Box;
  viewport: { width: number; height: number };
  /** Hauteur naturelle (non contrainte) de la couche. */
  layerHeight: number;
  width: number;
}): FloatingPosition {
  const w = Math.max(0, Math.min(width, viewport.width - 2 * FLOAT_MARGIN));
  const left = Math.max(FLOAT_MARGIN, Math.min(anchor.left, viewport.width - FLOAT_MARGIN - w));
  const roomBelow = viewport.height - anchor.bottom - FLOAT_GAP - FLOAT_MARGIN;
  const roomAbove = anchor.top - FLOAT_GAP - FLOAT_MARGIN;
  // On ouvre vers le bas tant que la couche tient, sinon vers le haut si elle y tient.
  if (layerHeight > roomBelow && layerHeight > roomAbove) {
    // Ni en dessous ni au-dessus : couche haute (panneau « Perdu »). On la cale dans le viewport,
    // en recouvrant le déclencheur si besoin, plutôt que de cacher ses boutons sous le pli.
    const maxHeight = Math.max(0, viewport.height - 2 * FLOAT_MARGIN);
    const h = Math.min(layerHeight, maxHeight);
    const top = Math.max(FLOAT_MARGIN, Math.min(anchor.bottom + FLOAT_GAP, viewport.height - FLOAT_MARGIN - h));
    return { top, bottom: null, left, width: w, maxHeight, side: 'fit' };
  }
  const side: 'below' | 'above' = layerHeight <= roomBelow ? 'below' : 'above';
  const room = Math.max(0, side === 'below' ? roomBelow : roomAbove);
  return {
    top: side === 'below' ? anchor.bottom + FLOAT_GAP : null,
    bottom: side === 'above' ? viewport.height - anchor.top + FLOAT_GAP : null,
    left,
    width: w,
    maxHeight: room,
    side,
  };
}
