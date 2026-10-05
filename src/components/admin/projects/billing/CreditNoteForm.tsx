'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { formatEuros, toCents } from '@/lib/documents/money';
import type { BillingIssueResult, BillingPreviewResult, CreditNoteInput, FieldErrors } from './types';

const COPY = PROJECT_COPY.payments.admin.credit;
const PERIOD = PROJECT_COPY.payments.admin.period;
const STRIPE_REFUND_FEE_CENTS = 50;
const MAX_REASON = 1000;

type Msg = { kind: 'success' | 'warning' | 'error'; text: string };

type CreditNoteFormProps = {
  origin: {
    id: string;
    number: string;
    totalInclTaxCents: number;
    creditedCents: number;
    creditMaxCents: number;
    refundEligible: boolean;
    paid: boolean;
  };
  preview: (input: CreditNoteInput) => Promise<BillingPreviewResult>;
  issue: (input: CreditNoteInput) => Promise<BillingIssueResult>;
  onDone: () => void;
  onCancel: () => void;
};

function base64ToBlobUrl(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
}

export default function CreditNoteForm({ origin, preview, issue, onDone, onCancel }: CreditNoteFormProps) {
  const uid = useId();
  const titleId = `${uid}-confirm-title`;
  const [creditNoteId] = useState(() => crypto.randomUUID());
  const [scope, setScope] = useState<'total' | 'partial'>('total');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [refundRequested, setRefundRequested] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [mode, setMode] = useState<'preview' | 'issue' | null>(null);
  const [pending, startTransition] = useTransition();
  const urlRef = useRef<string | null>(null);
  const titleRef = useRef<HTMLParagraphElement>(null);
  const msgRef = useRef<HTMLParagraphElement>(null);

  const refundActive = origin.refundEligible && refundRequested;
  const dirtyKey = JSON.stringify({ scope, amount, reason, refundActive });
  const reasonValid = reason.trim().length >= 3 && reason.length <= MAX_REASON;

  function setUrl(next: string | null) {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = next;
    setPreviewUrl(next);
  }

  useEffect(() => {
    if (urlRef.current && previewKey !== null && previewKey !== dirtyKey) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
      setPreviewUrl(null);
      setConfirming(false);
    }
  }, [dirtyKey, previewKey]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (confirming) titleRef.current?.focus();
  }, [confirming]);

  const previewCurrent = previewUrl !== null && previewKey === dirtyKey;

  const partialCents = scope === 'partial' ? toCents(amount) : origin.creditMaxCents;
  const creditedAmountCents = partialCents ?? 0;

  function buildInput(): CreditNoteInput | null {
    const next: FieldErrors = {};
    if (scope === 'partial') {
      const cents = toCents(amount);
      if (cents === null || cents < 1 || cents > origin.creditMaxCents) {
        next.amount = COPY.amountRange(formatEuros(1), formatEuros(origin.creditMaxCents));
      }
    }
    if (!reasonValid) next.reason = 'Motif requis (3 à 1000 caractères).';
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return null;
    }
    setErrors({});
    return {
      originInvoiceId: origin.id,
      scope,
      ...(scope === 'partial' ? { amount } : {}),
      reason,
      refundRequested: refundActive,
    };
  }

  function onPreview() {
    setMsg(null);
    const input = buildInput();
    if (!input) {
      setMsg({ kind: 'error', text: PERIOD.validationSummary });
      return;
    }
    setMode('preview');
    startTransition(async () => {
      try {
        const res = await preview({ ...input, creditNoteId });
        if (res.ok) {
          setUrl(base64ToBlobUrl(res.pdfBase64));
          setPreviewKey(dirtyKey);
        } else {
          setMsg({ kind: 'error', text: res.message });
          if (res.fieldErrors) setErrors(res.fieldErrors);
        }
      } catch {
        setMsg({ kind: 'error', text: COPY.error });
      } finally {
        setMode(null);
      }
    });
  }

  function onConfirm() {
    const input = buildInput();
    if (!input) {
      setConfirming(false);
      setMsg({ kind: 'error', text: PERIOD.validationSummary });
      return;
    }
    setMode('issue');
    startTransition(async () => {
      try {
        const res = await issue({ ...input, creditNoteId });
        setConfirming(false);
        if (!res.ok) {
          setMsg({ kind: 'error', text: res.message });
          if (res.fieldErrors) setErrors(res.fieldErrors);
        } else {
          setMsg({ kind: res.tone, text: res.message });
          setUrl(null);
          setPreviewKey(null);
          onDone();
        }
        setTimeout(() => msgRef.current?.focus(), 0);
      } catch {
        setConfirming(false);
        setMsg({ kind: 'error', text: COPY.error });
        setTimeout(() => msgRef.current?.focus(), 0);
      } finally {
        setMode(null);
      }
    });
  }

  const amountErr = errors.amount;
  const reasonErr = errors.reason;
  const amountId = `${uid}-amount`;
  const reasonId = `${uid}-reason`;

  return (
    <div className="pt-lead-form pt-bill-form">
      <h3 className="pt-bill-heading">{COPY.heading(origin.number)}</h3>
      <p className="pt-helper">
        {COPY.recap(
          formatEuros(origin.totalInclTaxCents),
          formatEuros(origin.creditedCents),
          formatEuros(origin.creditMaxCents),
        )}
      </p>

      <fieldset className="pt-bill-fieldset">
        <legend className="pt-sr-only">{COPY.heading(origin.number)}</legend>
        <label className="pt-bill-check">
          <input
            type="radio"
            name={`${uid}-scope`}
            checked={scope === 'total'}
            onChange={() => setScope('total')}
          />
          <span>{COPY.total}</span>
        </label>
        <label className="pt-bill-check">
          <input
            type="radio"
            name={`${uid}-scope`}
            checked={scope === 'partial'}
            onChange={() => setScope('partial')}
          />
          <span>{COPY.partial}</span>
        </label>
        {scope === 'total' ? (
          <output className="pt-bill-amount">{formatEuros(origin.creditMaxCents)}</output>
        ) : (
          <div>
            <label htmlFor={amountId} className="pt-lead-label">
              {COPY.amountLabel}
            </label>
            <input
              id={amountId}
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={amountErr ? true : undefined}
              aria-describedby={amountErr ? `${amountId}-err` : undefined}
            />
            {amountErr ? (
              <p className="pt-error" id={`${amountId}-err`}>
                {amountErr}
              </p>
            ) : null}
          </div>
        )}
      </fieldset>

      <div>
        <label htmlFor={reasonId} className="pt-lead-label">
          {COPY.motif}
        </label>
        <textarea
          id={reasonId}
          rows={3}
          maxLength={MAX_REASON}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-invalid={reasonErr ? true : undefined}
          aria-describedby={reasonErr ? `${reasonId}-err ${reasonId}-help` : `${reasonId}-help`}
        />
        <p className="pt-helper pt-bill-counter" id={`${reasonId}-help`}>
          {`${COPY.motifHelper} ${COPY.counter(reason.length)}`}
        </p>
        {reasonErr ? (
          <p className="pt-error" id={`${reasonId}-err`}>
            {reasonErr}
          </p>
        ) : null}
      </div>

      {origin.refundEligible ? (
        <div>
          <label className="pt-bill-check">
            <input
              type="checkbox"
              checked={refundRequested}
              onChange={(e) => setRefundRequested(e.target.checked)}
              aria-describedby={`${uid}-refund-help`}
            />
            <span>{COPY.refundLabel}</span>
          </label>
          <p className="pt-helper" id={`${uid}-refund-help`}>
            {COPY.refundHelper(formatEuros(STRIPE_REFUND_FEE_CENTS))}
          </p>
        </div>
      ) : !origin.paid ? (
        <p className="pt-helper">{COPY.unpaidHelper}</p>
      ) : null}

      {Object.keys(errors).length > 0 ? <p className="pt-error">{PERIOD.validationSummary}</p> : null}

      <div className="pt-doc-actions">
        <button type="button" className="pt-btn-ghost" onClick={onPreview} disabled={pending}>
          {pending && mode === 'preview' ? PERIOD.issuing : COPY.preview}
        </button>
        <button
          type="button"
          className="pt-btn-primary"
          disabled={!reasonValid || !previewCurrent || pending}
          onClick={() => setConfirming(true)}
        >
          {COPY.issue}
        </button>
        <button type="button" className="pt-btn-text" onClick={onCancel} disabled={pending}>
          {PERIOD.cancel}
        </button>
      </div>

      {confirming ? (
        <div
          className="pt-doc-confirm"
          role="group"
          aria-labelledby={titleId}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setConfirming(false);
          }}
        >
          <p id={titleId} ref={titleRef} tabIndex={-1}>
            <strong>{COPY.confirmTitle}</strong>
          </p>
          <p>
            {[
              COPY.confirmBodyBase,
              refundActive ? COPY.confirmRefund(formatEuros(creditedAmountCents)) : COPY.confirmNoRefund,
              !origin.paid ? COPY.confirmSessionExpired : null,
              COPY.confirmNotify,
            ]
              .filter((s): s is string => s !== null)
              .join(' ')}
          </p>
          <div className="pt-doc-actions">
            <button type="button" className="pt-btn-primary" onClick={onConfirm} disabled={pending}>
              {pending && mode === 'issue' ? PERIOD.issuing : COPY.confirm}
            </button>
            <button
              type="button"
              className="pt-btn-text"
              onClick={() => setConfirming(false)}
              disabled={pending}
            >
              {PERIOD.cancel}
            </button>
          </div>
        </div>
      ) : null}

      <div aria-live="polite">
        {msg ? (
          <p
            ref={msgRef}
            tabIndex={-1}
            className={
              msg.kind === 'success' ? 'pt-success' : msg.kind === 'warning' ? 'pt-warning' : 'pt-error'
            }
          >
            {msg.text}
          </p>
        ) : null}
      </div>

      {previewUrl ? (
        <div className="pt-doc-preview">
          <p className="pt-warning">{PERIOD.previewBanner}</p>
          <iframe title="Aperçu de l'avoir" src={previewUrl} />
        </div>
      ) : null}
    </div>
  );
}
