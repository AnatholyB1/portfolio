'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import './inline.css';

/*
 * Confirmation partagée des actions graves ou irréversibles de l'admin.
 *
 * Règles du motif (UI-SPEC 11, audit v2.0) :
 *  - le bouton de confirmation est un contour --warm (.pt-confirm-btn), jamais le remplissage acide ;
 *  - l'issue sûre est la plus proche du focus et s'appelle « Garder… » ou « Fermer » ;
 *  - « Annuler » est réservé à fermer une fenêtre, jamais à nommer une action métier ;
 *  - le déclencheur et le bouton de confirmation n'ont jamais le même libellé ;
 *  - le message de résultat vit dans une région live montée avant son contenu.
 */

export function ConfirmButtons({
  confirmLabel,
  keepLabel,
  onKeep,
  pending = false,
  pendingLabel = 'Enregistrement…',
  confirmDisabled = false,
}: {
  confirmLabel: string;
  keepLabel: string;
  onKeep: () => void;
  pending?: boolean;
  pendingLabel?: string;
  confirmDisabled?: boolean;
}) {
  return (
    <div className="pt-inline-actions">
      <button
        type="button"
        className="pt-btn-text pt-confirm-keep"
        data-confirm-keep=""
        onClick={onKeep}
        disabled={pending}
      >
        {keepLabel}
      </button>
      <button type="submit" className="pt-btn-ghost pt-confirm-btn" disabled={confirmDisabled || pending}>
        {pending ? pendingLabel : confirmLabel}
      </button>
    </div>
  );
}

export interface ConfirmPanelProps {
  /** Server action (ou action de useActionState) appelée à la confirmation. */
  action: (formData: FormData) => void;
  confirmLabel: string;
  keepLabel: string;
  onKeep: () => void;
  pending?: boolean;
  pendingLabel?: string;
  confirmDisabled?: boolean;
  /** Phrase de conséquence, en clair : ce qui change, ce qui est conservé. */
  description?: ReactNode;
  /** Champs (motif, saisie de contrôle) et champs cachés. */
  children?: ReactNode;
  id?: string;
}

/** Panneau en flux (.pt-inline-panel) : description, champs, boutons. Fermeture par Échap. */
export function ConfirmPanel({
  action,
  confirmLabel,
  keepLabel,
  onKeep,
  pending,
  pendingLabel,
  confirmDisabled,
  description,
  children,
  id,
}: ConfirmPanelProps) {
  function onKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if (e.key === 'Escape' && !pending) {
      e.stopPropagation();
      onKeep();
    }
  }
  return (
    <form id={id} action={action} className="pt-inline-panel" onKeyDown={onKeyDown}>
      {description ? <div className="pt-helper">{description}</div> : null}
      {children}
      <ConfirmButtons
        confirmLabel={confirmLabel}
        keepLabel={keepLabel}
        onKeep={onKeep}
        pending={pending}
        pendingLabel={pendingLabel}
        confirmDisabled={confirmDisabled}
      />
    </form>
  );
}

export interface ConfirmActionProps extends Omit<ConfirmPanelProps, 'onKeep' | 'id'> {
  /** Libellé du déclencheur, différent de `confirmLabel`. */
  triggerLabel: string;
  triggerVariant?: 'text' | 'ghost';
  /** Désactive le déclencheur (formulaire incomplet). */
  triggerDisabled?: boolean;
  /** Message de résultat (erreur ou succès), affiché dans une région live toujours montée. */
  message?: ReactNode;
  /** Identité du dernier résultat de l'action et réussite : ferme le panneau quand elle réussit. */
  result?: unknown;
  succeeded?: boolean;
  /** Pour le rendu statique et les tests. */
  defaultOpen?: boolean;
}

export default function ConfirmAction({
  triggerLabel,
  triggerVariant = 'text',
  triggerDisabled = false,
  message,
  result,
  succeeded = false,
  defaultOpen = false,
  ...panel
}: ConfirmActionProps) {
  const uid = useId();
  const panelId = `${uid}-panel`;
  const [open, setOpen] = useState(defaultOpen);
  const [lastResult, setLastResult] = useState(result);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const userOpened = useRef(false);

  // Ferme le panneau quand l'action réussit (dérivation pendant le rendu, sans effet).
  if (result !== lastResult) {
    setLastResult(result);
    if (succeeded) setOpen(false);
  }

  useEffect(() => {
    if (!open || !userOpened.current) return;
    userOpened.current = false;
    const target = wrapRef.current?.querySelector<HTMLElement>(
      'textarea, select, input:not([type="hidden"]), [data-confirm-keep]',
    );
    target?.focus();
  }, [open]);

  function keep() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function toggle() {
    if (open) {
      keep();
      return;
    }
    userOpened.current = true;
    setOpen(true);
  }

  return (
    <div className="pt-confirm" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className={triggerVariant === 'ghost' ? 'pt-btn-ghost' : 'pt-btn-text'}
        disabled={triggerDisabled && !open}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        {triggerLabel}
      </button>
      {open ? <ConfirmPanel {...panel} id={panelId} onKeep={keep} /> : null}
      <div className="pt-confirm-live" aria-live="polite">
        {message}
      </div>
    </div>
  );
}
