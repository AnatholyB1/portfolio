'use client';

import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { computeFloatingPosition, type FloatingPosition } from './floatingPosition';
import './floating.css';

/*
 * Couche flottante ancrée à un déclencheur (menu de statut, panneau « Perdu »).
 *
 * Les tableaux admin sont enveloppés par TableScroll (overflow auto) : un menu en
 * position:absolute y serait rogné. La couche est donc rendue dans la racine .pt-admin
 * (portail : jetons et styles scopés conservés) en position:fixed, calée sur le déclencheur,
 * retournée vers le haut quand la place manque en bas, et recalée au défilement et au
 * redimensionnement. Les événements React (clavier, focus) remontent toujours par l'arbre
 * React : les gestionnaires du composant parent continuent de s'appliquer.
 */

export const FLOATING_HOST_SELECTOR = '.pt-admin';

function findHost(anchor: HTMLElement | null): Element | null {
  if (typeof document === 'undefined') return null;
  return anchor?.closest(FLOATING_HOST_SELECTOR) ?? document.body;
}

export default function FloatingLayer({
  anchorRef,
  children,
  className,
  width = 200,
  layerRef,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
  /** Largeur souhaitée en px (réduite pour tenir dans l'écran). */
  width?: number;
  layerRef?: RefObject<HTMLDivElement | null>;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const ref = layerRef ?? innerRef;
  // La couche n'est montée qu'à l'ouverture, côté client : le déclencheur existe déjà.
  // eslint-disable-next-line react-hooks/refs
  const [host] = useState<Element | null>(() => findHost(anchorRef.current));

  useLayoutEffect(() => {
    const layer = ref.current;
    const anchor = anchorRef.current;
    if (!layer || !anchor) return;
    const place = () => {
      const a = anchor.getBoundingClientRect();
      const pos: FloatingPosition = computeFloatingPosition({
        anchor: { top: a.top, bottom: a.bottom, left: a.left, right: a.right },
        viewport: { width: document.documentElement.clientWidth, height: window.innerHeight },
        layerHeight: layer.scrollHeight,
        width,
      });
      layer.style.left = `${pos.left}px`;
      layer.style.top = pos.top === null ? 'auto' : `${pos.top}px`;
      layer.style.bottom = pos.bottom === null ? 'auto' : `${pos.bottom}px`;
      layer.style.width = `${pos.width}px`;
      layer.style.maxHeight = `${pos.maxHeight}px`;
      layer.dataset.side = pos.side;
    };
    place();
    window.addEventListener('resize', place);
    // Capture : le défilement de n'importe quel ancêtre (TableScroll, page) déplace le déclencheur.
    window.addEventListener('scroll', place, true);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
    ro?.observe(layer);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      ro?.disconnect();
    };
  }, [anchorRef, ref, width]);

  const layer = (
    <div ref={ref} className={className ? `pt-float-layer ${className}` : 'pt-float-layer'}>
      {children}
    </div>
  );
  return host ? createPortal(layer, host) : layer;
}
