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
  revision: number;
  lines: { designation: string; quantity: number; unitPriceCents: number; totalCents: number }[];
  totalCents: number;
  depositPercent: number;
  depositCents: number;
  balanceCents: number;
  leadTime: string;
};

type Parties = { clientName: string; signatory: string | null; offerLabel: string };

type Props = {
  projectId: string;
  replacingRevision: number | null;
  canIssue: boolean;
  blockedReason?: string;
  actions: Pick<DocumentActions, 'preview' | 'issue'>;
  onIssued?: () => void;
  quote: QuoteRecap | null;
  parties: Parties;
};

export default function ContractForm({
  projectId,
  replacingRevision,
  canIssue,
  blockedReason,
  actions,
  onIssued,
  quote,
  parties,
}: Props) {
  const [startDate, setStartDate] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  function buildInput(): DocumentInput | null {
    if (startDate !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      setErrors({ startDate: 'Date invalide.' });
      return null;
    }
    setErrors({});
    return {
      docType: 'contract',
      projectId,
      documentId: '',
      ...(startDate ? { startDate } : {}),
    } as DocumentInput;
  }

  const dirtyKey = JSON.stringify({ startDate });

  return (
    <div className="pt-lead-form">
      <p className="pt-helper">{COPY.contractHelper}</p>

      <div className="pt-doc-expected">
        <dl className="pt-summary">
          <dt>Client</dt>
          <dd>{parties.clientName}</dd>
          <dt>Signataire</dt>
          <dd>{parties.signatory ?? 'Non renseigné'}</dd>
          <dt>Offre</dt>
          <dd>{parties.offerLabel}</dd>
          {quote ? (
            <>
              <dt>Devis</dt>
              <dd>{`${quote.reference} (version ${quote.revision})`}</dd>
              <dt>Délai</dt>
              <dd>{quote.leadTime}</dd>
            </>
          ) : null}
        </dl>

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
          </>
        )}
      </div>

      <div>
        <label htmlFor="cf-start" className="pt-lead-label">
          Date de début (facultatif)
        </label>
        <input
          id="cf-start"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          aria-invalid={errors.startDate ? true : undefined}
          aria-describedby={errors.startDate ? 'cf-start-err' : undefined}
        />
        {errors.startDate ? (
          <p className="pt-error" id="cf-start-err">
            {errors.startDate}
          </p>
        ) : null}
      </div>

      <PreviewIssuePanel
        docType="contract"
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
