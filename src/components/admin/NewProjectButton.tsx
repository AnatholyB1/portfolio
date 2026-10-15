'use client';

import { useActionState, useEffect, useId, useRef } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { createProjectAction, type CreateProjectState } from '@/app/admin/projets/actions';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { OFFER_LABELS, OFFER_SLUGS } from '@/lib/projects/offers';
import '@/components/admin/admin.css';
import '@/components/admin/leads/leads.css';

const INITIAL: CreateProjectState = { status: 'idle' };
const TITLE_MAX = 80;
const COPY = PROJECT_COPY.creation;

type Props = { clientId: string; clientName: string };

// Création d'un projet pour un client existant, depuis la liste des clients.
// <dialog> natif ; offre et titre volontairement vides au départ (aucune valeur
// par défaut). Le contrôle d'accès reste dans createProjectAction.
export default function NewProjectButton({ clientId, clientName }: Props) {
  const uid = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const firstFieldRef = useRef<HTMLSelectElement>(null);

  const [state, formAction, pending] = useActionState(createProjectAction, INITIAL);

  useEffect(() => {
    if (state.status === 'success') {
      dialogRef.current?.close();
      // Formulaire remis à zéro pour pouvoir enchaîner plusieurs créations.
      formRef.current?.reset();
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

  const titleId = `${uid}-title`;
  const helpId = `${uid}-help`;

  return (
    <div className="pt-row-actions">
      <button
        ref={triggerRef}
        type="button"
        className="pt-btn-text"
        onClick={open}
        aria-label={`${COPY.trigger} pour ${clientName}`}
      >
        {COPY.trigger}
      </button>

      <div aria-live="polite">
        {state.status === 'success' ? (
          <>
            <p className="pt-success">
              <CheckCircle size={16} aria-hidden="true" />
              {state.message}
            </p>
            {state.projectId ? (
              <Link href={`/admin/projets/${state.projectId}`} className="pt-btn-text">
                {COPY.viewProject}
              </Link>
            ) : null}
          </>
        ) : null}
      </div>

      <dialog
        ref={dialogRef}
        className="pt-dialog pt-dialog-modal"
        aria-labelledby={titleId}
        aria-describedby={helpId}
        onCancel={(e) => {
          if (pending) e.preventDefault();
        }}
      >
        <form ref={formRef} action={formAction} noValidate>
          <h2 id={titleId} className="pt-heading">
            {COPY.title}
          </h2>
          <p id={helpId} className="pt-helper">
            {COPY.helper}
          </p>

          <div role="alert">
            {state.status === 'error' ? (
              <p className="pt-error">
                <AlertCircle size={16} aria-hidden="true" />
                {state.message}
              </p>
            ) : null}
          </div>

          <input type="hidden" name="clientId" value={clientId} />

          <div className="pt-grid-2 pt-admin-mt-16">
            <div className="pt-field">
              <label className="pt-label" htmlFor={`${uid}-offer`}>
                {COPY.offerLabel}
              </label>
              <select
                ref={firstFieldRef}
                id={`${uid}-offer`}
                name="offer"
                className="pt-input"
                required
                defaultValue=""
              >
                <option value="" disabled>
                  {COPY.chooseOffer}
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
                {COPY.titleLabel}
              </label>
              <input
                id={`${uid}-ptitle`}
                name="projectTitle"
                className="pt-input"
                type="text"
                required
                maxLength={TITLE_MAX}
                autoComplete="off"
                defaultValue=""
              />
            </div>
          </div>

          <div className="pt-form-actions pt-admin-actions">
            <button type="button" className="pt-btn-text" onClick={close} disabled={pending}>
              {COPY.cancel}
            </button>
            <button type="submit" className="pt-btn-primary" disabled={pending}>
              {pending ? COPY.submitting : COPY.submit}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
