'use client';

import { useActionState, useId, useRef, useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { inviteClientAction, lookupSiretAction, type InviteState } from '@/app/admin/actions';
import { normalizeSiretInput } from '@/lib/admin/format';
import { INVITE_COPY } from '@/lib/admin/inviteSchema';
import './admin.css';

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
type CompanyKey = keyof CompanyFields;
const COMPANY_KEYS: CompanyKey[] = ['nom', 'adresse', 'code_postal', 'commune', 'naf'];
const EMPTY_COMPANY: CompanyFields = { nom: '', adresse: '', code_postal: '', commune: '', naf: '' };

const HIDDEN_KEYS = [
  'siren',
  'forme_juridique_code',
  'etat_administratif',
  'categorie_entreprise',
  'date_creation',
  'tva_intracom',
] as const;
type Hidden = Partial<Record<(typeof HIDDEN_KEYS)[number], string>>;

type Lookup =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'found'; label: string }
  | { phase: 'failed' };

const SIRET_RE = /^\d{14}$/;

export default function InviteForm() {
  const uid = useId();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [siret, setSiret] = useState('');
  const [company, setCompany] = useState<CompanyFields>(EMPTY_COMPANY);
  const [hidden, setHidden] = useState<Hidden>({});
  const [source, setSource] = useState<'api' | 'manual'>('manual');
  const [panel, setPanel] = useState(false);
  const [editing, setEditing] = useState(false);
  const [lookup, setLookup] = useState<Lookup>({ phase: 'idle' });
  const [inactive, setInactive] = useState(false);

  // Champs saisis ou corrigés par l'admin : une recherche ne les écrase jamais.
  const nameDirty = useRef(false);
  const companyDirty = useRef<Set<CompanyKey>>(new Set());
  const lastLooked = useRef<string | null>(null);
  const reqId = useRef(0);

  function resetAll() {
    reqId.current += 1;
    lastLooked.current = null;
    nameDirty.current = false;
    companyDirty.current = new Set();
    setName('');
    setEmail('');
    setSiret('');
    setCompany(EMPTY_COMPANY);
    setHidden({});
    setSource('manual');
    setPanel(false);
    setEditing(false);
    setLookup({ phase: 'idle' });
    setInactive(false);
  }

  const [state, formAction, pending] = useActionState(
    async (prev: InviteState, fd: FormData): Promise<InviteState> => {
      const result = await inviteClientAction(prev, fd);
      if (result.status === 'success') resetAll();
      return result;
    },
    INITIAL,
  );

  const loading = lookup.phase === 'loading';
  const siretShown = siret.length > 0 && !SIRET_RE.test(siret);
  const siretError = siretShown && state.status === 'error' && state.message === INVITE_COPY.siretInvalid;
  const siretHelpId = `${uid}-siret-help`;
  const nameHelpId = `${uid}-name-help`;
  const msgId = `${uid}-msg`;

  /** Applique les valeurs de l'API sans toucher aux champs déjà modifiés par l'admin. */
  function applyCompany(next: CompanyFields) {
    setCompany((prev) => {
      const out = { ...prev };
      for (const k of COMPANY_KEYS) {
        if (!companyDirty.current.has(k)) out[k] = next[k];
      }
      return out;
    });
    if (!nameDirty.current) setName(next.nom);
  }

  async function runLookup(digits: string) {
    lastLooked.current = digits;
    const id = ++reqId.current;
    setLookup({ phase: 'loading' });
    let res: Awaited<ReturnType<typeof lookupSiretAction>>;
    try {
      res = await lookupSiretAction(digits);
    } catch {
      res = { ok: false, reason: 'unavailable' };
    }
    if (id !== reqId.current) return; // réponse périmée : le SIRET a changé entre-temps

    if (res.ok) {
      const d = res.data;
      applyCompany({
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
      setEditing(false);
      setInactive(d.etat_administratif !== undefined && d.etat_administratif !== 'A');
      setLookup({ phase: 'found', label: `${d.nom}${d.commune ? `, ${d.commune}` : ''}` });
    } else {
      applyCompany(EMPTY_COMPANY);
      setHidden({});
      setSource('manual');
      setEditing(true);
      setInactive(false);
      setLookup({ phase: 'failed' });
    }
    setPanel(true);
  }

  function onSiretChange(raw: string) {
    const digits = normalizeSiretInput(raw);
    setSiret(digits);
    if (digits === lastLooked.current) return;

    // Le SIRET a changé : toute recherche en cours ou précédente est caduque.
    reqId.current += 1;
    if (lastLooked.current !== null) {
      lastLooked.current = null;
      applyCompany(EMPTY_COMPANY);
      setHidden({});
      setSource('manual');
      setInactive(false);
      setPanel(false);
      setEditing(false);
    }
    if (SIRET_RE.test(digits)) {
      void runLookup(digits);
    } else {
      setLookup({ phase: 'idle' });
    }
  }

  function onSiretBlur() {
    // Repli : la recherche automatique n'a pas démarré (ex. saisie auto-remplie).
    if (SIRET_RE.test(siret) && lastLooked.current !== siret && !loading) void runLookup(siret);
  }

  function setField(key: CompanyKey, value: string) {
    companyDirty.current.add(key);
    setCompany((c) => ({ ...c, [key]: value }));
  }

  const showSummary = panel && source === 'api' && !editing;
  const showInputs = panel && !showSummary;

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
        <div className="pt-grid-2">
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
              onChange={(e) => onSiretChange(e.target.value)}
              onBlur={onSiretBlur}
              aria-invalid={siretError || undefined}
              aria-describedby={siretHelpId}
            />
            <div id={siretHelpId} className="pt-lookup-status" aria-live="polite">
              {loading ? <p className="pt-status">Recherche en cours…</p> : null}
              {lookup.phase === 'found' ? (
                <p className="pt-status">Entreprise trouvée : {lookup.label}</p>
              ) : null}
              {lookup.phase === 'failed' ? (
                <p className="pt-warn">
                  <AlertCircle size={16} aria-hidden="true" />
                  {INVITE_COPY.siretNotFound}
                </p>
              ) : null}
              {inactive ? (
                <p className="pt-warn">
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

      {showSummary ? (
        <section className="pt-readback" style={{ marginTop: 16 }} aria-labelledby={`${uid}-sum`}>
          <h3 id={`${uid}-sum`} className="pt-sr-only">
            Informations de l&apos;entreprise
          </h3>
          <dl className="pt-summary">
            <dt>Raison sociale</dt>
            <dd>{company.nom || '—'}</dd>
            <dt>Adresse</dt>
            <dd>{company.adresse || '—'}</dd>
            <dt>Code postal et commune</dt>
            <dd>{[company.code_postal, company.commune].filter(Boolean).join(' ') || '—'}</dd>
            <dt>Code NAF</dt>
            <dd>{company.naf || '—'}</dd>
          </dl>
          <div className="pt-summary-actions">
            <button type="button" className="pt-btn-text" onClick={() => setEditing(true)}>
              Corriger
            </button>
          </div>
          <CompanyHidden company={company} />
        </section>
      ) : null}

      {showInputs ? (
        <fieldset className="pt-company" style={{ marginTop: 16 }}>
          <legend>Informations de l&apos;entreprise</legend>
          <div className="pt-company-grid">
            <div className="pt-span-full">
              <TextField id={`${uid}-nom`} name="company_nom" label="Raison sociale" value={company.nom} onChange={(v) => setField('nom', v)} />
            </div>
            <div className="pt-span-full">
              <TextField id={`${uid}-adresse`} name="company_adresse" label="Adresse" value={company.adresse} onChange={(v) => setField('adresse', v)} />
            </div>
            <TextField id={`${uid}-cp`} name="company_code_postal" label="Code postal" value={company.code_postal} inputMode="numeric" onChange={(v) => setField('code_postal', v)} />
            <TextField id={`${uid}-commune`} name="company_commune" label="Commune" value={company.commune} onChange={(v) => setField('commune', v)} />
            <div className="pt-span-full">
              <TextField id={`${uid}-naf`} name="company_naf" label="Code NAF" value={company.naf} onChange={(v) => setField('naf', v)} />
            </div>
          </div>
        </fieldset>
      ) : null}

      {/* Valeurs non éditables issues de l'API, toujours transmises. */}
      {HIDDEN_KEYS.map((k) =>
        hidden[k] ? <input key={k} type="hidden" name={`company_${k}`} value={hidden[k]} /> : null,
      )}
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
        <div className="pt-form-actions">
          <button type="submit" className="pt-btn-primary" disabled={pending || loading}>
            {loading ? 'Recherche en cours…' : pending ? 'Invitation en cours…' : 'Inviter le client'}
          </button>
        </div>
      </div>
    </form>
  );
}

// En mode résumé, les valeurs restent soumises via des champs masqués.
function CompanyHidden({ company }: { company: CompanyFields }) {
  return (
    <>
      <input type="hidden" name="company_nom" value={company.nom} />
      <input type="hidden" name="company_adresse" value={company.adresse} />
      <input type="hidden" name="company_code_postal" value={company.code_postal} />
      <input type="hidden" name="company_commune" value={company.commune} />
      <input type="hidden" name="company_naf" value={company.naf} />
    </>
  );
}

function TextField({
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
