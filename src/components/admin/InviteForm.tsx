'use client';

import { useActionState, useId, useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { inviteClientAction, lookupSiretAction, type InviteState } from '@/app/admin/actions';
import { INVITE_COPY } from '@/lib/admin/inviteSchema';

// Formulaire d'invitation (D-01, D-02). Composant client : aucune donnée
// sensible, toute décision d'autorisation reste dans les Server Actions.

const INITIAL: InviteState = { status: 'idle' };

type CompanyFields = {
  nom: string;
  adresse: string;
  code_postal: string;
  commune: string;
  naf: string;
};
const EMPTY_COMPANY: CompanyFields = { nom: '', adresse: '', code_postal: '', commune: '', naf: '' };

type Hidden = Partial<
  Record<
    | 'siren'
    | 'forme_juridique_code'
    | 'etat_administratif'
    | 'categorie_entreprise'
    | 'date_creation'
    | 'tva_intracom',
    string
  >
>;

type Lookup =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'found'; label: string }
  | { phase: 'failed' };

const HIDDEN_KEYS = [
  'siren',
  'forme_juridique_code',
  'etat_administratif',
  'categorie_entreprise',
  'date_creation',
  'tva_intracom',
] as const;

export default function InviteForm() {
  const uid = useId();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [siret, setSiret] = useState('');
  const [company, setCompany] = useState<CompanyFields>(EMPTY_COMPANY);
  const [hidden, setHidden] = useState<Hidden>({});
  const [source, setSource] = useState<'api' | 'manual'>('manual');
  const [panel, setPanel] = useState(false);
  const [lookup, setLookup] = useState<Lookup>({ phase: 'idle' });
  const [inactive, setInactive] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (prev: InviteState, fd: FormData): Promise<InviteState> => {
      const result = await inviteClientAction(prev, fd);
      if (result.status === 'success') {
        setName('');
        setEmail('');
        setSiret('');
        setCompany(EMPTY_COMPANY);
        setHidden({});
        setSource('manual');
        setPanel(false);
        setLookup({ phase: 'idle' });
        setInactive(false);
      }
      return result;
    },
    INITIAL,
  );

  const siretDigits = siret.replace(/\s/g, '');
  const siretShown = siretDigits.length > 0 && !/^\d{14}$/.test(siretDigits);
  const siretError = siretShown && state.status === 'error' && state.message === INVITE_COPY.siretInvalid;
  const siretHelpId = `${uid}-siret-help`;
  const msgId = `${uid}-msg`;

  async function onSiretBlur() {
    if (!/^\d{14}$/.test(siretDigits)) return;
    setLookup({ phase: 'loading' });
    let res: Awaited<ReturnType<typeof lookupSiretAction>>;
    try {
      res = await lookupSiretAction(siretDigits);
    } catch {
      res = { ok: false, reason: 'unavailable' };
    }
    if (res.ok) {
      const d = res.data;
      setCompany({
        nom: d.nom ?? '',
        adresse: d.adresse ?? '',
        code_postal: d.code_postal ?? '',
        commune: d.commune ?? '',
        naf: d.naf ?? '',
      });
      const h: Hidden = {};
      for (const k of HIDDEN_KEYS) {
        const v = d[k];
        if (typeof v === 'string' && v) h[k] = v;
      }
      setHidden(h);
      setSource('api');
      setInactive(d.etat_administratif !== undefined && d.etat_administratif !== 'A');
      setLookup({ phase: 'found', label: `${d.nom}${d.commune ? `, ${d.commune}` : ''}` });
    } else {
      setCompany(EMPTY_COMPANY);
      setHidden({});
      setSource('manual');
      setInactive(false);
      setLookup({ phase: 'failed' });
    }
    setPanel(true);
  }

  function setField(key: keyof CompanyFields, value: string) {
    setCompany((c) => ({ ...c, [key]: value }));
  }

  return (
    <form action={formAction} noValidate>
      <div className="pt-grid-2">
        <div className="pt-field">
          <label className="pt-label" htmlFor={`${uid}-name`}>
            Nom du client
          </label>
          <input
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
        <div className="pt-field">
          <label className="pt-label" htmlFor={`${uid}-siret`}>
            SIRET
          </label>
          <input
            id={`${uid}-siret`}
            name="siret"
            className="pt-input"
            type="text"
            required
            autoComplete="off"
            inputMode="numeric"
            value={siret}
            onChange={(e) => setSiret(e.target.value)}
            onBlur={onSiretBlur}
            aria-invalid={siretError || undefined}
            aria-describedby={siretHelpId}
          />
          <div id={siretHelpId} aria-live="polite">
            {lookup.phase === 'loading' ? <p className="pt-status">Recherche en cours...</p> : null}
            {lookup.phase === 'found' ? (
              <p className="pt-status">Entreprise trouvée : {lookup.label}</p>
            ) : null}
            {lookup.phase === 'failed' ? (
              <p className="pt-warning">
                <AlertCircle size={16} aria-hidden="true" />
                {INVITE_COPY.siretNotFound}
              </p>
            ) : null}
            {inactive ? (
              <p className="pt-warning">
                <AlertCircle size={16} aria-hidden="true" />
                {INVITE_COPY.siretInactive}
              </p>
            ) : null}
            {siretError ? (
              <p className="pt-error">
                <AlertCircle size={16} aria-hidden="true" />
                {INVITE_COPY.siretInvalid}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {panel ? (
        <div className="pt-readback" style={{ marginTop: 16 }}>
          <div className="pt-grid-2">
            <ReadbackField id={`${uid}-nom`} name="company_nom" label="Raison sociale" value={company.nom} onChange={(v) => setField('nom', v)} />
            <ReadbackField id={`${uid}-adresse`} name="company_adresse" label="Adresse" value={company.adresse} onChange={(v) => setField('adresse', v)} />
            <ReadbackField id={`${uid}-cp`} name="company_code_postal" label="Code postal" value={company.code_postal} inputMode="numeric" onChange={(v) => setField('code_postal', v)} />
            <ReadbackField id={`${uid}-commune`} name="company_commune" label="Commune" value={company.commune} onChange={(v) => setField('commune', v)} />
            <ReadbackField id={`${uid}-naf`} name="company_naf" label="Code NAF" value={company.naf} onChange={(v) => setField('naf', v)} />
          </div>
          {HIDDEN_KEYS.map((k) =>
            hidden[k] ? <input key={k} type="hidden" name={`company_${k}`} value={hidden[k]} /> : null,
          )}
        </div>
      ) : null}
      <input type="hidden" name="company_source" value={source} />

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
        <div>
          <button type="submit" className="pt-btn-primary" disabled={pending}>
            {pending ? 'Invitation en cours...' : 'Inviter le client'}
          </button>
        </div>
      </div>
    </form>
  );
}

function ReadbackField({
  id,
  name,
  label,
  value,
  onChange,
  inputMode,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: 'numeric';
}) {
  return (
    <div className="pt-field">
      <label className="pt-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        className="pt-input"
        type="text"
        autoComplete="off"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
