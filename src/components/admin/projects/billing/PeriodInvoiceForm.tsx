'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { X } from 'lucide-react';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { formatEuros, toCents } from '@/lib/documents/money';
import { mulMilli, parseDaysToMilli } from '@/lib/documents/invoiceMath';
import type { BillingIssueResult, BillingPreviewResult, FieldErrors, PeriodInvoiceInput } from './types';

const COPY = PROJECT_COPY.payments.admin.period;
const MAX_LINES = 30;

type LineState = { key: string; designation: string; days: string; dailyRate: string };
type Msg = { kind: 'success' | 'warning' | 'error'; text: string };

type PeriodInvoiceFormProps = {
  projectId: string;
  paymentTermsDays: number;
  preview: (input: PeriodInvoiceInput) => Promise<BillingPreviewResult>;
  issue: (input: PeriodInvoiceInput) => Promise<BillingIssueResult>;
  onDone: () => void;
  onCancel: () => void;
};

function newLine(): LineState {
  return { key: crypto.randomUUID(), designation: '', days: '', dailyRate: '' };
}

function base64ToBlobUrl(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
}

function lineAmountCents(l: LineState): number | null {
  const milli = parseDaysToMilli(l.days);
  const rate = toCents(l.dailyRate);
  if (milli === null || rate === null) return null;
  try {
    return mulMilli(milli, rate);
  } catch {
    return null;
  }
}

export default function PeriodInvoiceForm({
  projectId,
  paymentTermsDays,
  preview,
  issue,
  onDone,
  onCancel,
}: PeriodInvoiceFormProps) {
  const uid = useId();
  const titleId = `${uid}-confirm-title`;
  const blockedId = `${uid}-blocked`;
  const [invoiceId] = useState(() => crypto.randomUUID());
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [lines, setLines] = useState<LineState[]>(() => [newLine()]);
  const [orderNumber, setOrderNumber] = useState('');
  const [dueDate, setDueDate] = useState('');
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

  const dirtyKey = JSON.stringify({ periodStart, periodEnd, lines, orderNumber, dueDate });

  function setUrl(next: string | null) {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = next;
    setPreviewUrl(next);
  }

  // Toute modification invalide l'aperçu (D-08).
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

  function updateLine(key: string, patch: Partial<LineState>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  const amounts = lines.map(lineAmountCents);
  const totalCents = amounts.reduce<number>((s, a) => s + (a ?? 0), 0);

  function buildInput(): PeriodInvoiceInput | null {
    const next: FieldErrors = {};
    if (periodStart === '') next.periodStart = 'Date de début requise.';
    if (periodEnd === '') next.periodEnd = 'Date de fin requise.';
    if (periodStart !== '' && periodEnd !== '' && periodEnd < periodStart) {
      next.periodEnd = 'La fin doit être postérieure ou égale au début.';
    }
    lines.forEach((l, i) => {
      if (l.designation.trim() === '') next[`lines.${i}.designation`] = 'Désignation requise.';
      if (parseDaysToMilli(l.days) === null) next[`lines.${i}.days`] = 'Jours par pas de 0,5 (0,5 minimum).';
      if (toCents(l.dailyRate) === null) next[`lines.${i}.dailyRate`] = 'Montant invalide (ex. 600 ou 600,50).';
    });
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return null;
    }
    setErrors({});
    return {
      projectId,
      periodStart,
      periodEnd,
      lines: lines.map((l) => ({ designation: l.designation, days: l.days, dailyRate: l.dailyRate })),
      ...(orderNumber.trim() !== '' ? { orderNumber: orderNumber.trim() } : {}),
      ...(dueDate !== '' ? { dueDate } : {}),
    };
  }

  function onPreview() {
    setMsg(null);
    const input = buildInput();
    if (!input) {
      setMsg({ kind: 'error', text: COPY.validationSummary });
      return;
    }
    setMode('preview');
    startTransition(async () => {
      try {
        const res = await preview({ ...input, invoiceId });
        if (res.ok) {
          setUrl(base64ToBlobUrl(res.pdfBase64));
          setPreviewKey(dirtyKey);
        } else {
          setMsg({ kind: 'error', text: res.message });
          if (res.fieldErrors) setErrors(res.fieldErrors);
        }
      } catch {
        setMsg({ kind: 'error', text: COPY.generic });
      } finally {
        setMode(null);
      }
    });
  }

  function onConfirm() {
    const input = buildInput();
    if (!input) {
      setConfirming(false);
      setMsg({ kind: 'error', text: COPY.validationSummary });
      return;
    }
    setMode('issue');
    startTransition(async () => {
      try {
        const res = await issue({ ...input, invoiceId });
        if (!res.ok) {
          setConfirming(false);
          setMsg({ kind: 'error', text: res.message });
          if (res.fieldErrors) setErrors(res.fieldErrors);
        } else {
          setConfirming(false);
          setMsg({ kind: res.tone, text: res.message });
          setUrl(null);
          setPreviewKey(null);
          onDone();
        }
        setTimeout(() => msgRef.current?.focus(), 0);
      } catch {
        setConfirming(false);
        setMsg({ kind: 'error', text: COPY.generic });
        setTimeout(() => msgRef.current?.focus(), 0);
      } finally {
        setMode(null);
      }
    });
  }

  function err(path: string) {
    return errors[path];
  }

  function fieldProps(path: string, id: string) {
    return {
      'aria-invalid': err(path) ? (true as const) : undefined,
      'aria-describedby': err(path) ? `${id}-err` : undefined,
    };
  }

  function fieldError(path: string, id: string) {
    return err(path) ? (
      <p className="pt-error" id={`${id}-err`}>
        {err(path)}
      </p>
    ) : null;
  }

  return (
    <div className="pt-lead-form pt-bill-form">
      <fieldset className="pt-bill-fieldset">
        <legend className="pt-lead-label">{COPY.covered}</legend>
        <div className="pt-bill-dates">
          <div>
            <label htmlFor={`${uid}-from`} className="pt-lead-label">
              {COPY.from}
            </label>
            <input
              id={`${uid}-from`}
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              {...fieldProps('periodStart', `${uid}-from`)}
            />
            {fieldError('periodStart', `${uid}-from`)}
          </div>
          <div>
            <label htmlFor={`${uid}-to`} className="pt-lead-label">
              {COPY.to}
            </label>
            <input
              id={`${uid}-to`}
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              {...fieldProps('periodEnd', `${uid}-to`)}
            />
            {fieldError('periodEnd', `${uid}-to`)}
          </div>
        </div>
        <p className="pt-helper">{COPY.helper}</p>
      </fieldset>

      {lines.map((l, i) => {
        const n = i + 1;
        const amount = amounts[i];
        const dId = `${uid}-l-${l.key}-d`;
        const jId = `${uid}-l-${l.key}-j`;
        const rId = `${uid}-l-${l.key}-r`;
        return (
          <fieldset key={l.key} className="pt-bill-fieldset">
            <legend className="pt-sr-only">{COPY.lineLegend(n)}</legend>
            <div className="pt-bill-line">
              <div>
                <label htmlFor={dId} className="pt-lead-label">
                  {COPY.label}
                </label>
                <input
                  id={dId}
                  type="text"
                  maxLength={200}
                  value={l.designation}
                  onChange={(e) => updateLine(l.key, { designation: e.target.value })}
                  {...fieldProps(`lines.${i}.designation`, dId)}
                />
                {fieldError(`lines.${i}.designation`, dId)}
              </div>
              <div>
                <label htmlFor={jId} className="pt-lead-label">
                  {COPY.days}
                </label>
                <input
                  id={jId}
                  type="text"
                  inputMode="decimal"
                  value={l.days}
                  onChange={(e) => updateLine(l.key, { days: e.target.value })}
                  {...fieldProps(`lines.${i}.days`, jId)}
                />
                {fieldError(`lines.${i}.days`, jId)}
              </div>
              <div>
                <label htmlFor={rId} className="pt-lead-label">
                  {COPY.rate}
                </label>
                <input
                  id={rId}
                  type="text"
                  inputMode="decimal"
                  value={l.dailyRate}
                  onChange={(e) => updateLine(l.key, { dailyRate: e.target.value })}
                  {...fieldProps(`lines.${i}.dailyRate`, rId)}
                />
                {fieldError(`lines.${i}.dailyRate`, rId)}
              </div>
              <div>
                <span className="pt-lead-label">{COPY.lineAmount}</span>
                <output className="pt-bill-amount">{amount !== null ? formatEuros(amount) : ''}</output>
              </div>
              <button
                type="button"
                className="pt-btn-text pt-bill-remove"
                aria-label={COPY.removeLine(n)}
                disabled={lines.length === 1}
                onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          </fieldset>
        );
      })}

      <div>
        <button
          type="button"
          className="pt-btn-ghost"
          disabled={lines.length >= MAX_LINES}
          onClick={() => setLines((prev) => (prev.length >= MAX_LINES ? prev : [...prev, newLine()]))}
        >
          {COPY.addLine}
        </button>
        {lines.length >= MAX_LINES ? <p className="pt-helper">{COPY.maxLines}</p> : null}
      </div>

      <fieldset className="pt-bill-fieldset">
        <legend className="pt-lead-label">{COPY.references}</legend>
        <div className="pt-bill-dates">
          <div>
            <label htmlFor={`${uid}-order`} className="pt-lead-label">
              {`${COPY.orderNumber} (${COPY.optional})`}
            </label>
            <input
              id={`${uid}-order`}
              type="text"
              maxLength={60}
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor={`${uid}-due`} className="pt-lead-label">
              {`${COPY.dueDate} (${COPY.optional})`}
            </label>
            <input
              id={`${uid}-due`}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              aria-describedby={`${uid}-due-help`}
            />
            <p className="pt-helper" id={`${uid}-due-help`}>
              {`Par défaut : ${paymentTermsDays} jours après l'émission.`}
            </p>
          </div>
        </div>
      </fieldset>

      <div className="pt-doc-totals pt-bill-totals">
        <span>{`${COPY.totalHt} ${formatEuros(totalCents)}`}</span>
        <span className="pt-helper">{COPY.vat}</span>
        <span>{`${COPY.totalTtc} ${formatEuros(totalCents)}`}</span>
      </div>

      {Object.keys(errors).length > 0 ? <p className="pt-error">{COPY.validationSummary}</p> : null}

      <div className="pt-doc-actions">
        <button type="button" className="pt-btn-ghost" onClick={onPreview} disabled={pending}>
          {COPY.preview}
        </button>
        <button
          type="button"
          className="pt-btn-primary"
          disabled={!previewCurrent || pending}
          aria-describedby={!previewCurrent ? blockedId : undefined}
          onClick={() => setConfirming(true)}
        >
          {COPY.issue}
        </button>
        <button type="button" className="pt-btn-text" onClick={onCancel} disabled={pending}>
          {COPY.cancel}
        </button>
      </div>
      {!previewCurrent ? (
        <p className="pt-helper" id={blockedId}>
          {"Lancez l'aperçu pour activer l'émission."}
        </p>
      ) : null}

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
          <p>{COPY.confirmBody}</p>
          <div className="pt-doc-actions">
            <button type="button" className="pt-btn-primary" onClick={onConfirm} disabled={pending}>
              {pending && mode === 'issue' ? COPY.issuing : COPY.confirm}
            </button>
            <button
              type="button"
              className="pt-btn-text"
              onClick={() => setConfirming(false)}
              disabled={pending}
            >
              {COPY.cancel}
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
          <p className="pt-warning">{COPY.previewBanner}</p>
          <iframe title="Aperçu de la facture" src={previewUrl} />
        </div>
      ) : null}
    </div>
  );
}
