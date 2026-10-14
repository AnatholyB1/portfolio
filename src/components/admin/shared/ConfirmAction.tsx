'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import './inline.css';

/*
 * Confirmation partagée des actions graves ou irréversibles de l'admin.
 *
 * Règles du motif (UI-SPEC 11, audit v2.0) :
 *  - le bouton de confirmation est un contour --warm (.pt-confirm-btn), jamais le remplissage acide ;
 *  - l'issue sûre est la plus proche du focus et s'appelle « Garder… » ou « Fermer » ;
 *  - « Annuler » est réservé à fermer une fenêtre, jamais à nommer une action métier ;
 *  - le déclencheur et le bouton de confirmation n'ont jamais le même libellé ;
 *  - le message de résultat vit dans une région live montée avant son contenu ;
 *  - la phrase de conséquence est reliée aux champs du panneau (aria-describedby) ;
 *  - pendant l'envoi le bouton reste focalisable (aria-disabled) : le focus n'est jamais perdu ;
 *  - à la réussite, le focus revient au déclencheur (ou à `successFocusId`) et le message est annoncé.
 */

const FIELD_SELECTOR = 'textarea, select, input:not([type="hidden"])';

/** Ajoute `id` à une liste d'ids d'aria-describedby sans doublon. */
export function mergeDescribedBy(existing: string | null | undefined, id: string): string {
  const ids = (existing ?? '').split(/\s+/).filter(Boolean);
  if (!ids.includes(id)) ids.push(id);
  return ids.join(' ');
}

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
        onClick={() => {
          if (!pending) onKeep();
        }}
        aria-disabled={pending || undefined}
      >
        {keepLabel}
      </button>
      <button
        type="submit"
        className="pt-btn-ghost pt-confirm-btn"
        disabled={confirmDisabled}
        aria-disabled={pending || undefined}
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          // Envoi en cours : le bouton garde le focus mais ne renvoie pas le formulaire.
          if (pending) e.preventDefault();
        }}
      >
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
  /** Classe supplémentaire (ex. popover ancré à une pastille). */
  className?: string;
  /** Place le focus sur le premier champ (ou « Garder… ») à l'ouverture du panneau. */
  autoFocus?: boolean;
}

/** Premier champ saisissable du panneau, à défaut le bouton « Garder… ». */
export function firstFocusTarget(root: ParentNode | null): HTMLElement | null {
  return root?.querySelector<HTMLElement>(`${FIELD_SELECTOR}, [data-confirm-keep]`) ?? null;
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
  className,
  autoFocus = false,
}: ConfirmPanelProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const descId = `${useId()}-desc`;

  // La phrase de conséquence est lue avec chaque champ : sans cela, un lecteur d'écran qui reçoit le focus
  // sur le motif n'entend jamais ce que l'action change.
  useEffect(() => {
    if (!description) return;
    formRef.current?.querySelectorAll<HTMLElement>(FIELD_SELECTOR).forEach((field) => {
      field.setAttribute('aria-describedby', mergeDescribedBy(field.getAttribute('aria-describedby'), descId));
    });
  }, [description, descId]);

  useEffect(() => {
    if (autoFocus) firstFocusTarget(formRef.current)?.focus();
  }, [autoFocus]);

  function onKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if (e.key === 'Escape' && !pending) {
      e.stopPropagation();
      onKeep();
    }
  }
  return (
    <form
      ref={formRef}
      id={id}
      action={action}
      className={className ? `pt-inline-panel ${className}` : 'pt-inline-panel'}
      aria-describedby={description ? descId : undefined}
      onKeyDown={onKeyDown}
    >
      {description ? (
        <div id={descId} className="pt-helper">
          {description}
        </div>
      ) : null}
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

export interface ConfirmActionProps extends Omit<ConfirmPanelProps, 'onKeep' | 'id' | 'autoFocus' | 'className'> {
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
  /** Élément qui reçoit le focus après une réussite quand le déclencheur est désactivé. */
  successFocusId?: string;
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
  successFocusId,
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
    firstFocusTarget(wrapRef.current)?.focus();
  }, [open]);

  // Le bouton de confirmation vient de disparaître : le focus revient au déclencheur, jamais sur <body>.
  useEffect(() => {
    if (!succeeded) return;
    const trigger = triggerRef.current;
    const fallback = successFocusId ? document.getElementById(successFocusId) : null;
    (trigger && !trigger.disabled ? trigger : (fallback ?? trigger))?.focus();
    // Seul un nouveau résultat réussi déclenche le retour du focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

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
