'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { QUOTE_FORM_LABELS } from '@/lib/documents/types';
import { quoteInputSchema, type DocumentInput } from '@/lib/documents/schemas';
import { formatEuros, formatPercent, lineTotalCents, quoteTotals, toCents } from '@/lib/documents/money';
import type { DocumentActions, FieldErrors } from './types';
import PreviewIssuePanel from './PreviewIssuePanel';

const COPY = PROJECT_COPY.documents.admin;
const MAX_LINES = 30;

type BaseFormProps = {
  projectId: string;
  replacingRevision: number | null;
  canIssue: boolean;
  blockedReason?: string;
  actions: Pick<DocumentActions, 'preview' | 'issue'>;
  onIssued?: () => void;
};

type LineState = { key: string; designation: string; quantity: string; unitPrice: string };

function newLine(): LineState {
  return { key: crypto.randomUUID(), designation: '', quantity: '1', unitPrice: '' };
}

function parseQty(s: string): number | null {
  return /^\d+$/.test(s.trim()) ? Number.parseInt(s.trim(), 10) : null;
}

function parsePercent(s: string): number | null {
  return /^\d+$/.test(s.trim()) ? Number.parseInt(s.trim(), 10) : null;
}

export default function QuoteForm({
  projectId,
  replacingRevision,
  canIssue,
  blockedReason,
  actions,
  onIssued,
}: BaseFormProps) {
  const [lines, setLines] = useState<LineState[]>(() => [newLine()]);
  const [depositPercent, setDepositPercent] = useState('30');
  const [validityDays, setValidityDays] = useState('30');
  const [leadTime, setLeadTime] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  function updateLine(key: string, patch: Partial<LineState>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  const parsed = lines.map((l) => ({
    quantity: parseQty(l.quantity),
    unitPriceCents: toCents(l.unitPrice),
  }));
  const complete = parsed.filter(
    (p): p is { quantity: number; unitPriceCents: number } =>
      p.quantity !== null && p.quantity >= 1 && p.unitPriceCents !== null,
  );
  const pct = parsePercent(depositPercent);
  let totals: { totalCents: number; depositCents: number; balanceCents: number } | null = null;
  try {
    totals = quoteTotals(complete, pct !== null && pct <= 100 ? pct : 0);
  } catch {
    totals = null;
  }

  function buildInput(): DocumentInput | null {
    const next: FieldErrors = {};
    const outLines: { designation: string; quantity: number; unitPriceCents: number }[] = [];
    lines.forEach((l, i) => {
      const qty = parseQty(l.quantity);
      const cents = toCents(l.unitPrice);
      if (l.designation.trim() === '') next[`lines.${i}.designation`] = 'Désignation requise.';
      if (qty === null || qty < 1) next[`lines.${i}.quantity`] = 'Quantité entière, 1 minimum.';
      if (cents === null) next[`lines.${i}.unitPriceCents`] = 'Montant invalide (ex. 1200 ou 1200,50).';
      if (l.designation.trim() !== '' && qty !== null && qty >= 1 && cents !== null) {
        outLines.push({ designation: l.designation, quantity: qty, unitPriceCents: cents });
      }
    });
    const pctValue = parsePercent(depositPercent);
    if (pctValue === null || pctValue > 100) next.depositPercent = 'Pourcentage entre 0 et 100.';
    const days = parsePercent(validityDays);
    if (days === null || days < 1 || days > 365) next.validityDays = 'Entre 1 et 365 jours.';
    if (leadTime.trim() === '') next.leadTime = 'Délai requis.';
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return null;
    }
    const input = {
      docType: 'quote' as const,
      projectId,
      documentId: '',
      lines: outLines,
      depositPercent: pctValue as number,
      validityDays: days as number,
      leadTime,
    };
    // Validation d'affichage uniquement : le serveur valide à nouveau.
    const check = quoteInputSchema.safeParse({
      ...input,
      documentId: crypto.randomUUID(),
    });
    if (!check.success) {
      const display: FieldErrors = {};
      for (const issue of check.error.issues) display[issue.path.join('.')] = issue.message;
      setErrors(display);
      return null;
    }
    setErrors({});
    return input as DocumentInput;
  }

  const dirtyKey = JSON.stringify({ lines, depositPercent, validityDays, leadTime });

  function err(path: string) {
    return errors[path];
  }

  return (
    <div className="pt-lead-form">
      {lines.map((l, i) => {
        const n = i + 1;
        const p = parsed[i];
        const amount =
          p.quantity !== null && p.unitPriceCents !== null
            ? (() => {
                try {
                  return formatEuros(lineTotalCents(p.quantity, p.unitPriceCents));
                } catch {
                  return '';
                }
              })()
            : '';
        const dId = `ql-${l.key}-d`;
        const qId = `ql-${l.key}-q`;
        const uId = `ql-${l.key}-u`;
        const dErr = err(`lines.${i}.designation`);
        const qErr = err(`lines.${i}.quantity`);
        const uErr = err(`lines.${i}.unitPriceCents`);
        return (
          <fieldset key={l.key} style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="pt-sr-only">{`Ligne ${n}`}</legend>
            <div className="pt-doc-lines">
              <div>
                <label htmlFor={dId} className="pt-lead-label">
                  {QUOTE_FORM_LABELS.designation}
                </label>
                <input
                  id={dId}
                  type="text"
                  maxLength={200}
                  value={l.designation}
                  onChange={(e) => updateLine(l.key, { designation: e.target.value })}
                  aria-invalid={dErr ? true : undefined}
                  aria-describedby={dErr ? `${dId}-err` : undefined}
                />
                {dErr ? (
                  <p className="pt-error" id={`${dId}-err`}>
                    {dErr}
                  </p>
                ) : null}
              </div>
              <div>
                <label htmlFor={qId} className="pt-lead-label">
                  {QUOTE_FORM_LABELS.quantity}
                </label>
                <input
                  id={qId}
                  type="text"
                  inputMode="numeric"
                  value={l.quantity}
                  onChange={(e) => updateLine(l.key, { quantity: e.target.value })}
                  aria-invalid={qErr ? true : undefined}
                  aria-describedby={qErr ? `${qId}-err` : undefined}
                />
                {qErr ? (
                  <p className="pt-error" id={`${qId}-err`}>
                    {qErr}
                  </p>
                ) : null}
              </div>
              <div>
                <label htmlFor={uId} className="pt-lead-label">
                  {QUOTE_FORM_LABELS.unitPrice}
                </label>
                <input
                  id={uId}
                  type="text"
                  inputMode="decimal"
                  value={l.unitPrice}
                  onChange={(e) => updateLine(l.key, { unitPrice: e.target.value })}
                  aria-invalid={uErr ? true : undefined}
                  aria-describedby={uErr ? `${uId}-err` : undefined}
                />
                {uErr ? (
                  <p className="pt-error" id={`${uId}-err`}>
                    {uErr}
                  </p>
                ) : null}
              </div>
              <div>
                <span className="pt-lead-label">{QUOTE_FORM_LABELS.amount}</span>
                <output style={{ display: 'block', fontVariantNumeric: 'tabular-nums' }}>{amount}</output>
              </div>
              <button
                type="button"
                className="pt-btn-text"
                style={{ minWidth: 44, minHeight: 44 }}
                aria-label={`Supprimer la ligne ${n}`}
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
          Ajouter une ligne
        </button>
        {lines.length >= MAX_LINES ? <p className="pt-helper">30 lignes maximum</p> : null}
      </div>

      <div>
        <label htmlFor="ql-deposit" className="pt-lead-label">
          {QUOTE_FORM_LABELS.deposit} (%)
        </label>
        <input
          id="ql-deposit"
          type="text"
          inputMode="numeric"
          value={depositPercent}
          onChange={(e) => setDepositPercent(e.target.value)}
          aria-invalid={err('depositPercent') ? true : undefined}
          aria-describedby={err('depositPercent') ? 'ql-deposit-err' : undefined}
        />
        {err('depositPercent') ? (
          <p className="pt-error" id="ql-deposit-err">
            {err('depositPercent')}
          </p>
        ) : null}
      </div>
      <div>
        <label htmlFor="ql-validity" className="pt-lead-label">
          {QUOTE_FORM_LABELS.validity}
        </label>
        <input
          id="ql-validity"
          type="text"
          inputMode="numeric"
          value={validityDays}
          onChange={(e) => setValidityDays(e.target.value)}
          aria-invalid={err('validityDays') ? true : undefined}
          aria-describedby={err('validityDays') ? 'ql-validity-err' : undefined}
        />
        {err('validityDays') ? (
          <p className="pt-error" id="ql-validity-err">
            {err('validityDays')}
          </p>
        ) : null}
      </div>
      <div>
        <label htmlFor="ql-lead" className="pt-lead-label">
          {QUOTE_FORM_LABELS.leadTime}
        </label>
        <input
          id="ql-lead"
          type="text"
          maxLength={120}
          value={leadTime}
          onChange={(e) => setLeadTime(e.target.value)}
          aria-invalid={err('leadTime') ? true : undefined}
          aria-describedby={err('leadTime') ? 'ql-lead-err' : undefined}
        />
        {err('leadTime') ? (
          <p className="pt-error" id="ql-lead-err">
            {err('leadTime')}
          </p>
        ) : null}
      </div>

      {totals ? (
        <div className="pt-doc-totals" style={{ alignItems: 'flex-end' }}>
          <span>{`${QUOTE_FORM_LABELS.total} ${formatEuros(totals.totalCents)}`}</span>
          <span>{`${QUOTE_FORM_LABELS.deposit} (${formatPercent(pct !== null && pct <= 100 ? pct : 0)}) ${formatEuros(totals.depositCents)}`}</span>
          <span>{`${QUOTE_FORM_LABELS.balance} ${formatEuros(totals.balanceCents)}`}</span>
          <span className="pt-helper">{QUOTE_FORM_LABELS.vatLine}</span>
        </div>
      ) : null}

      {Object.keys(errors).length > 0 ? <p className="pt-error">{COPY.validationSummary}</p> : null}

      <PreviewIssuePanel
        docType="quote"
        replacingRevision={replacingRevision}
        canIssue={canIssue}
        blockedReason={blockedReason}
        buildInput={buildInput}
        dirtyKey={dirtyKey}
        actions={actions}
        onFieldErrors={setErrors}
        onIssued={onIssued}
      />
    </div>
  );
}
