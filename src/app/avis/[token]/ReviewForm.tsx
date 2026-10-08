'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  composeDisplayName,
  REVIEW_BODY_MAX,
  REVIEW_BODY_MIN,
  REVIEW_FIELD_ERRORS,
  REVIEW_TITLE_MAX,
  reviewSubmissionSchema,
  type DisplayMode,
  type ReviewFieldCode,
} from '@/lib/reviews/schema';
import ReviewRatingInput from './ReviewRatingInput';
import ReviewThankYou from './ReviewThankYou';

interface ReviewFormProps {
  token: string;
  projectTitle: string;
  companyName: string;
  googleUrl: string | null;
}

type FieldKey = 'rating' | 'title' | 'body' | 'firstName' | 'lastInitial' | 'consent';

const CODE_TO_FIELD: Record<ReviewFieldCode, FieldKey> = {
  rating: 'rating',
  title_long: 'title',
  body_short: 'body',
  body_long: 'body',
  markup_or_link: 'body',
  first_name: 'firstName',
  initial: 'lastInitial',
  consent: 'consent',
};

const SERVER_ERROR =
  "Votre avis n'a pas pu être enregistré. Rien n'a été perdu : réessayez dans un instant, ou écrivez-nous à contact@sevalys.com.";
const RATE_LIMITED = 'Trop de tentatives. Patientez quelques minutes puis réessayez.';
const LINK_INVALID =
  "Ce lien n'est plus valide. Le lien a peut-être déjà été utilisé ou a expiré. Écrivez-nous à contact@sevalys.com et nous vous en renverrons un.";

// Seul chemin de succès : le contenu de la soumission est ignoré (D-10), aucune branche sur la note.
export function thankYouFor(_submission: { rating: number }, googleUrl: string | null) {
  return <ReviewThankYou googleUrl={googleUrl} />;
}

const isCode = (c: unknown): c is ReviewFieldCode =>
  typeof c === 'string' && Object.prototype.hasOwnProperty.call(REVIEW_FIELD_ERRORS, c);

export default function ReviewForm({ token, projectTitle, companyName, googleUrl }: ReviewFormProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [bodyBlurred, setBodyBlurred] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('first_company');
  const [firstName, setFirstName] = useState('');
  const [lastInitial, setLastInitial] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [summary, setSummary] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ rating: number } | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const bodyLen = body.trim().length;
  const missing = Math.max(0, REVIEW_BODY_MIN - bodyLen);
  const preview =
    displayMode === 'company_only' || firstName.trim()
      ? composeDisplayName(displayMode, firstName, lastInitial, companyName)
      : null;
  const counterStatus =
    bodyLen >= REVIEW_BODY_MAX ? 'Limite de 2 000 caractères atteinte.' : bodyLen >= REVIEW_BODY_MIN ? 'Minimum atteint.' : '';

  function fail(next: Partial<Record<FieldKey, string>>, message: string | null) {
    setErrors(next);
    setSummary(message);
    setSubmitting(false);
    setTimeout(() => summaryRef.current?.focus(), 0);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setSummary(null);

    const payload = {
      token,
      rating: rating ?? undefined,
      title: title.trim() || undefined,
      body,
      displayMode,
      firstName: displayMode === 'company_only' ? undefined : firstName,
      lastInitial: displayMode === 'first_initial' ? lastInitial : undefined,
      consent: consent ? true : undefined,
    };

    const parsed = reviewSubmissionSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Partial<Record<FieldKey, string>> = {};
      for (const issue of parsed.error.issues) {
        const code = issue.message;
        if (!isCode(code)) continue;
        const field = typeof issue.path[0] === 'string' && issue.path[0] in CODE_TO_FIELD_BY_PATH
          ? CODE_TO_FIELD_BY_PATH[issue.path[0]]
          : CODE_TO_FIELD[code];
        if (!next[field]) next[field] = REVIEW_FIELD_ERRORS[code];
      }
      fail(next, 'Certains champs sont à corriger avant de publier votre avis.');
      return;
    }

    try {
      const res = await fetch('/api/avis', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      if (res.status === 200) {
        setDone({ rating: parsed.data.rating });
        setSubmitting(false);
        return;
      }
      if (res.status === 410) return fail({}, LINK_INVALID);
      if (res.status === 429) return fail({}, RATE_LIMITED);
      if (res.status === 400) {
        const data = (await res.json().catch(() => null)) as { fields?: unknown } | null;
        const next: Partial<Record<FieldKey, string>> = {};
        for (const c of Array.isArray(data?.fields) ? data.fields : []) {
          if (isCode(c) && !next[CODE_TO_FIELD[c]]) next[CODE_TO_FIELD[c]] = REVIEW_FIELD_ERRORS[c];
        }
        return fail(next, Object.keys(next).length ? 'Certains champs sont à corriger avant de publier votre avis.' : SERVER_ERROR);
      }
      fail({}, SERVER_ERROR);
    } catch {
      fail({}, SERVER_ERROR);
    }
  }

  if (done) return thankYouFor(done, googleUrl);

  const err = (k: FieldKey) => (errors[k] ? { 'aria-invalid': true as const, 'aria-describedby': `rv-err-${k}` } : {});
  const errorLine = (k: FieldKey) =>
    errors[k] ? (
      <p id={`rv-err-${k}`} className="pt-error">
        {errors[k]}
      </p>
    ) : null;

  return (
    <form onSubmit={onSubmit} noValidate className="rv-form">
      <p className="pt-helper">Projet : {projectTitle}</p>

      <div
        ref={summaryRef}
        tabIndex={-1}
        role="alert"
        className={summary ? 'pt-error rv-summary' : 'rv-summary-empty'}
      >
        {summary}
      </div>

      <div className="pt-field">
        <span className="pt-label" id="rv-rating-label">
          Note (de 1 à 5)
        </span>
        <ReviewRatingInput
          value={rating}
          onChange={setRating}
          invalid={Boolean(errors.rating)}
          describedBy={errors.rating ? 'rv-err-rating' : undefined}
        />
        {errorLine('rating')}
      </div>

      <div className="pt-field">
        <label className="pt-label" htmlFor="rv-title">
          Titre
        </label>
        <input
          id="rv-title"
          className="pt-input"
          type="text"
          maxLength={REVIEW_TITLE_MAX}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-describedby={errors.title ? 'rv-err-title' : 'rv-help-title'}
          {...err('title')}
        />
        <p id="rv-help-title" className="pt-helper">
          Facultatif
        </p>
        {errorLine('title')}
      </div>

      <div className="pt-field">
        <label className="pt-label" htmlFor="rv-body">
          Votre avis
        </label>
        <textarea
          id="rv-body"
          className="pt-input rv-textarea"
          maxLength={REVIEW_BODY_MAX}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onBlur={() => setBodyBlurred(true)}
          aria-describedby={errors.body ? 'rv-err-body rv-help-body' : 'rv-help-body'}
          {...err('body')}
        />
        <p id="rv-help-body" className="pt-helper">
          20 caractères minimum. Les liens et le balisage ne sont pas acceptés.
        </p>
        <p className="pt-helper">
          {body.length} / {REVIEW_BODY_MAX}
          {!bodyBlurred && missing > 0 && bodyLen > 0 ? ` · Encore ${missing} caractères minimum` : ''}
        </p>
        <span className="pt-sr-only" role="status" aria-live="polite">
          {counterStatus}
        </span>
        {errorLine('body')}
      </div>

      <fieldset className="pt-field rv-fieldset">
        <legend className="pt-label">Affichage de votre nom</legend>
        {(
          [
            ['first_company', 'Prénom et société'],
            ['first_initial', "Prénom et initiale du nom"],
            ['company_only', 'Société seule'],
          ] as Array<[DisplayMode, string]>
        ).map(([mode, label]) => (
          <label key={mode} className="rv-choice">
            <input
              type="radio"
              name="displayMode"
              value={mode}
              checked={displayMode === mode}
              onChange={() => setDisplayMode(mode)}
            />
            <span>{label}</span>
          </label>
        ))}

        {displayMode !== 'company_only' ? (
          <div className="pt-field">
            <label className="pt-label" htmlFor="rv-first">
              Prénom
            </label>
            <input
              id="rv-first"
              className="pt-input"
              type="text"
              autoComplete="given-name"
              maxLength={40}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              {...err('firstName')}
            />
            {errorLine('firstName')}
          </div>
        ) : null}

        {displayMode === 'first_initial' ? (
          <div className="pt-field">
            <label className="pt-label" htmlFor="rv-initial">
              Initiale du nom
            </label>
            <input
              id="rv-initial"
              className="pt-input"
              type="text"
              maxLength={1}
              value={lastInitial}
              onChange={(e) => setLastInitial(e.target.value)}
              {...err('lastInitial')}
            />
            {errorLine('lastInitial')}
          </div>
        ) : null}

        {preview ? <p className="pt-helper rv-preview">Affiché publiquement : {preview}</p> : null}
      </fieldset>

      <div className="pt-field">
        <label className="rv-choice">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            {...err('consent')}
          />
          <span>
            J&apos;accepte que mon avis soit publié sur le site de Sèvalys, avec l&apos;affichage du
            nom choisi ci-dessus.
          </span>
        </label>
        {errorLine('consent')}
      </div>

      <p className="pt-helper">
        <Link href="/politique-des-avis" className="rv-link">
          Lire la politique des avis
        </Link>
      </p>

      <button type="submit" className="pt-btn-primary" disabled={submitting}>
        {submitting ? 'Publication en cours…' : 'Publier mon avis'}
      </button>
      <p className="pt-status" role="status">
        {submitting ? 'Publication en cours…' : ''}
      </p>
    </form>
  );
}

const CODE_TO_FIELD_BY_PATH: Record<string, FieldKey> = {
  rating: 'rating',
  title: 'title',
  body: 'body',
  firstName: 'firstName',
  lastInitial: 'lastInitial',
  consent: 'consent',
};
