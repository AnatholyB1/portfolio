'use client';

import { useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';

type ActionLike = { status?: string; ok?: boolean; message?: string | null };

/** Succès d'une action serveur, quelle que soit la forme de l'état ({status} ou {ok}). Pur, testable. */
export function successMessage(state: ActionLike): string | null {
  const ok = state.status === 'success' || state.ok === true;
  return ok && state.message ? state.message : null;
}

/**
 * Annonce le succès d'une action par un toast (région polie, 3 s). À utiliser quand le panneau ou le menu
 * qui portait l'action disparaît avec elle : le message vit alors dans le fournisseur de toasts, monté
 * une fois pour toute l'administration (layout), et survit au démontage du composant.
 */
export function useSuccessToast(state: ActionLike): void {
  const { notify } = useToast();
  const seen = useRef<ActionLike | null>(null);
  useEffect(() => {
    if (seen.current === state) return;
    seen.current = state;
    const message = successMessage(state);
    if (message) notify(message);
  }, [state, notify]);
}
