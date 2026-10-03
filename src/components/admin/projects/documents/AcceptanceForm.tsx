'use client';

import { useState } from 'react';
import { PROJECT_COPY } from '@/lib/projects/copy';
import type { DocumentInput } from '@/lib/documents/schemas';
import type { DocumentActions, FieldErrors } from './types';
import PreviewIssuePanel from './PreviewIssuePanel';

const COPY = PROJECT_COPY.documents.admin;
const MAX = 2000;

type Props = {
  projectId: string;
  replacingRevision: number | null;
  canIssue: boolean;
  blockedReason?: string;
  actions: Pick<DocumentActions, 'preview' | 'issue'>;
  onIssued?: () => void;
  spec: { reference: string; revision: number; acceptanceCriteria: string[] } | null;
};

export default function AcceptanceForm({
  projectId,
  replacingRevision,
  canIssue,
  blockedReason,
  actions,
  onIssued,
  spec,
}: Props) {
  const [deliveryDate, setDeliveryDate] = useState('');
  const [reservations, setReservations] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  function buildInput(): DocumentInput | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) {
      setErrors({ deliveryDate: 'Date de livraison requise.' });
      return null;
    }
    setErrors({});
    const trimmed = reservations.trim();
    return {
      docType: 'acceptance',
      projectId,
      documentId: '',
      deliveryDate,
      ...(trimmed ? { reservations: trimmed } : {}),
    } as DocumentInput;
  }

  const dirtyKey = JSON.stringify({ deliveryDate, reservations });
  const dateErr = errors.deliveryDate;
  const resErr = errors.reservations;

  return (
    <div className="pt-lead-form">
      <div>
        <p className="pt-lead-label">
          {spec ? `Critères d'acceptation (${spec.reference}, version ${spec.revision})` : "Critères d'acceptation"}
        </p>
        {spec === null ? (
          <p className="pt-helper">{COPY.needSpec}</p>
        ) : (
          <ol style={{ fontSize: 16, paddingLeft: 24, margin: 0 }}>
            {spec.acceptanceCriteria.map((c, i) => (
              <li key={`${i}-${c}`}>{c}</li>
            ))}
          </ol>
        )}
      </div>

      <div>
        <label htmlFor="af-date" className="pt-lead-label">
          Date de livraison
        </label>
        <input
          id="af-date"
          type="date"
          required
          value={deliveryDate}
          onChange={(e) => setDeliveryDate(e.target.value)}
          aria-invalid={dateErr ? true : undefined}
          aria-describedby={dateErr ? 'af-date-err' : undefined}
        />
        {dateErr ? (
          <p className="pt-error" id="af-date-err">
            {dateErr}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="af-res" className="pt-lead-label">
          Réserves éventuelles (facultatif)
        </label>
        <textarea
          id="af-res"
          rows={4}
          maxLength={2000}
          value={reservations}
          onChange={(e) => setReservations(e.target.value)}
          aria-invalid={resErr ? true : undefined}
          aria-describedby={`af-res-help af-res-count${resErr ? ' af-res-err' : ''}`}
        />
        <p className="pt-field-help" id="af-res-help">
          {COPY.reservationsHelper}
        </p>
        <p className="pt-field-help" id="af-res-count">
          {`${reservations.length} / ${MAX}`}
        </p>
        {resErr ? (
          <p className="pt-error" id="af-res-err">
            {resErr}
          </p>
        ) : null}
      </div>

      <PreviewIssuePanel
        docType="acceptance"
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
