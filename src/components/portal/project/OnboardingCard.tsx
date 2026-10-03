'use client';

import { useActionState, useId, useRef, useState, type ReactNode } from 'react';
import { Check, CircleAlert } from 'lucide-react';
import {
  confirmCompanyAction,
  saveOnboardingAction,
  type PortalActionState,
} from '@/app/espace-client/actions';
import type { CompanySnapshot } from '@/lib/admin/inviteSchema';
import { formatDateFr } from '@/lib/admin/format';
import { PROJECT_COPY } from '@/lib/projects/copy';
import {
  blockCompletion,
  isOnboardingComplete,
  type OnboardingBlock,
  type OnboardingRow,
} from '@/lib/projects/onboardingSchema';
import './project.css';

const INITIAL: PortalActionState = { status: 'idle' };
const COPY = PROJECT_COPY.onboarding;
const MAX_SOCIAL = 4;
const MAX_GOAL = 1000;

type Props = { company: CompanySnapshot | null; siret: string; onboarding: OnboardingRow | null };

function Badge({ done }: { done: boolean }) {
  return (
    <span className="pt-status" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
      {done ? <Check size={14} aria-hidden="true" /> : null}
      {done ? COPY.complete : COPY.todo}
    </span>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="pt-error">
      <CircleAlert size={16} aria-hidden="true" style={{ flex: 'none', marginTop: 4 }} />
      <span>{message}</span>
    </p>
  );
}

function Field(props: {
  uid: string;
  name: string;
  label: string;
  required?: boolean;
  error?: string;
  help?: string;
  children: (a: { id: string; invalid: boolean; describedBy: string | undefined }) => ReactNode;
}) {
  const id = `${props.uid}-${props.name}`;
  const errId = `${id}-err`;
  const helpId = `${id}-help`;
  const describedBy = [props.error ? errId : null, props.help ? helpId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="pt-field">
      <label htmlFor={id}>
        {props.label}
        {props.required ? ' (obligatoire)' : ''}
      </label>
      {props.children({ id, invalid: !!props.error, describedBy })}
      {props.help ? (
        <p id={helpId} className="pt-status">
          {props.help}
        </p>
      ) : null}
      <FieldError id={errId} message={props.error} />
    </div>
  );
}

// Un bloc = un formulaire, enregistré à la sortie d'un champ modifié.
function BlockForm(props: {
  block: OnboardingBlock;
  legend: string;
  done: boolean;
  children: (a: { state: PortalActionState; uid: string; markDirty: () => void }) => ReactNode;
}) {
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);
  const [state, formAction, pending] = useActionState(saveOnboardingAction, INITIAL);

  const markDirty = () => {
    setDirty(true);
  };
  const flush = () => {
    if (!dirty) return;
    setDirty(false);
    formRef.current?.requestSubmit();
  };

  return (
    <form
      ref={formRef}
      action={formAction}
      onBlur={(e) => {
        // Ne pas enregistrer tant que le focus reste dans le même bloc.
        if (e.relatedTarget && formRef.current?.contains(e.relatedTarget as Node)) return;
        flush();
      }}
      noValidate
    >
      <input type="hidden" name="block" value={props.block} />
      <fieldset className="pt-onb-block">
        <legend>
          {props.legend}
          <Badge done={props.done} />
        </legend>
        {props.children({ state, uid, markDirty })}
        <p className="pt-status" aria-live="polite">
          {pending ? COPY.saving : state.status === 'success' ? state.message : null}
        </p>
        {state.status === 'error' && !state.fieldErrors ? (
          <p className="pt-error" role="alert">
            <CircleAlert size={16} aria-hidden="true" style={{ flex: 'none', marginTop: 4 }} />
            <span>{state.message}</span>
          </p>
        ) : null}
      </fieldset>
    </form>
  );
}

function CompanyBlock({ company, siret, row, done }: { company: CompanySnapshot | null; siret: string; row: OnboardingRow | null; done: boolean }) {
  const [state, formAction, pending] = useActionState(confirmCompanyAction, INITIAL);
  const address = [company?.adresse, [company?.code_postal, company?.commune].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  const subject = encodeURIComponent(`Erreur dans mes informations société (SIRET ${siret})`);
  const confirmedAt = row?.companyConfirmedAt ?? null;
  return (
    <form action={formAction}>
      <fieldset className="pt-onb-block">
        <legend>
          1. Votre société
          <Badge done={done} />
        </legend>
        <div className="pt-readback">
          <dl className="pt-summary">
            <dt>SIRET</dt>
            <dd>{siret || '—'}</dd>
            <dt>Raison sociale</dt>
            <dd>{company?.nom || '—'}</dd>
            <dt>Adresse</dt>
            <dd>{address || '—'}</dd>
            <dt>Forme juridique</dt>
            <dd>{company?.forme_juridique_code || '—'}</dd>
          </dl>
        </div>
        {confirmedAt ? (
          <p className="pt-success">
            <Check size={16} aria-hidden="true" style={{ flex: 'none', marginTop: 4 }} />
            <span>{COPY.confirmedOn(formatDateFr(confirmedAt))}</span>
          </p>
        ) : (
          <button type="submit" className="pt-btn-primary" disabled={pending}>
            Confirmer les informations de ma société
          </button>
        )}
        {confirmedAt ? (
          <a className="pt-btn-text" href={`mailto:contact@sevalys.com?subject=${subject}`}>
            {COPY.reportError}
          </a>
        ) : null}
        <p className="pt-status" aria-live="polite">
          {pending ? COPY.saving : null}
        </p>
        {state.status === 'error' ? (
          <p className="pt-error" role="alert">
            <CircleAlert size={16} aria-hidden="true" style={{ flex: 'none', marginTop: 4 }} />
            <span>{state.message}</span>
          </p>
        ) : null}
      </fieldset>
    </form>
  );
}

export default function OnboardingCard({ company, siret, onboarding }: Props) {
  const row = onboarding;
  const empty: OnboardingRow = {
    companyConfirmedAt: null,
    signatoryName: null,
    signatoryRole: null,
    projectContactName: null,
    projectContactEmail: null,
    projectContactPhone: null,
    billingSameAsCompany: true,
    billingAddress: null,
    vatStatus: null,
    vatNumber: null,
    existingSiteUrl: null,
    socialLinks: [],
    projectGoal: null,
  };
  const r = row ?? empty;
  const blocks = blockCompletion(r);
  const doneCount = Object.values(blocks).filter(Boolean).length;
  const complete = isOnboardingComplete(r);
  const progressText = COPY.progress(doneCount);

  // États contrôlés : les valeurs saisies survivent à une erreur de validation.
  const [signName, setSignName] = useState(r.signatoryName ?? '');
  const [signRole, setSignRole] = useState(r.signatoryRole ?? '');
  const [cName, setCName] = useState(r.projectContactName ?? '');
  const [cEmail, setCEmail] = useState(r.projectContactEmail ?? '');
  const [cPhone, setCPhone] = useState(r.projectContactPhone ?? '');
  const [same, setSame] = useState(r.billingSameAsCompany);
  const [bAdr, setBAdr] = useState(r.billingAddress?.adresse ?? '');
  const [bCp, setBCp] = useState(r.billingAddress?.code_postal ?? '');
  const [bCom, setBCom] = useState(r.billingAddress?.commune ?? '');
  const [vat, setVat] = useState<'number' | 'not_subject' | ''>(r.vatStatus ?? '');
  const [vatNum, setVatNum] = useState(r.vatNumber ?? '');
  const [site, setSite] = useState(r.existingSiteUrl ?? '');
  const [socials, setSocials] = useState<string[]>(r.socialLinks.length ? r.socialLinks : ['']);
  const [goal, setGoal] = useState(r.projectGoal ?? '');

  const blockEls = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <CompanyBlock company={company} siret={siret} row={row} done={blocks.societe} />

      <BlockForm block="signataire" legend="2. Signataire" done={blocks.signataire}>
        {({ state, uid, markDirty }) => (
          <>
            <Field uid={uid} name="signatoryName" label="Nom complet" required error={state.fieldErrors?.signatoryName}>
              {(a) => (
                <input
                  id={a.id}
                  name="signatoryName"
                  className="pt-input"
                  autoComplete="name"
                  value={signName}
                  aria-invalid={a.invalid || undefined}
                  aria-describedby={a.describedBy}
                  onChange={(e) => {
                    setSignName(e.target.value);
                    markDirty();
                  }}
                />
              )}
            </Field>
            <Field uid={uid} name="signatoryRole" label="Fonction" required error={state.fieldErrors?.signatoryRole}>
              {(a) => (
                <input
                  id={a.id}
                  name="signatoryRole"
                  className="pt-input"
                  autoComplete="organization-title"
                  value={signRole}
                  aria-invalid={a.invalid || undefined}
                  aria-describedby={a.describedBy}
                  onChange={(e) => {
                    setSignRole(e.target.value);
                    markDirty();
                  }}
                />
              )}
            </Field>
          </>
        )}
      </BlockForm>

      <BlockForm block="contact" legend="3. Contact du projet" done={blocks.contact}>
        {({ state, uid, markDirty }) => (
          <>
            <p className="pt-status">{COPY.optionalHelper}</p>
            <div className="pt-onb-grid">
              <Field uid={uid} name="projectContactName" label="Nom" error={state.fieldErrors?.projectContactName}>
                {(a) => (
                  <input
                    id={a.id}
                    name="projectContactName"
                    className="pt-input"
                    autoComplete="name"
                    value={cName}
                    aria-invalid={a.invalid || undefined}
                    aria-describedby={a.describedBy}
                    onChange={(e) => {
                      setCName(e.target.value);
                      markDirty();
                    }}
                  />
                )}
              </Field>
              <Field uid={uid} name="projectContactEmail" label="E-mail" error={state.fieldErrors?.projectContactEmail}>
                {(a) => (
                  <input
                    id={a.id}
                    name="projectContactEmail"
                    type="email"
                    className="pt-input"
                    autoComplete="email"
                    value={cEmail}
                    aria-invalid={a.invalid || undefined}
                    aria-describedby={a.describedBy}
                    onChange={(e) => {
                      setCEmail(e.target.value);
                      markDirty();
                    }}
                  />
                )}
              </Field>
              <Field uid={uid} name="projectContactPhone" label="Téléphone" error={state.fieldErrors?.projectContactPhone}>
                {(a) => (
                  <input
                    id={a.id}
                    name="projectContactPhone"
                    type="tel"
                    className="pt-input"
                    autoComplete="tel"
                    value={cPhone}
                    aria-invalid={a.invalid || undefined}
                    aria-describedby={a.describedBy}
                    onChange={(e) => {
                      setCPhone(e.target.value);
                      markDirty();
                    }}
                  />
                )}
              </Field>
            </div>
          </>
        )}
      </BlockForm>

      <BlockForm block="facturation" legend="4. Facturation et TVA" done={blocks.facturation}>
        {({ state, uid, markDirty }) => (
          <>
            <label className="pt-consent-check">
              <input
                type="checkbox"
                name="billingSameAsCompany"
                checked={same}
                onChange={(e) => {
                  setSame(e.target.checked);
                  markDirty();
                }}
              />
              <span>L&apos;adresse de facturation est celle de la société</span>
            </label>
            <FieldError id={`${uid}-billing-err`} message={state.fieldErrors?.billingAddress} />
            {!same ? (
              <div className="pt-onb-grid">
                <Field uid={uid} name="billingAdresse" label="Adresse" required error={state.fieldErrors?.['billingAddress.adresse']}>
                  {(a) => (
                    <input
                      id={a.id}
                      name="billingAdresse"
                      className="pt-input"
                      autoComplete="billing street-address"
                      value={bAdr}
                      aria-invalid={a.invalid || undefined}
                      aria-describedby={a.describedBy}
                      onChange={(e) => {
                        setBAdr(e.target.value);
                        markDirty();
                      }}
                    />
                  )}
                </Field>
                <Field uid={uid} name="billingCodePostal" label="Code postal" required error={state.fieldErrors?.['billingAddress.code_postal']}>
                  {(a) => (
                    <input
                      id={a.id}
                      name="billingCodePostal"
                      className="pt-input"
                      inputMode="numeric"
                      autoComplete="billing postal-code"
                      value={bCp}
                      aria-invalid={a.invalid || undefined}
                      aria-describedby={a.describedBy}
                      onChange={(e) => {
                        setBCp(e.target.value);
                        markDirty();
                      }}
                    />
                  )}
                </Field>
                <Field uid={uid} name="billingCommune" label="Ville" required error={state.fieldErrors?.['billingAddress.commune']}>
                  {(a) => (
                    <input
                      id={a.id}
                      name="billingCommune"
                      className="pt-input"
                      autoComplete="billing address-level2"
                      value={bCom}
                      aria-invalid={a.invalid || undefined}
                      aria-describedby={a.describedBy}
                      onChange={(e) => {
                        setBCom(e.target.value);
                        markDirty();
                      }}
                    />
                  )}
                </Field>
              </div>
            ) : null}
            <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <legend>Numéro de TVA (obligatoire)</legend>
              <label className="pt-consent-check">
                <input
                  type="radio"
                  name="vatStatus"
                  value="number"
                  checked={vat === 'number'}
                  onChange={() => {
                    setVat('number');
                    markDirty();
                  }}
                />
                <span>J&apos;ai un numéro de TVA</span>
              </label>
              {vat === 'number' ? (
                <Field uid={uid} name="vatNumber" label="Numéro de TVA" error={state.fieldErrors?.vatNumber}>
                  {(a) => (
                    <input
                      id={a.id}
                      name="vatNumber"
                      className="pt-input"
                      autoComplete="off"
                      placeholder="FR12345678901"
                      value={vatNum}
                      aria-invalid={a.invalid || undefined}
                      aria-describedby={a.describedBy}
                      onChange={(e) => {
                        setVatNum(e.target.value);
                        markDirty();
                      }}
                    />
                  )}
                </Field>
              ) : null}
              <label className="pt-consent-check">
                <input
                  type="radio"
                  name="vatStatus"
                  value="not_subject"
                  checked={vat === 'not_subject'}
                  onChange={() => {
                    setVat('not_subject');
                    markDirty();
                  }}
                />
                <span>Non assujetti à la TVA</span>
              </label>
              <FieldError id={`${uid}-vatStatus-err`} message={state.fieldErrors?.vatStatus} />
            </fieldset>
          </>
        )}
      </BlockForm>

      <BlockForm block="projet" legend="5. Votre projet" done={blocks.projet}>
        {({ state, uid, markDirty }) => (
          <>
            <Field uid={uid} name="existingSiteUrl" label="Site web existant" error={state.fieldErrors?.existingSiteUrl}>
              {(a) => (
                <input
                  id={a.id}
                  name="existingSiteUrl"
                  type="url"
                  className="pt-input"
                  autoComplete="url"
                  placeholder="https://"
                  value={site}
                  aria-invalid={a.invalid || undefined}
                  aria-describedby={a.describedBy}
                  onChange={(e) => {
                    setSite(e.target.value);
                    markDirty();
                  }}
                />
              )}
            </Field>
            {socials.map((value, i) => (
              <Field
                key={i}
                uid={uid}
                name={`social-${i}`}
                label={`Réseau social ${i + 1}`}
                error={state.fieldErrors?.[`socialLinks.${i}`]}
              >
                {(a) => (
                  <input
                    id={a.id}
                    name="socialLinks"
                    type="url"
                    className="pt-input"
                    autoComplete="off"
                    placeholder="https://"
                    value={value}
                    aria-invalid={a.invalid || undefined}
                    aria-describedby={a.describedBy}
                    onChange={(e) => {
                      setSocials((prev) => prev.map((v, j) => (j === i ? e.target.value : v)));
                      markDirty();
                    }}
                  />
                )}
              </Field>
            ))}
            {socials.length < MAX_SOCIAL ? (
              <button type="button" className="pt-btn-text" onClick={() => setSocials((p) => [...p, ''])}>
                Ajouter un réseau
              </button>
            ) : null}
            <Field uid={uid} name="projectGoal" label="Objectif du projet" error={state.fieldErrors?.projectGoal}>
              {(a) => (
                <>
                  <textarea
                    id={a.id}
                    name="projectGoal"
                    className="pt-input"
                    rows={4}
                    maxLength={MAX_GOAL}
                    value={goal}
                    aria-invalid={a.invalid || undefined}
                    aria-describedby={a.describedBy}
                    onChange={(e) => {
                      setGoal(e.target.value);
                      markDirty();
                    }}
                  />
                  <p className="pt-status" aria-hidden="true">
                    {goal.length}/{MAX_GOAL}
                  </p>
                </>
              )}
            </Field>
          </>
        )}
      </BlockForm>
    </div>
  );

  return (
    <section className="pt-onb" aria-labelledby="onboarding" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 id="onboarding">{PROJECT_COPY.onboarding.heading}</h2>
      <p className="pt-status">{COPY.helper}</p>
      <div>
        <p className="pt-status" aria-hidden="true">
          {progressText}
        </p>
        <progress className="pt-onb-progress" value={doneCount} max={5} aria-label={progressText} />
        <span className="pt-sr-only" aria-live="polite">
          {progressText}
        </span>
      </div>
      {complete ? (
        <>
          <p className="pt-success">
            <Check size={16} aria-hidden="true" style={{ flex: 'none', marginTop: 4 }} />
            <span>{COPY.done}</span>
          </p>
          <details>
            <summary className="pt-btn-text">{COPY.edit}</summary>
            {blockEls}
          </details>
        </>
      ) : (
        blockEls
      )}
    </section>
  );
}
