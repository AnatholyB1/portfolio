'use client';

import { useActionState, useEffect, useId, useRef } from 'react';
import { hideReviewAction, type ModerationState } from '@/app/admin/avis/avis.actions';
import '@/components/admin/admin.css';
import '@/components/admin/leads/leads.css';

const INITIAL: ModerationState = { ok: false, message: null };

type Props = {
  reviewId: string;
  reasons: ReadonlyArray<{ value: string; label: string }>;
};

// Masquage d'un avis (D-06) : motif légal fermé, détail obligatoire, confirmation explicite.
// Le contrôle d'accès reste dans hideReviewAction.
export default function HideReviewDialog({ reviewId, reasons }: Props) {
  const uid = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [state, formAction, pending] = useActionState(
    async (prev: ModerationState, fd: FormData) => hideReviewAction(prev, fd),
    INITIAL,
  );

  useEffect(() => {
    if (state.ok) {
      dialogRef.current?.close();
      triggerRef.current?.focus();
    }
  }, [state]);

  function open() {
    const d = dialogRef.current;
    if (d && !d.open) d.showModal();
  }

  function close() {
    if (pending) return;
    dialogRef.current?.close();
    triggerRef.current?.focus();
  }

  const titleId = `${uid}-title`;
  const helpId = `${uid}-help`;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="pt-btn-ghost"
        style={{ minHeight: 44 }}
        onClick={open}
      >
        Masquer cet avis
      </button>
      <div role="status" aria-live="polite">
        {state.ok && state.message ? <p className="pt-helper">{state.message}</p> : null}
      </div>

      <dialog
        ref={dialogRef}
        className="pt-dialog"
        aria-labelledby={titleId}
        aria-describedby={helpId}
        onCancel={(e) => {
          if (pending) e.preventDefault();
          else triggerRef.current?.focus();
        }}
      >
        <form action={formAction}>
          <h2 id={titleId} className="pt-heading">
            Masquer cet avis
          </h2>
          <p id={helpId} className="pt-helper">
            Le masquage n&apos;est possible que pour illégalité. La note ou l&apos;opinion ne sont
            pas un motif.
          </p>

          <input type="hidden" name="reviewId" value={reviewId} />

          <div className="pt-field" style={{ marginTop: 16 }}>
            <label className="pt-label" htmlFor={`${uid}-reason`}>
              Motif
            </label>
            <select
              id={`${uid}-reason`}
              name="reason"
              className="pt-input"
              required
              defaultValue=""
              style={{ minHeight: 44 }}
            >
              <option value="" disabled>
                Choisir un motif
              </option>
              {reasons.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-field" style={{ marginTop: 16 }}>
            <label className="pt-label" htmlFor={`${uid}-detail`}>
              Détail (obligatoire, 3 à 500 caractères)
            </label>
            <textarea
              id={`${uid}-detail`}
              name="detail"
              className="pt-input"
              required
              minLength={3}
              maxLength={500}
              rows={4}
            />
          </div>

          <p className="pt-helper" style={{ marginTop: 16 }}>
            Masquer cet avis : l&apos;avis ne sera plus visible publiquement ni balisé. Il reste
            conservé, l&apos;action est journalisée avec votre nom, la date et le motif, et son
            auteur sera prévenu par e-mail.
          </p>

          {!state.ok && state.message ? (
            <p className="pt-error" role="alert">
              {state.message}
            </p>
          ) : null}

          <div className="pt-lead-panel-actions" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="pt-btn-ghost"
              style={{ minHeight: 44 }}
              onClick={close}
              disabled={pending}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="pt-btn-ghost"
              style={{
                minHeight: 44,
                color: 'var(--warm)',
                borderColor: 'var(--warm)',
              }}
              disabled={pending}
            >
              Masquer cet avis
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
