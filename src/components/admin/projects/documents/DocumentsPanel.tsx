'use client';

import { useId, useState } from 'react';
import { Lock } from 'lucide-react';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { DOC_LABELS, type DocType } from '@/lib/documents/types';
import type { DocumentActions, IssuedDocView, SignatureView } from './types';
import QuoteForm from './QuoteForm';
import SpecForm from './SpecForm';
import ContractForm from './ContractForm';
import AcceptanceForm from './AcceptanceForm';
import InvoicePreviewForm from './InvoicePreviewForm';
import IssuedDocumentsList from './IssuedDocumentsList';

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

type DocumentsView = {
  expected: {
    docType: DocType;
    activeRevision: number | null;
    canIssue: boolean;
    previewOnly: boolean;
    blockedReason: string | null;
  }[];
  issued: IssuedDocView[];
  activeQuote: QuoteRecap | null;
  activeSpec: { reference: string; revision: number; acceptanceCriteria: string[] } | null;
  parties: { clientName: string; signatory: string | null; offerLabel: string };
};

type DocumentsPanelProps = {
  projectId: string;
  view: DocumentsView;
  projectGoal: string | null;
  actions: DocumentActions;
  signatures?: Record<string, SignatureView>;
};

export default function DocumentsPanel({ projectId, view, projectGoal, actions, signatures = {} }: DocumentsPanelProps) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const [openType, setOpenType] = useState<DocType | null>(null);

  const formActions = { preview: actions.preview, issue: actions.issue };

  function renderForm(e: DocumentsView['expected'][number]) {
    const common = {
      projectId,
      replacingRevision: e.activeRevision,
      blockedReason: e.blockedReason ?? undefined,
      actions: formActions,
      onIssued: () => setOpenType(null),
    };
    switch (e.docType) {
      case 'quote':
        return <QuoteForm {...common} canIssue={e.canIssue} />;
      case 'spec':
        return <SpecForm {...common} canIssue={e.canIssue} projectGoal={projectGoal} />;
      case 'contract':
        return <ContractForm {...common} canIssue={e.canIssue} quote={view.activeQuote} parties={view.parties} />;
      case 'acceptance':
        return <AcceptanceForm {...common} canIssue={e.canIssue} spec={view.activeSpec} />;
      case 'invoice':
        return <InvoicePreviewForm {...common} quote={view.activeQuote} />;
      default:
        return null;
    }
  }

  return (
    <section className="pt-card" aria-labelledby={titleId}>
      <h2 id={titleId} className="pt-heading">
        {COPY.title}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {view.expected.length === 0 ? (
          <p className="pt-helper">{COPY.noExpected}</p>
        ) : (
          view.expected.map((e) => {
            const reasonId = `${uid}-${e.docType}-reason`;
            const label = e.docType === 'invoice' ? COPY.invoiceTitle : DOC_LABELS[e.docType];
            const open = openType === e.docType;
            // Un document signé ou un prérequis manquant bloque le bouton ; la facture reste ouvrable (aperçu seul).
            const head = view.issued.find((d) => d.docType === e.docType && d.revision === e.activeRevision);
            const signed = head ? Boolean(signatures[head.id]?.signature) : false;
            const frozenId = `${uid}-${e.docType}-frozen`;
            const disabled = signed || (e.previewOnly ? false : !e.canIssue);
            return (
              <div key={e.docType}>
                <div className="pt-doc-expected">
                  <div>
                    <strong>{label}</strong>
                    <p className="pt-helper">
                      {e.activeRevision === null ? COPY.toIssue : COPY.issuedVersion(e.activeRevision)}
                    </p>
                    {signed ? (
                      <p className="pt-doc-frozen" id={frozenId}>
                        <Lock size={16} aria-hidden="true" />
                        {COPY.signedNoReplace}
                      </p>
                    ) : e.blockedReason ? (
                      <p className="pt-helper" id={reasonId}>
                        {e.blockedReason}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="pt-btn-ghost"
                    disabled={disabled}
                    aria-describedby={signed ? frozenId : e.blockedReason ? reasonId : undefined}
                    aria-expanded={open}
                    onClick={() => setOpenType(open ? null : e.docType)}
                  >
                    {e.activeRevision === null ? COPY.generate : COPY.replace}
                  </button>
                </div>
                {open ? renderForm(e) : null}
              </div>
            );
          })
        )}
      </div>

      <div style={{ marginTop: 32 }}>
        <h3>{COPY.issuedCaption}</h3>
        {view.issued.length === 0 ? (
          <p className="pt-helper">{COPY.noIssued}</p>
        ) : (
          <IssuedDocumentsList documents={view.issued} actions={actions} signatures={signatures} />
        )}
      </div>
    </section>
  );
}
