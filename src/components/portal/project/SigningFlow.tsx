'use client';

import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from 'react';
import { Check, Download, ExternalLink, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type {
  PreviewLinkResult,
  ResumeResult,
  SendCodeResult,
  VerifyCodeActionResult,
} from '@/app/espace-client/documents/[id]/signer/actions';
import { DOC_LABELS, type DocType } from '@/lib/documents/types';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { CONSENT_TEXTS, CONSENT_VERSION } from '@/lib/signature/consentText';
import type { DownloadResult } from './types';
import './project.css';

const SIG = PROJECT_COPY.signature;
const OTP_LEN = 6;
const CONTACT_MAILTO = 'mailto:contact@sevalys.com';

export type SigningFlowProps = {
  documentId: string;
  docType: DocType;
  reference: string;
  sha256: string;
  signer: { matches: boolean; name: string | null; role: string | null; maskedEmail: string };
  codeState: { cooldownS: number; sendsLeft: number; activeCodeExpiresAt: string | null };
  consentRecorded: boolean;
  state: 'open' | 'pending_finalization' | 'signed';
  signedAt: string | null;
  sealSha256: string | null;
  /** 1 pour un PV : l'étape « Vérifier les critères » précède les trois étapes. */
  stepOffset?: 0 | 1;
  recap?: string;
  onEditAnswers?: () => void;
  signOutSlot?: ReactNode;
  previewLinkAction: (id: string) => Promise<PreviewLinkResult>;
  getDownloadUrl: (id: string) => Promise<DownloadResult>;
  sendCodeAction: (id: string, consent: { esign: boolean; evidence: boolean }) => Promise<SendCodeResult>;
  verifyCodeAction: (id: string, code: string) => Promise<VerifyCodeActionResult>;
  resumeFinalizationAction: (id: string) => Promise<ResumeResult>;
  sealedDocumentDownloadAction: (id: string) => Promise<DownloadResult>;
};

type Phase = 'consent' | 'code' | 'finalize' | 'signed';

const dateFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });

export default function SigningFlow(props: SigningFlowProps) {
  const {
    documentId,
    docType,
    reference,
    sha256,
    signer,
    stepOffset = 0,
  } = props;
  const texts = CONSENT_TEXTS[CONSENT_VERSION];
  const versionNumber = Number(CONSENT_VERSION.slice(1));
  const typeLabel = DOC_LABELS[docType];
  const typeInSentence = SIG.titles[docType as 'quote' | 'contract' | 'acceptance'].replace(/^Signer /, '');

  const initialPhase: Phase =
    props.state === 'signed'
      ? 'signed'
      : props.state === 'pending_finalization'
        ? 'finalize'
        : props.consentRecorded && props.codeState.activeCodeExpiresAt
          ? 'code'
          : 'consent';

  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [signedAt, setSignedAt] = useState<string | null>(props.signedAt);
  const [sealSha, setSealSha] = useState<string | null>(props.sealSha256);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [viewerError, setViewerError] = useState(false);
  const [esign, setEsign] = useState(false);
  const [evidence, setEvidence] = useState(false);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<string | null>(
    initialPhase === 'code' ? SIG.code.sent(signer.maskedEmail) : null,
  );
  const [error, setError] = useState<string | null>(
    initialPhase === 'finalize' ? SIG.code.finalizePending : null,
  );
  const [announce, setAnnounce] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(initialPhase === 'code' ? props.codeState.cooldownS : 0);
  const [sendsLeft, setSendsLeft] = useState(props.codeState.sendsLeft);
  const [codeDead, setCodeDead] = useState(false);
  const [pending, startTransition] = useTransition();
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const otpRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Lien d'aperçu : à l'ouverture et à chaque « Réessayer ».
  function loadPreview() {
    setViewerError(false);
    props
      .previewLinkAction(documentId)
      .then((res) => {
        if (res.ok) setPreviewUrl(res.url);
        else setViewerError(true);
      })
      .catch(() => setViewerError(true));
  }
  useEffect(() => {
    if (phase === 'signed') return;
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  // Décompte de renvoi : annoncé seulement au début (envoi) et à zéro.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => {
      setCooldown((c) => {
        if (c <= 1) setAnnounce(SIG.code.resend);
        return c - 1;
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (phase === 'code') otpRef.current?.focus();
    if (phase === 'signed') headingRef.current?.focus();
  }, [phase]);

  function onSend(e?: FormEvent) {
    e?.preventDefault();
    if (sending) return;
    if (phase === 'consent' && !(esign && evidence)) return;
    setError(null);
    setSending(true);
    setAnnounce(null);
    props
      .sendCodeAction(documentId, { esign: true, evidence: true })
      .then((res) => {
        if (res.ok) {
          setPhase('code');
          setStatus(SIG.code.sent(res.maskedEmail));
          setCooldown(res.cooldownS);
          setSendsLeft(res.sendsLeft);
          setCodeDead(false);
          setCode('');
          setTimeout(() => otpRef.current?.focus(), 0);
        } else {
          setError(res.message);
          if (res.retryAfterS) setCooldown(res.retryAfterS);
          if (res.message === SIG.code.hourlyCap) setSendsLeft(0);
        }
      })
      .catch(() => setError(SIG.code.sendFailed))
      .finally(() => setSending(false));
  }

  function applySigned(r: { signedAt: string; sealSha256: string | null }) {
    setSignedAt(r.signedAt);
    setSealSha(r.sealSha256);
    setError(null);
    setStatus(null);
    setPhase('signed');
  }

  function onVerify(e: FormEvent) {
    e.preventDefault();
    if (code.length !== OTP_LEN || codeDead) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await props.verifyCodeAction(documentId, code);
        if (res.ok) {
          applySigned(res);
          return;
        }
        setError(res.message);
        if (res.finalizePending) {
          setPhase('finalize');
          return;
        }
        if (res.needNewCode) setCodeDead(true);
        setCode('');
        otpRef.current?.focus();
      } catch {
        setError(SIG.code.signFailed);
      }
    });
  }

  function onResume() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await props.resumeFinalizationAction(documentId);
        if (res.ok) applySigned(res);
        else setError(res.message);
      } catch {
        setError(SIG.code.finalizePending);
      }
    });
  }

  async function onDownloadOriginal() {
    const res = await props.getDownloadUrl(documentId).catch(() => null);
    if (res && res.ok) window.location.assign(res.url);
    else setViewerError(true);
  }

  async function onDownloadSealed() {
    setDownloadError(null);
    setDownloading(true);
    try {
      const res = await props.sealedDocumentDownloadAction(documentId);
      if (res.ok) window.location.assign(res.url);
      else setDownloadError(SIG.success.downloadFailed);
    } catch {
      setDownloadError(SIG.success.downloadFailed);
    } finally {
      setDownloading(false);
    }
  }

  // ---------- État signé (A3) ----------
  if (phase === 'signed') {
    const when = signedAt ? new Date(signedAt) : null;
    return (
      <section className="pt-card pt-sign-success" aria-labelledby="sign-done-title">
        <div className="pt-sign-success-head">
          <ShieldCheck size={16} aria-hidden="true" />
          <h2 id="sign-done-title" className="pt-heading" ref={headingRef} tabIndex={-1}>
            {SIG.success.heading}
          </h2>
        </div>
        {when ? <p>{SIG.success.body(dateFmt.format(when), timeFmt.format(when))}</p> : null}
        <ul className="pt-sign-meta">
          <li>{SIG.success.reference(reference)}</li>
          {sealSha ? <li className="pt-sign-mono">{SIG.success.sealedHash(sealSha.slice(0, 12))}</li> : null}
        </ul>
        <p className="pt-helper">{SIG.success.emailSent}</p>
        <div className="pt-sign-actions">
          <button type="button" className="pt-btn-ghost pt-file-action" onClick={onDownloadSealed} disabled={downloading}>
            <Download size={16} aria-hidden="true" />
            {downloading ? SIG.success.preparing : SIG.success.download}
          </button>
          <Link href="/espace-client/documents" className="pt-btn-text pt-file-action">
            {SIG.back}
          </Link>
        </div>
        <p className="pt-error" aria-live="polite">
          {downloadError}
        </p>
      </section>
    );
  }

  const stepLabels = stepOffset === 1 ? SIG.steps.four : SIG.steps.three;
  const consentIdx = stepOffset + 1;
  const codeIdx = stepOffset + 2;
  const currentIdx = phase === 'consent' ? consentIdx : codeIdx;
  const consentsOk = esign && evidence;
  const canEdit = phase === 'consent' && !!props.onEditAnswers;
  const shownHash = sha256.slice(0, 12);

  return (
    <div className="pt-sign">
      <ol className="pt-sign-steps" aria-label={SIG.stepsLabel}>
        {stepLabels.map((label, i) => (
          <li key={label} aria-current={i === currentIdx ? 'step' : undefined} data-done={i < currentIdx ? 'true' : undefined}>
            {i < currentIdx ? <Check size={14} aria-hidden="true" /> : null}
            {label}
          </li>
        ))}
      </ol>

      {props.recap ? (
        <div className="pt-sign-recap">
          <p className="pt-helper">{props.recap}</p>
          {canEdit ? (
            <button type="button" className="pt-btn-text" onClick={props.onEditAnswers}>
              {PROJECT_COPY.signature.checklist.editAnswers}
            </button>
          ) : null}
        </div>
      ) : null}

      <section className="pt-card pt-sign-read" aria-labelledby="sign-read-title">
        <h2 id="sign-read-title" className="pt-sign-legend">
          {SIG.read.legend}
        </h2>
        {previewUrl && !viewerError ? (
          <iframe className="pt-sign-frame" title={SIG.read.iframeTitle(typeLabel)} src={previewUrl} />
        ) : (
          <div className="pt-sign-frame pt-sign-frame-empty" />
        )}
        <div className="pt-sign-actions">
          {previewUrl ? (
            <a className="pt-btn-text pt-file-action" href={previewUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={16} aria-hidden="true" />
              {SIG.read.openNewTab}
            </a>
          ) : (
            <button type="button" className="pt-btn-text pt-file-action" disabled>
              <ExternalLink size={16} aria-hidden="true" />
              {SIG.read.openNewTab}
            </button>
          )}
          <button type="button" className="pt-btn-text pt-file-action" onClick={onDownloadOriginal}>
            <Download size={16} aria-hidden="true" />
            {SIG.read.download}
          </button>
        </div>
        <p className="pt-helper">{SIG.read.mobileNote}</p>
        <p className="pt-sign-mono pt-sign-meta-line">{SIG.read.reference(reference, shownHash)}</p>
        <div aria-live="polite">
          {viewerError ? (
            <>
              <p className="pt-error">{SIG.read.viewerError}</p>
              <button type="button" className="pt-btn-ghost" onClick={loadPreview}>
                {SIG.read.retry}
              </button>
            </>
          ) : null}
        </div>
      </section>

      {!signer.matches ? (
        <section className="pt-card pt-sign-mismatch" aria-labelledby="sign-mismatch-title">
          <h2 id="sign-mismatch-title">{SIG.mismatch.title}</h2>
          <p className="pt-helper">{SIG.mismatch.body(signer.name ?? '')}</p>
          <div className="pt-sign-actions">
            {props.signOutSlot}
            <a className="pt-btn-text" href={CONTACT_MAILTO}>
              {SIG.mismatch.write}
            </a>
          </div>
        </section>
      ) : phase === 'finalize' ? (
        <section className="pt-card" aria-labelledby="sign-finalize-title">
          <h2 id="sign-finalize-title" className="pt-sign-legend">
            {SIG.code.finalizeAction}
          </h2>
          <div aria-live="polite">{error ? <p className="pt-error">{error}</p> : null}</div>
          <div className="pt-sign-actions">
            <button type="button" className="pt-btn-primary" onClick={onResume} disabled={pending}>
              {SIG.code.finalizeAction}
            </button>
          </div>
        </section>
      ) : (
        <>
          <form className="pt-card pt-sign-consent-block" onSubmit={onSend} aria-labelledby="sign-consent-title">
            <fieldset className="pt-sign-fieldset" disabled={phase === 'code'}>
              <legend id="sign-consent-title" className="pt-sign-legend">
                {SIG.consent.legend}
              </legend>
              <p className="pt-sign-meta-line">
                {signer.name
                  ? signer.role
                    ? SIG.consent.signer(signer.name, signer.role)
                    : SIG.consent.signerNoRole(signer.name)
                  : null}
              </p>
              <p className="pt-sign-meta-line">{SIG.consent.codeTarget(signer.maskedEmail)}</p>
              {phase === 'code' ? (
                <p className="pt-sign-meta-line">
                  <Check size={14} aria-hidden="true" /> {SIG.consent.recap}
                </p>
              ) : (
                <>
                  <label className="pt-sign-consent">
                    <input type="checkbox" checked={esign} onChange={(e) => setEsign(e.target.checked)} />
                    <span>
                      {texts.esign}
                      <span className="pt-sign-version">{SIG.consent.textVersion(versionNumber)}</span>
                    </span>
                  </label>
                  <label className="pt-sign-consent">
                    <input type="checkbox" checked={evidence} onChange={(e) => setEvidence(e.target.checked)} />
                    <span>
                      {texts.evidence}
                      <span className="pt-sign-version">{SIG.consent.textVersion(versionNumber)}</span>
                    </span>
                  </label>
                </>
              )}
            </fieldset>
            {phase === 'consent' ? (
              <div className="pt-sign-bar">
                <p id="sign-consent-helper" className="pt-helper">
                  {SIG.consent.helper}
                </p>
                <button
                  type="submit"
                  className="pt-btn-primary"
                  disabled={!consentsOk || sending}
                  aria-describedby="sign-consent-helper"
                >
                  {sending ? SIG.consent.sendingCode : SIG.consent.receiveCode}
                </button>
              </div>
            ) : null}
          </form>

          {phase === 'code' ? (
            <form className="pt-card pt-sign-code-block" onSubmit={onVerify}>
              <div className="pt-field">
                <label className="pt-label" htmlFor="sign-otp">
                  {SIG.code.label}
                </label>
                <input
                  id="sign-otp"
                  ref={otpRef}
                  className="pt-sign-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={OTP_LEN}
                  pattern="[0-9]*"
                  value={code}
                  disabled={codeDead || pending}
                  aria-invalid={error && !codeDead ? 'true' : undefined}
                  aria-describedby="sign-code-messages"
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, OTP_LEN))}
                />
              </div>
              <div id="sign-code-messages" aria-live="polite">
                {status && !error ? <p className="pt-status">{status}</p> : null}
                {error ? <p className="pt-error">{error}</p> : null}
              </div>
              <p className="pt-sr-only" aria-live="polite">
                {announce}
              </p>
              <div className="pt-sign-bar">
                <p className="pt-helper">{SIG.code.beforeSign(typeInSentence)}</p>
                <button type="submit" className="pt-btn-primary" disabled={code.length !== OTP_LEN || codeDead || pending}>
                  {pending ? SIG.code.signing : SIG.code.sign}
                </button>
              </div>
              <div className="pt-sign-actions">
                {codeDead ? (
                  <button
                    type="button"
                    className="pt-btn-ghost"
                    onClick={() => onSend()}
                    disabled={cooldown > 0 || sendsLeft <= 0 || sending}
                  >
                    {SIG.code.newCode}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="pt-btn-text"
                  onClick={() => onSend()}
                  disabled={cooldown > 0 || sendsLeft <= 0 || sending}
                >
                  {cooldown > 0 ? SIG.code.resendIn(cooldown) : SIG.code.resend}
                </button>
              </div>
              {sendsLeft <= 0 ? <p className="pt-helper">{SIG.code.hourlyCap}</p> : null}
            </form>
          ) : (
            <div aria-live="polite">{error ? <p className="pt-error">{error}</p> : null}</div>
          )}
        </>
      )}
    </div>
  );
}
