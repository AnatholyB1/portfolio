'use client';

import { AlertCircle } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
import {
  requestCodeAction,
  verifyCodeAction,
  type LoginState,
} from '@/app/connexion/actions';
import { OTP_LENGTH } from '@/lib/auth/schemas';
import OtpInput from './OtpInput';

const INITIAL: LoginState = { step: 'email' };
const RESEND_SECONDS = 60;

interface LoginFormProps {
  next?: string;
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

export default function LoginForm({ next }: LoginFormProps) {
  const [reqState, reqAction, reqPending] = useActionState(requestCodeAction, INITIAL);
  const [verState, verAction, verPending] = useActionState(verifyCodeAction, INITIAL);
  const [email, setEmail] = useState('');
  // L'état de demande auquel l'utilisateur a renoncé via « Changer d'adresse e-mail ».
  const [dismissed, setDismissed] = useState<LoginState | null>(null);
  const [now, setNow] = useState(() => Date.now());

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
      <form action={reqAction} noValidate>
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
    );
  }

  const codeEmail = reqState.email ?? email;
  const error = verState.step === 'code' ? verState.error : undefined;

  return (
    <form action={verAction}>
      <input type="hidden" name="next" value={next ?? ''} />
      <input type="hidden" name="email" value={codeEmail} />
      <h2 className="pt-heading">Saisissez votre code</h2>
      <p className="pt-helper">
        {`Code à ${OTP_LENGTH} chiffres reçu par e-mail. Pensez à vérifier vos courriers indésirables.`}
      </p>
      <p className="pt-status">{reqState.message}</p>
      <div className="pt-field">
        <OtpInput key={`${verPending}-${verState.error ?? ''}`} invalid={Boolean(error)} describedBy="pt-code-error" />
      </div>
      <ErrorMessage id="pt-code-error" error={error} />
      <button type="submit" className="pt-btn-primary" disabled={verPending}>
        {verPending ? 'Vérification...' : 'Se connecter'}
      </button>
      <button
        type="submit"
        className="pt-btn-text"
        formAction={reqAction}
        formNoValidate
        disabled={remaining > 0 || reqPending || verPending}
      >
        {remaining > 0 ? `Renvoyer le code (${remaining} s)` : 'Renvoyer le code'}
      </button>
      <button type="button" className="pt-btn-text" onClick={() => setDismissed(reqState)}>
        Changer d&apos;adresse e-mail
      </button>
    </form>
  );
}
