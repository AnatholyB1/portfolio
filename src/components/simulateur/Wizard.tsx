'use client';
// The only place in Phase 7 where every pure module meets the DOM: step
// ordering, scoring, payload assembly, copy and CSS classes already exist
// and are tested elsewhere — this component is composition, not new logic.

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import {
  buildStepSequence,
  progressRatio,
  applicableQuestionIds,
} from '@/lib/simulateur/wizardSteps';
import { getQuestionById, type Answer } from '@/lib/simulateur/questions';
import { canSubmit, buildProspectPayload } from '@/lib/simulateur/submit';
import { computeRecommendedServices, computeVisualScore, scoreBand } from '@/lib/simulateur/scoring';
import { getServiceBySlug } from '@/data/services';
import ScoreGauge from '@/components/simulateur/ScoreGauge';
import { SIM_ICONS } from '@/components/simulateur/icons';

// Same off-screen technique as .sim-honeypot (globals.css), but WITHOUT
// aria-hidden — this text must be announced by assistive tech, so it
// cannot reuse the honeypot class itself (which is deliberately hidden
// from everyone, including screen readers).
const srOnlyStyle: CSSProperties = {
  position: 'absolute',
  left: -9999,
  width: 1,
  height: 1,
  overflow: 'hidden',
};

export default function Wizard() {
  const { t } = useLanguage();

  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  // Contact/consent/status/formRenderedAt state is declared here (rather
  // than lazily added in Task 2) because formRenderedAt must be captured
  // once at wizard mount regardless of which step is showing.
  const [contact, setContact] = useState({ nom: '', email: '', telephone: '' });
  // Unticked by default; this is SIMU-05 and must never be initialised to
  // `true` or bound to `defaultChecked`.
  const [consent, setConsent] = useState(false);
  // Mirrors ContactSection.tsx's status machine, minus its 'sent' state
  // because success here advances to the result step instead of showing a
  // confirmation in place.
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle');
  // Captured once at mount via the lazy initialiser, never at submit time,
  // never rendered into JSX — feeds the server's SPAM_MIN_ELAPSED_MS (2000ms)
  // timing check (07-RESEARCH.md Pitfall 3: avoids the hydration mismatch a
  // plain `Date.now()` call in the render body would cause).
  const [formRenderedAt] = useState(() => Date.now());
  // Uncontrolled on purpose (see the honeypot <input> below) — read via ref
  // at submit time so a bot-filled value actually reaches the payload.
  const honeypotRef = useRef<HTMLInputElement>(null);

  const steps = buildStepSequence(answers);

  // A visitor can go back and change `presence-en-ligne` from `datee` to
  // `inexistante`, which removes the `site-fiabilite` step and shortens
  // `steps` out from under a `stepIndex` that pointed past its end. Clamp
  // for render, and let the effect reconcile state so it never disagrees
  // with what's on screen.
  const clampedStepIndex = Math.min(stepIndex, steps.length - 1);
  useEffect(() => {
    if (clampedStepIndex !== stepIndex) {
      setStepIndex(clampedStepIndex);
    }
  }, [clampedStepIndex, stepIndex]);

  const step = steps[clampedStepIndex];

  // Curried setter matching calculateur-roi's shape. Because `steps` is
  // recomputed from `answers` on every render, changing the
  // `presence-en-ligne` answer to/from `inexistante` automatically inserts
  // or removes the `site-fiabilite` step — no separate skip handling here.
  const setAnswer = (questionId: string) => (value: string | string[]) =>
    setAnswers((prev) => [...prev.filter((a) => a.questionId !== questionId), { questionId, value }]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const payload = buildProspectPayload({
        contact,
        consent,
        answers,
        formRenderedAt,
        website: honeypotRef.current?.value ?? '',
      });
      const res = await fetch('/api/simulateur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      // The API deliberately answers { ok: true } for silently-rejected
      // spam too, so the visitor experience is identical either way by
      // design — this branch never distinguishes the two cases.
      if (body.ok === true) {
        setStatus('idle');
        const resultIndex = steps.findIndex((st) => st.kind === 'result');
        setStepIndex(resultIndex);
      } else {
        // body.error (one of the developer/log-only strings) is never
        // read, logged or rendered to the visitor.
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (!step) return null;

  // Progress bar (D-14), rendered above the current screen on question
  // steps AND on the contact step.
  const progressBar = (fillRatio: number) => (
    <div className="sim-progress-track">
      {/* Plain string concatenation, not a template literal — keeps the
          source free of "$" so it never collides with SIMU_PRICE_PATTERN's
          currency-symbol check in wizardContract.test.ts. */}
      <div className="sim-progress-fill" style={{ width: String(fillRatio * 100) + '%' }} />
    </div>
  );

  if (step.kind === 'question') {
    const question = getQuestionById(step.questionId);
    // Defensive, mirrors the `if (!svc) return null` guard in
    // src/app/services/[slug]/page.tsx.
    if (!question) return null;

    const stored = answers.find((a) => a.questionId === question.id);
    const applicableIds = applicableQuestionIds(answers);
    const currentNumber = applicableIds.indexOf(question.id) + 1;
    const totalCount = applicableIds.length;

    const hasAnswer =
      question.type === 'multi'
        ? Array.isArray(stored?.value) && stored.value.length > 0
        : typeof stored?.value === 'string' && stored.value.length > 0;

    const isLastBeforeContact = steps[clampedStepIndex + 1]?.kind === 'contact';
    // Plain string concatenation (see the progress-bar comment above).
    const headingId = 'sim-q-' + question.id;

    const toggleOption = (optionValue: string) => {
      if (question.type === 'multi') {
        const current = Array.isArray(stored?.value) ? stored.value : [];
        const next = current.includes(optionValue)
          ? current.filter((v) => v !== optionValue)
          : [...current, optionValue];
        setAnswer(question.id)(next);
      } else {
        setAnswer(question.id)(optionValue);
      }
    };

    const isSelected = (optionValue: string) =>
      question.type === 'multi'
        ? Array.isArray(stored?.value) && stored.value.includes(optionValue)
        : stored?.value === optionValue;

    const variant = question.variant ?? 'cards';
    // Untouched state parks the thumb at the midpoint rather than index 0. This matters
    // beyond cosmetics: a controlled range input's `onChange` only fires when the value
    // actually CHANGES. If the default sat on index 0 and the visitor's honest answer WAS
    // index 0, they could click/tap the already-correctly-positioned thumb, or press Home
    // on an already-leftmost slider, and no event would ever fire — no answer would ever be
    // recorded, and "Next" would stay disabled forever with no visible reason. Parking at
    // the midpoint means every one of the 4 stops requires an actual move to reach naturally
    // — but see the onPointerUp/onKeyUp commit below, which is the real fix: it commits
    // whatever value is currently showing on ANY interaction release, even a no-op one, so
    // clicking-without-moving still records an answer no matter which index that lands on.
    const rangeNeutralIndex = Math.floor((question.options.length - 1) / 2);
    const selectedRangeIndex = hasAnswer
      ? Math.max(0, question.options.findIndex((o) => o.value === stored?.value))
      : rangeNeutralIndex;
    // Before the visitor has interacted with the slider, `hasAnswer` is false even though a
    // range input always has SOME numeric value — showing that option's label as if selected
    // would misrepresent an untouched control as an answered one, for both sighted users and
    // screen readers (aria-valuetext). Show a neutral placeholder instead until there's a
    // real stored answer.
    const rangeCurrentLabel = hasAnswer
      ? t.simulateur.questions[question.id].options[question.options[selectedRangeIndex].value]
      : t.simulateur.rangePlaceholder;
    const commitRangeValue = (index: number) => setAnswer(question.id)(question.options[index].value);
    const rangeOptionIcon = question.options[selectedRangeIndex].icon;
    const RangeIcon = rangeOptionIcon ? SIM_ICONS[rangeOptionIcon] : null;

    return (
      <div className="sim-wizard">
        {progressBar(progressRatio(answers))}
        {/* sr-only text equivalent of the progress bar, built from t.simulateur.progressLabel */}
        <span style={srOnlyStyle}>
          {t.simulateur.progressLabel
            .replace('{current}', String(currentNumber))
            .replace('{total}', String(totalCount))}
        </span>
        <h2 className="sim-q-text" id={headingId}>
          {t.simulateur.questions[question.id].text}
        </h2>
        <p className="svc-body">{t.simulateur.questions[question.id].hint}</p>
        {variant === 'range' ? (
          <div className="sim-range-wrap">
            <p className="sim-range-value">
              {RangeIcon && <RangeIcon className="sim-option-icon" aria-hidden="true" />}
              {rangeCurrentLabel}
            </p>
            <input
              type="range"
              className="sim-range-input"
              min={0}
              max={question.options.length - 1}
              step={1}
              value={selectedRangeIndex}
              aria-labelledby={headingId}
              aria-valuetext={rangeCurrentLabel}
              // React normalizes onChange on <input> to fire on every native "input" event,
              // not just on blur/commit — this already gives the live drag feedback the
              // design spec asked for (it called for "onInput, not just onChange", written
              // with vanilla-DOM semantics in mind where the two differ; in React they don't).
              // onChange alone is NOT enough to guarantee an answer gets recorded, though:
              // if the visitor's very first interaction doesn't change the numeric value
              // (e.g. clicking the thumb without dragging it, or a keypress that's a no-op at
              // a boundary), onChange never fires at all. onPointerUp/onKeyUp commit whatever
              // value is currently showing on release, regardless of whether it changed, so
              // "I clicked where the thumb already was" still counts as a real answer.
              onChange={(e) => commitRangeValue(Number(e.target.value))}
              onPointerUp={(e) => commitRangeValue(Number(e.currentTarget.value))}
              onKeyUp={(e) => commitRangeValue(Number(e.currentTarget.value))}
            />
          </div>
        ) : variant === 'mood' ? (
          <div className="sim-mood-row" role="radiogroup" aria-labelledby={headingId}>
            {question.options.map((option) => {
              const selected = isSelected(option.value);
              const Icon = option.icon ? SIM_ICONS[option.icon] : null;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={'sim-mood-option' + (selected ? ' selected' : '')}
                  onClick={() => toggleOption(option.value)}
                >
                  {Icon && <Icon className="sim-mood-icon" aria-hidden="true" />}
                  <span>{t.simulateur.questions[question.id].options[option.value]}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div
            className="sim-options"
            role={question.type === 'multi' ? 'group' : 'radiogroup'}
            aria-labelledby={headingId}
          >
            {question.options.map((option) => {
              const selected = isSelected(option.value);
              const Icon = option.icon ? SIM_ICONS[option.icon] : null;
              return (
                <button
                  key={option.value}
                  type="button"
                  role={question.type === 'multi' ? 'checkbox' : 'radio'}
                  aria-checked={selected}
                  className={'sim-option' + (selected ? ' selected' : '')}
                  onClick={() => toggleOption(option.value)}
                >
                  {Icon && <Icon className="sim-option-icon" aria-hidden="true" />}
                  {t.simulateur.questions[question.id].options[option.value]}
                </button>
              );
            })}
          </div>
        )}
        <div className="sim-nav">
          {clampedStepIndex > 0 && (
            <button
              type="button"
              className="btn btn-ghost"
              // In-component state only — deliberately does not touch
              // browser history (07-RESEARCH.md Pitfall 5: the browser
              // Back button is a separate, accepted gap).
              onClick={() => setStepIndex(clampedStepIndex - 1)}
            >
              {t.simulateur.back}
            </button>
          )}
          {isLastBeforeContact ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!hasAnswer}
              onClick={() => setStepIndex(clampedStepIndex + 1)}
            >
              {t.simulateur.nextFinal}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!hasAnswer}
              onClick={() => setStepIndex(clampedStepIndex + 1)}
            >
              {t.simulateur.next}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (step.kind === 'contact') {
    const isSending = status === 'sending';
    const submitDisabled = isSending || !canSubmit({ contact, consent, answers });

    return (
      <div className="sim-wizard">
        {progressBar(1)}
        <h2 className="svc-h2">{t.simulateur.contact.heading}</h2>
        <p className="sim-contact-sub">{t.simulateur.contact.sub}</p>
        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label>{t.simulateur.contact.nomLabel}</label>
            <input
              type="text"
              required
              autoComplete="name"
              placeholder={t.simulateur.contact.nomPlaceholder}
              value={contact.nom}
              onChange={(e) => setContact({ ...contact, nom: e.target.value })}
            />
          </div>
          <div className="field">
            <label>{t.simulateur.contact.emailLabel}</label>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder={t.simulateur.contact.emailPlaceholder}
              value={contact.email}
              onChange={(e) => setContact({ ...contact, email: e.target.value })}
            />
          </div>
          <div className="field">
            <label>{t.simulateur.contact.telephoneLabel}</label>
            <input
              type="tel"
              required
              autoComplete="tel"
              placeholder={t.simulateur.contact.telephonePlaceholder}
              value={contact.telephone}
              onChange={(e) => setContact({ ...contact, telephone: e.target.value })}
            />
          </div>

          {/* Honeypot: uncontrolled, always empty for a legitimate visitor.
              Read via honeypotRef at submit time and forwarded verbatim to
              buildProspectPayload — the server's isSpamSubmission reads
              this field plus formRenderedAt; the wizard must not
              re-implement that check client-side, only relay the value. */}
          <input
            ref={honeypotRef}
            type="text"
            name="website"
            className="sim-honeypot"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            defaultValue=""
          />

          <label className="sim-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span className="sim-consent-label">{t.simulateur.contact.consentLabel}</span>
          </label>
          {/* Always-visible Art. 13 mentions — never collapsed, never inside
              <details> — must be visible at the moment consent is given. */}
          <div className="sim-rgpd">
            <span className="label">{t.simulateur.contact.rgpdHeading}</span>
            {t.simulateur.contact.rgpdMentions.map((mention) => (
              <div className="row" key={mention.k}>
                <span className="k">{mention.k}</span>
                <span>{mention.v}</span>
              </div>
            ))}
          </div>

          <div className="sim-nav">
            <button type="submit" className="btn btn-primary" disabled={submitDisabled}>
              {isSending ? t.simulateur.contact.submitting : t.simulateur.contact.submit}
            </button>
          </div>

          {status === 'error' && (
            <div className="sim-error">
              <h3>{t.simulateur.contact.errorHeading}</h3>
              <p>{t.simulateur.contact.errorBody}</p>
            </div>
          )}
        </form>
      </div>
    );
  }

  // step.kind === 'result'. Computed only here, never inside handleSubmit
  // (SIMU-03/T-07-17: the gauge score is purely visual, never sent to the
  // backend).
  const score = computeVisualScore(answers);
  const band = scoreBand(score);
  const recommended = computeRecommendedServices(answers);

  return (
    <div className="sim-wizard">
      <div className="sim-result">
        <h2 className="svc-h2">{t.simulateur.result.heading}</h2>
        <ScoreGauge
          score={score}
          caption={t.simulateur.result.gaugeCaption}
          framing={t.simulateur.result.framing[band]}
        />
        <h3 className="svc-h2">{t.simulateur.result.servicesHeading}</h3>
        <div className="sim-services">
          {recommended.map((slug) => {
            const svc = getServiceBySlug(slug);
            // Defensive, mirrors services/[slug]/page.tsx's `if (!svc) return null`.
            if (!svc) return null;
            const serviceCopy = t.services.pages.items[svc.index];
            return (
              <article className="sim-service-card" key={slug}>
                <h3>{serviceCopy.name}</h3>
                <p>{serviceCopy.tagline}</p>
              </article>
            );
          })}
        </div>
        <div className="sim-cta">
          <h3 className="svc-h2">{t.simulateur.result.ctaHeading}</h3>
          <p className="svc-body">{t.simulateur.result.ctaSub}</p>
          {/* Two channels for one action (SIMU-07) — both use btn-primary
              rather than a primary/secondary pair, which would read as two
              competing goals. */}
          <div className="sim-cta-row">
            <a className="btn btn-primary" href="tel:+33607184133">
              {t.simulateur.result.callLabel}
            </a>
            <a className="btn btn-primary" href="mailto:contact@sevalys.com">
              {t.simulateur.result.writeLabel}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
