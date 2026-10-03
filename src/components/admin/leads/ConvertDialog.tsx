'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle, UserPlus } from 'lucide-react';
import { convertLeadAction, siretExistsAction, type ConvertState } from '@/app/admin/leads/actions';
import CompanyLookupFields from '@/components/admin/CompanyLookupFields';
import { OFFER_LABELS, OFFER_SLUGS, type OfferSlug } from '@/lib/projects/offers';
import '@/components/admin/admin.css';
import './leads.css';

const INITIAL: ConvertState = { status: 'idle' };
const TITLE_MAX = 80;

type Props = {
  leadId: string;
  defaultName: string;
  defaultEmail: string;
  defaultOffer?: OfferSlug;
  /** Lead déjà converti : le déclencheur disparaît, la bannière de succès reste. */
  converted?: boolean;
};

// Conversion lead -> client (D-01, D-02, D-05, D-10, D-19). Reprend la recherche
// SIRET de l'invitation dans un <dialog> natif. Le contrôle d'accès reste dans
// convertLeadAction ; l'état « pending » empêche le double envoi (Pitfall 2).
export default function ConvertDialog({ leadId, defaultName, defaultEmail, defaultOffer, converted = false }: Props) {
  const uid = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const titleDirty = useRef(false);

  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [offer, setOffer] = useState<string>(defaultOffer ?? '');
  const [projectTitle, setProjectTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [existing, setExisting] = useState(false);

  const [state, formAction, pending] = useActionState(convertLeadAction, INITIAL);

  useEffect(() => {
    if (state.status === 'success') {
      dialogRef.current?.close();
      triggerRef.current?.focus();
    }
  }, [state]);

  function open() {
    const d = dialogRef.current;
    if (d && !d.open) d.showModal();
    firstFieldRef.current?.focus();
  }

  function close() {
    if (pending) return;
    dialogRef.current?.close();
    triggerRef.current?.focus();
  }

  function onSiretResolved(siret: string, companyName: string | null) {
    if (companyName && !titleDirty.current) setProjectTitle(`Projet ${companyName}`.slice(0, TITLE_MAX));
    void siretExistsAction(siret)
      .then((r) => setExisting(r.exists))
      .catch(() => setExisting(false));
  }

  const titleId = `${uid}-title`;
  const helpId = `${uid}-help`;
  const showBanner = state.status === 'success';

  return (
    <>
      {converted ? null : (
        <button ref={triggerRef} type="button" className="pt-btn-primary" onClick={open}>
          <UserPlus size={16} aria-hidden="true" />
          Convertir en client
        </button>
      )}

      {showBanner ? (
        <div style={{ flexBasis: '100%' }} aria-live="polite">
          <p className={state.mailSent ? 'pt-success' : 'pt-warn'}>
            {state.mailSent ? (
              <CheckCircle size={16} aria-hidden="true" />
            ) : (
              <AlertCircle size={16} aria-hidden="true" />
            )}
            {state.message}
          </p>
          {state.projectId ? (
            <Link href={`/admin/projets/${state.projectId}`} className="pt-btn-text">
              Voir le projet
            </Link>
          ) : null}
        </div>
      ) : null}

      <dialog
        ref={dialogRef}
        className="pt-dialog"
        aria-labelledby={titleId}
        aria-describedby={helpId}
        onCancel={(e) => {
          if (pending) e.preventDefault();
        }}
      >
        <form action={formAction} noValidate>
          <h2 id={titleId} className="pt-heading">
            Convertir en client
          </h2>
          <p id={helpId} className="pt-helper">
            Cela crée le client, son premier projet et envoie l&apos;invitation à son espace.
          </p>

          {state.status === 'error' ? (
            <p className="pt-error" role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              {state.message}
            </p>
          ) : null}

          <input type="hidden" name="leadId" value={leadId} />

          <div className="pt-grid-2" style={{ marginTop: 16 }}>
            <div className="pt-field">
              <label className="pt-label" htmlFor={`${uid}-name`}>
                Nom du contact
              </label>
              <input
                ref={firstFieldRef}
                id={`${uid}-name`}
                name="name"
                className="pt-input"
                type="text"
                required
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="pt-field">
              <label className="pt-label" htmlFor={`${uid}-email`}>
                Adresse e-mail
              </label>
              <input
                id={`${uid}-email`}
                name="email"
                className="pt-input"
                type="email"
                required
                autoComplete="off"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <CompanyLookupFields
              sourceFieldName="companySource"
              onBusyChange={(b) => {
                setBusy(b);
                if (b) setExisting(false);
              }}
              onSiretResolved={onSiretResolved}
            />
            {existing ? (
              <p className="pt-warn">
                <AlertCircle size={16} aria-hidden="true" />
                Ce SIRET correspond à un client existant. Il sera réutilisé et un nouveau projet y sera ajouté.
              </p>
            ) : null}
          </div>

          <div className="pt-grid-2" style={{ marginTop: 16 }}>
            <div className="pt-field">
              <label className="pt-label" htmlFor={`${uid}-offer`}>
                Offre
              </label>
              <select
                id={`${uid}-offer`}
                name="offer"
                className="pt-input"
                required
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
              >
                <option value="" disabled>
                  Choisir une offre
                </option>
                {OFFER_SLUGS.map((slug) => (
                  <option key={slug} value={slug}>
                    {OFFER_LABELS[slug]}
                  </option>
                ))}
              </select>
            </div>
            <div className="pt-field">
              <label className="pt-label" htmlFor={`${uid}-ptitle`}>
                Titre du projet
              </label>
              <input
                id={`${uid}-ptitle`}
                name="projectTitle"
                className="pt-input"
                type="text"
                required
                maxLength={TITLE_MAX}
                autoComplete="off"
                value={projectTitle}
                onChange={(e) => {
                  titleDirty.current = e.target.value !== '';
                  setProjectTitle(e.target.value);
                }}
              />
            </div>
          </div>

          <div className="pt-form-actions" style={{ marginTop: 24, display: 'flex', gap: 16 }}>
            <button type="button" className="pt-btn-text" onClick={close} disabled={pending}>
              Annuler
            </button>
            <button type="submit" className="pt-btn-primary" disabled={pending || busy}>
              {pending ? 'Conversion en cours…' : "Convertir et envoyer l'invitation"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
