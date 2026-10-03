'use client';

import { useActionState, useId, useRef, useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { inviteClientAction, type InviteState } from '@/app/admin/actions';
import { INVITE_COPY } from '@/lib/admin/inviteSchema';
import CompanyLookupFields from './CompanyLookupFields';
import './admin.css';

// Formulaire d'invitation (D-01, D-02). Composant client : aucune donnée
// sensible, toute décision d'autorisation reste dans les Server Actions.
// La recherche SIRET et la relecture entreprise vivent dans CompanyLookupFields.

const INITIAL: InviteState = { status: 'idle' };

export default function InviteForm() {
  const uid = useId();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  // Remonte le composant de recherche pour le réinitialiser après un succès.
  const [lookupKey, setLookupKey] = useState(0);

  // Nom saisi ou corrigé par l'admin : une recherche ne l'écrase jamais.
  const nameDirty = useRef(false);

  function resetAll() {
    nameDirty.current = false;
    setName('');
    setEmail('');
    setLookupKey((k) => k + 1);
  }

  const [state, formAction, pending] = useActionState(
    async (prev: InviteState, fd: FormData): Promise<InviteState> => {
      const result = await inviteClientAction(prev, fd);
      if (result.status === 'success') resetAll();
      return result;
    },
    INITIAL,
  );

  const siretError = state.status === 'error' && state.message === INVITE_COPY.siretInvalid;
  const nameHelpId = `${uid}-name-help`;
  const msgId = `${uid}-msg`;

  return (
    <form
      action={formAction}
      noValidate
      onSubmit={(e) => {
        // Entrée ne doit jamais envoyer avant la fin de la recherche.
        if (loading) e.preventDefault();
      }}
    >
      <fieldset className="pt-plain">
        <legend className="pt-sr-only">Coordonnées du client</legend>
        <CompanyLookupFields
          key={lookupKey}
          siretError={siretError}
          onBusyChange={setLoading}
          onCompanyName={(nom) => {
            if (!nameDirty.current) setName(nom);
          }}
        />
        <div className="pt-grid-2" style={{ marginTop: 16 }}>
          <div className="pt-field">
            <label className="pt-label" htmlFor={`${uid}-name`}>
              Nom affiché au client
            </label>
            <input
              id={`${uid}-name`}
              name="name"
              className="pt-input"
              type="text"
              required
              autoComplete="off"
              value={name}
              onChange={(e) => {
                nameDirty.current = e.target.value !== '';
                setName(e.target.value);
              }}
              aria-describedby={nameHelpId}
            />
            <p id={nameHelpId} className="pt-field-help">
              Prérempli depuis la raison sociale, modifiable.
            </p>
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
      </fieldset>

      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div id={msgId} aria-live="polite">
          {state.status === 'success' ? (
            <p className="pt-success">
              <CheckCircle size={16} aria-hidden="true" />
              {state.message}
            </p>
          ) : null}
          {state.status === 'error' && !siretError ? (
            <p className="pt-error">
              <AlertCircle size={16} aria-hidden="true" />
              {state.message}
            </p>
          ) : null}
        </div>
        <div className="pt-form-actions">
          <button type="submit" className="pt-btn-primary" disabled={pending || loading}>
            {loading ? 'Recherche en cours…' : pending ? 'Invitation en cours…' : 'Inviter le client'}
          </button>
        </div>
      </div>
    </form>
  );
}
