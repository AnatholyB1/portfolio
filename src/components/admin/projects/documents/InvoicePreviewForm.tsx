'use client';

import { useState } from 'react';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { QUOTE_FORM_LABELS } from '@/lib/documents/types';
import type { DocumentInput } from '@/lib/documents/schemas';
import { formatEuros, formatPercent } from '@/lib/documents/money';
import type { DocumentActions, FieldErrors } from './types';
import PreviewIssuePanel from './PreviewIssuePanel';

const COPY = PROJECT_COPY.documents.admin;

type QuoteRecap = {
  reference: string;
  lines: { designation: string; quantity: number; unitPriceCents: number; totalCents: number }[];
  totalCents: number;
  depositPercent: number;
  depositCents: number;
  balanceCents: number;
};

type Props = {
  projectId: string;
  replacingRevision: number | null;
  blockedReason?: string;
  actions: Pick<DocumentActions, 'preview' | 'issue'>;
  onIssued?: () => void;
  quote: QuoteRecap | null;
};

export default function InvoicePreviewForm({
  projectId,
  replacingRevision,
  blockedReason,
  actions,
  onIssued,
  quote,
}: Props) {
  const [kind, setKind] = useState<'deposit' | 'balance'>('deposit');
  const [serviceDate, setServiceDate] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  function buildInput(): DocumentInput | null {
    const next: FieldErrors = {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) next.serviceDate = 'Date de prestation requise.';
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return null;
    }
    setErrors({});
    const trimmed = orderNumber.trim();
    return {
      docType: 'invoice',
      projectId,
      documentId: '',
      kind,
      serviceDate,
      ...(trimmed ? { orderNumber: trimmed } : {}),
    } as DocumentInput;
  }

  const dirtyKey = JSON.stringify({ kind, serviceDate, orderNumber });

  return (
    <div className="pt-lead-form">
      <div>
        <h4>{COPY.invoiceTitle}</h4>
        <p className="pt-helper">{COPY.invoiceHelper}</p>
      </div>

      {quote === null ? (
        <p className="pt-helper">{COPY.needQuote}</p>
      ) : (
        <>
          <table>
            <caption className="pt-sr-only">{`Récapitulatif du devis ${quote.reference}`}</caption>
            <thead>
              <tr>
                <th scope="col">{QUOTE_FORM_LABELS.designation}</th>
                <th scope="col">{QUOTE_FORM_LABELS.quantity}</th>
                <th scope="col">{QUOTE_FORM_LABELS.unitPrice}</th>
                <th scope="col">{QUOTE_FORM_LABELS.amount}</th>
              </tr>
            </thead>
            <tbody>
              {quote.lines.map((l, i) => (
                <tr key={`${i}-${l.designation}`}>
                  <td>{l.designation}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{l.quantity}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{formatEuros(l.unitPriceCents)}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{formatEuros(l.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pt-doc-totals" style={{ alignItems: 'flex-end' }}>
            <span>{`${QUOTE_FORM_LABELS.total} ${formatEuros(quote.totalCents)}`}</span>
            <span>{`${QUOTE_FORM_LABELS.deposit} (${formatPercent(quote.depositPercent)}) ${formatEuros(quote.depositCents)}`}</span>
            <span>{`${QUOTE_FORM_LABELS.balance} ${formatEuros(quote.balanceCents)}`}</span>
          </div>

          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="pt-lead-label">Type de facture</legend>
            <label>
              <input
                type="radio"
                name="invoice-kind"
                value="deposit"
                checked={kind === 'deposit'}
                onChange={() => setKind('deposit')}
              />{' '}
              {"Facture d'acompte"}
            </label>{' '}
            <label>
              <input
                type="radio"
                name="invoice-kind"
                value="balance"
                checked={kind === 'balance'}
                onChange={() => setKind('balance')}
              />{' '}
              Facture de solde
            </label>
          </fieldset>

          <div>
            <label htmlFor="ip-date" className="pt-lead-label">
              Date de la prestation
            </label>
            <input
              id="ip-date"
              type="date"
              required
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              aria-invalid={errors.serviceDate ? true : undefined}
              aria-describedby={errors.serviceDate ? 'ip-date-err' : undefined}
            />
            {errors.serviceDate ? (
              <p className="pt-error" id="ip-date-err">
                {errors.serviceDate}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="ip-order" className="pt-lead-label">
              N° de commande (facultatif)
            </label>
            <input
              id="ip-order"
              type="text"
              maxLength={40}
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
            />
          </div>

          <PreviewIssuePanel
            docType="invoice"
            replacingRevision={replacingRevision}
            canIssue={false}
            blockedReason={blockedReason}
            buildInput={buildInput}
            dirtyKey={dirtyKey}
            actions={actions}
            onFieldErrors={setErrors}
            onIssued={onIssued}
          />
        </>
      )}
    </div>
  );
}
