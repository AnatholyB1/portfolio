'use client';

/**
 * Retour d'action non intrusif (V12) — back-office uniquement (admin, portail).
 *
 * Usage :
 *   // une fois, dans un layout/shell client :
 *   <ToastProvider>{children}</ToastProvider>
 *   // dans un composant client :
 *   const { notify } = useToast();
 *   notify('Modifications enregistrées');                          // succès, disparaît après 3 s
 *   notify('Envoi impossible', { tone: 'error' });                  // reste jusqu'à fermeture
 *   notify('Brouillon conservé', { autoDismissMs: null });          // pas d'auto-fermeture
 *
 * Inline (à côté d'un bouton/formulaire) : <StatusNote tone="success">Enregistré</StatusNote>.
 *
 * Accessibilité : les régions aria-live (polie `role=status`, assertive `role=alert`) sont montées
 * vides dès le premier rendu du provider, AVANT l'arrivée du texte, sinon les lecteurs d'écran
 * n'annoncent rien. La minuterie se met en pause au survol et au focus. prefers-reduced-motion :
 * l'animation d'entrée est supprimée (primitives.css).
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import {
  liveModeForTone,
  liveRegionProps,
  resolveAutoDismiss,
  toastReducer,
  type FeedbackTone,
  type LiveMode,
  type ToastItem,
  type ToastOptions,
} from './feedback';

interface ToastApi {
  notify: (message: string, options?: ToastOptions) => number;
  dismiss: (id: number) => void;
  clear: () => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être utilisé dans <ToastProvider>.');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(toastReducer, [] as ToastItem[]);
  const nextId = useRef(1);

  const notify = useCallback((message: string, options?: ToastOptions) => {
    const tone = options?.tone ?? 'success';
    const id = nextId.current++;
    dispatch({ type: 'push', item: { id, tone, message, autoDismissMs: resolveAutoDismiss(tone, options?.autoDismissMs) } });
    return id;
  }, []);
  const dismiss = useCallback((id: number) => dispatch({ type: 'dismiss', id }), []);
  const clear = useCallback(() => dispatch({ type: 'clear' }), []);
  const api = useMemo(() => ({ notify, dismiss, clear }), [notify, dismiss, clear]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pt-toasts">
        <ToastRegion live="polite" items={items.filter((t) => liveModeForTone(t.tone) === 'polite')} onDismiss={dismiss} />
        <ToastRegion live="assertive" items={items.filter((t) => liveModeForTone(t.tone) === 'assertive')} onDismiss={dismiss} />
      </div>
    </ToastContext.Provider>
  );
}

function ToastRegion({ live, items, onDismiss }: { live: LiveMode; items: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <div className="pt-toast-region" {...liveRegionProps(live)}>
      {items.map((t) => (
        <ToastView key={t.id} item={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const paused = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { id, autoDismissMs } = item;

  const arm = useCallback(() => {
    if (autoDismissMs == null) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!paused.current) onDismiss(id);
    }, autoDismissMs);
  }, [autoDismissMs, id, onDismiss]);

  useEffect(() => {
    arm();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [arm]);

  const pause = () => {
    paused.current = true;
    if (timer.current) clearTimeout(timer.current);
  };
  const resume = () => {
    paused.current = false;
    arm();
  };

  return (
    <div
      className={`pt-toast pt-toast-${item.tone}`}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
    >
      <span className="pt-toast-msg">{item.message}</span>
      <button type="button" className="pt-toast-close" onClick={() => onDismiss(id)} aria-label="Fermer la notification">
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}

/**
 * Note de statut inline. La région est TOUJOURS rendue (même vide) pour que le texte injecté
 * ensuite soit annoncé. `live="assertive"` pour une erreur bloquante.
 */
export function StatusNote({
  tone = 'info',
  live = 'polite',
  id,
  className,
  children,
}: {
  tone?: FeedbackTone;
  live?: LiveMode;
  id?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div id={id} className={`pt-status-note pt-status-${tone}${className ? ` ${className}` : ''}`} data-empty={children ? undefined : 'true'} {...liveRegionProps(live)}>
      {children}
    </div>
  );
}
