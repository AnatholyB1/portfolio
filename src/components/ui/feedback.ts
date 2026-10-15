// Logique pure du retour d'action (Toast / StatusNote) — testable sans DOM.

export type FeedbackTone = 'success' | 'error' | 'info';
export type LiveMode = 'polite' | 'assertive';

export interface ToastItem {
  id: number;
  tone: FeedbackTone;
  message: string;
  /** Durée avant fermeture automatique (ms) ; `null` = reste jusqu'à fermeture manuelle. */
  autoDismissMs: number | null;
}

export interface ToastOptions {
  tone?: FeedbackTone;
  /** Nombre de ms, ou `null`/`0` pour désactiver la fermeture automatique. */
  autoDismissMs?: number | null;
}

/** Succès et info disparaissent seuls ; une erreur reste jusqu'à fermeture (WCAG 2.2.1). */
export const DEFAULT_AUTO_DISMISS_MS: Record<FeedbackTone, number | null> = {
  success: 3000,
  info: 4000,
  error: null,
};

export const MAX_TOASTS = 3;

export function resolveAutoDismiss(tone: FeedbackTone, override?: number | null): number | null {
  if (override === undefined) return DEFAULT_AUTO_DISMISS_MS[tone];
  if (override === null || override <= 0) return null;
  return override;
}

export type ToastAction =
  | { type: 'push'; item: ToastItem }
  | { type: 'dismiss'; id: number }
  | { type: 'clear' };

export function toastReducer(state: readonly ToastItem[], action: ToastAction): ToastItem[] {
  switch (action.type) {
    case 'push': {
      // Un message identique déjà affiché est remplacé (pas d'empilement de doublons).
      const rest = state.filter((t) => !(t.tone === action.item.tone && t.message === action.item.message));
      return [...rest, action.item].slice(-MAX_TOASTS);
    }
    case 'dismiss':
      return state.filter((t) => t.id !== action.id);
    case 'clear':
      return [];
  }
}

/** Région live : montée vide avant le texte. `role="alert"` seulement pour l'assertif. */
export function liveRegionProps(live: LiveMode): { role: 'status' | 'alert'; 'aria-live': LiveMode; 'aria-atomic': true } {
  return { role: live === 'assertive' ? 'alert' : 'status', 'aria-live': live, 'aria-atomic': true };
}

/** Les erreurs sont annoncées en assertif, le reste en poli. */
export function liveModeForTone(tone: FeedbackTone): LiveMode {
  return tone === 'error' ? 'assertive' : 'polite';
}
