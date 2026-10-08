'use client';

import { useActionState, useId, useState } from 'react';
import { reissueReviewLinkAction, type ReissueState } from '@/app/admin/avis/reissue.actions';
import ConfirmAction from '@/components/admin/shared/ConfirmAction';
import { formatDateFr } from '@/lib/admin/format';
import type { ReviewLinkStatus } from '@/lib/reviews/linkStatus';
import '@/components/admin/admin.css';
import '@/components/admin/shared/inline.css';

const INITIAL: ReissueState = { ok: false, message: null, url: null };

function statusLabel(s: ReviewLinkStatus): string {
  switch (s.kind) {
    case 'none':
      return 'Aucun lien envoyé';
    case 'active':
      return `Lien actif jusqu'au ${formatDateFr(s.expiresAt)}`;
    case 'used':
      return `Lien utilisé le ${formatDateFr(s.usedAt)}`;
    case 'expired':
      return `Lien expiré le ${formatDateFr(s.expiresAt)}`;
    case 'invalidated':
      return `Lien remplacé le ${formatDateFr(s.invalidatedAt)}`;
  }
}

// Réémission d'un lien d'avis (D-09). L'URL n'existe que dans l'état du composant : affichée une seule fois.
export default function ReissueReviewLinkCard({
  projectId,
  status,
  reviewFiled,
}: {
  projectId: string;
  status: ReviewLinkStatus;
  reviewFiled: boolean;
}) {
  const uid = useId();
  const [copied, setCopied] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: ReissueState, fd: FormData) => reissueReviewLinkAction(prev, fd),
    INITIAL,
  );

  async function copy() {
    if (!state.url) return;
    try {
      await navigator.clipboard.writeText(state.url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="pt-card" aria-labelledby={`${uid}-title`}>
      <h2 id={`${uid}-title`} className="pt-heading">
        Lien d&apos;avis
      </h2>
      {reviewFiled ? (
        <p className="pt-lead-sub">Avis déposé</p>
      ) : (
        <>
          <p className="pt-lead-sub">{statusLabel(status)}</p>
          {state.ok && state.url ? (
            <div className="pt-inline-panel">
              <label className="pt-inline-label" htmlFor={`${uid}-url`}>
                Nouveau lien d&apos;avis
              </label>
              <input id={`${uid}-url`} className="pt-input pt-inline-readonly" readOnly value={state.url} />
              <p className="pt-helper">Cette adresse ne sera plus affichée. Copiez-la maintenant.</p>
              <div className="pt-inline-actions">
                <button type="button" className="pt-btn-ghost" onClick={copy}>
                  Copier le lien
                </button>
              </div>
              <div aria-live="polite">{copied ? <p className="pt-helper">Lien copié</p> : null}</div>
            </div>
          ) : (
            <ConfirmAction
              triggerLabel="Réémettre le lien d'avis…"
              triggerVariant="ghost"
              confirmLabel="Confirmer la réémission"
              keepLabel="Garder le lien actuel"
              action={formAction}
              pending={pending}
              result={state}
              succeeded={state.ok}
              description="Réémettre le lien : l'ancien lien cesse de fonctionner immédiatement. Le nouveau lien est valable 60 jours. L'action est journalisée."
              message={state.message ? <p className={state.ok ? 'pt-helper' : 'pt-error'}>{state.message}</p> : null}
            >
              <input type="hidden" name="projectId" value={projectId} />
              <div>
                <label className="pt-inline-label" htmlFor={`${uid}-detail`}>
                  Détail (obligatoire, 3 à 500 caractères)
                </label>
                <textarea id={`${uid}-detail`} name="detail" required minLength={3} maxLength={500} rows={3} />
              </div>
            </ConfirmAction>
          )}
        </>
      )}
    </section>
  );
}
