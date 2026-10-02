'use client';

import { AlertCircle } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
import {
  requestCodeAction,
  verifyCodeAction,
  type LoginState,
} from '@/app/connexion/actions';
import OtpInput from './OtpInput';

const INITIAL: LoginState = { step: 'email' };
const RESEND_SECONDS = 60;

interface LoginFormProps {
  next?: string;
  /** Adresse pré-remplie (paramètre ?email=, déjà validé côté serveur). */
  initialEmail?: string;
  /** Message d'information affiché sous le titre (ex. session expirée). */
  notice?: string;
}

function ErrorMessage({ id, error }: { id: string; error?: string }) {
  return (
    <div id={id} aria-live="polite">
      {error ? (
        <p className="pt-error">
          <AlertCircle size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 4 }} />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

export default function LoginForm({ next, initialEmail = '', notice }: LoginFormProps) {
  const [reqState, reqAction, reqPending] = useActionState(requestCodeAction, INITIAL);
  const [verState, verAction, verPending] = useActionState(verifyCodeAction, INITIAL);
  // Champ e-mail NON contrôlé : la valeur vit dans le DOM (une frappe faite avant
  // l'hydratation n'est jamais écrasée). `lastEmail` ne sert qu'à `defaultValue`, pour que la
  // réinitialisation du formulaire après une action (React 19) restitue la saisie.
  const [lastEmail, setLastEmail] = useState(initialEmail);
  // L'état de demande auquel l'utilisateur a renoncé via « Changer d'adresse e-mail ».
  const [dismissed, setDismissed] = useState<LoginState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [resent, setResent] = useState(false);
  // Remonte la saisie du code après chaque réponse (erreur, nouvel envoi), jamais pendant l'attente.
  const [seen, setSeen] = useState<{ ver: LoginState; req: LoginState }>({
    ver: verState,
    req: reqState,
  });
  const [attempt, setAttempt] = useState(0);
  if (seen.ver !== verState || seen.req !== reqState) {
    setSeen({ ver: verState, req: reqState });
    setAttempt((a) => a + 1);
  }

  const inCode = reqState.step === 'code' && dismissed !== reqState;
  const resendAt = inCode ? reqState.resendAt : undefined;

  useEffect(() => {
    if (!resendAt) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [resendAt]);

  const remaining = resendAt
    ? Math.min(RESEND_SECONDS, Math.max(0, Math.ceil((resendAt - now) / 1000)))
    : 0;

  if (!inCode) {
    return (
      <>
        <h1 id="pt-auth-title" className="pt-heading">
          Connexion
        </h1>
        <p className="pt-helper">Saisissez l&apos;adresse e-mail avec laquelle vous avez été invité.</p>
        {notice ? (
          <p className="pt-status" role="status">
            {notice}
          </p>
        ) : null}
        <form
          action={reqAction}
          noValidate
          onSubmit={(e) => {
            const v = new FormData(e.currentTarget).get('email');
            if (typeof v === 'string') setLastEmail(v);
          }}
        >
          <input type="hidden" name="next" value={next ?? ''} />
          <div className="pt-field">
            <label className="pt-label" htmlFor="pt-email">
              Adresse e-mail
            </label>
            <input
              id="pt-email"
              className="pt-input"
              type="email"
              name="email"
              defaultValue={lastEmail}
              onChange={(e) => setLastEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              autoFocus
              required
              aria-invalid={reqState.error ? 'true' : undefined}
              aria-describedby="pt-email-error"
            />
          </div>
          <ErrorMessage id="pt-email-error" error={reqState.error} />
          <button type="submit" className="pt-btn-primary" disabled={reqPending}>
            {reqPending ? 'Envoi en cours...' : 'Recevoir mon code'}
          </button>
        </form>
      </>
    );
  }

  const codeEmail = reqState.email ?? lastEmail;
  const error = verState.step === 'code' ? verState.error : undefined;
  const canResend = remaining === 0 && !reqPending && !verPending;
  let announcement = '';
  if (remaining === 0) announcement = 'Vous pouvez renvoyer le code.';
  else if (resent) announcement = 'Un nouveau code a été envoyé.';

  return (
    <>
      <h1 id="pt-auth-title" className="pt-heading">
        Saisissez votre code
      </h1>
      <p className="pt-helper">
        {'Code envoyé à '}
        <span style={{ color: 'var(--ink)', fontWeight: 500, overflowWrap: 'anywhere' }}>
          {codeEmail}
        </span>
        {'. Il arrive en général en moins d’une minute. Pensez à vérifier vos courriers indésirables.'}
      </p>
      <form action={verAction}>
        <input type="hidden" name="next" value={next ?? ''} />
        <input type="hidden" name="email" value={codeEmail} />
        <OtpInput
          key={attempt}
          invalid={Boolean(error)}
          describedBy="pt-code-error"
          pending={verPending}
        />
        <ErrorMessage id="pt-code-error" error={error} />
        <button type="submit" className="pt-btn-primary" disabled={verPending}>
          {verPending ? 'Vérification...' : 'Se connecter'}
        </button>
        <button
          type="submit"
          className="pt-btn-text"
          formAction={reqAction}
          formNoValidate
          aria-disabled={canResend ? undefined : 'true'}
          onClick={(e) => {
            if (!canResend) e.preventDefault();
            else setResent(true);
          }}
        >
          <span aria-hidden="true">
            {remaining > 0 ? `Renvoyer le code (${remaining} s)` : 'Renvoyer le code'}
          </span>
          <span className="pt-sr-only">Renvoyer le code</span>
        </button>
        <p className="pt-sr-only" role="status" aria-live="polite">
          {announcement}
        </p>
        <button
          type="button"
          className="pt-btn-text"
          onClick={() => {
            setResent(false);
            setDismissed(reqState);
          }}
        >
          Changer d&apos;adresse e-mail
        </button>
      </form>
    </>
  );
}
