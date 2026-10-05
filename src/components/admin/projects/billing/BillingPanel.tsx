'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Plus } from 'lucide-react';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { formatDateFr } from '@/lib/admin/format';
import { formatEuros } from '@/lib/documents/money';
import { SELLER_V1 } from '@/lib/documents/seller';
import CreditNoteForm from './CreditNoteForm';
import InvoiceList from './InvoiceList';
import PendingPayments from './PendingPayments';
import PeriodInvoiceForm from './PeriodInvoiceForm';
import type {
  AdminBillingView,
  BillingIssueResult,
  BillingPreviewResult,
  CreditNoteInput,
  DownloadResult,
  InvoiceDataResult,
  PeriodInvoiceInput,
  VerifyResult,
} from './types';

const COPY = PROJECT_COPY.payments.admin;

export type BillingActions = {
  previewPeriod: (input: PeriodInvoiceInput) => Promise<BillingPreviewResult>;
  issuePeriod: (input: PeriodInvoiceInput) => Promise<BillingIssueResult>;
  previewCredit: (input: CreditNoteInput) => Promise<BillingPreviewResult>;
  issueCredit: (input: CreditNoteInput) => Promise<BillingIssueResult>;
  download: (invoiceId: string) => Promise<DownloadResult>;
  verifyHash: (invoiceId: string) => Promise<VerifyResult>;
  loadData: (invoiceId: string) => Promise<InvoiceDataResult>;
};

type BillingPanelProps = {
  projectId: string;
  view: AdminBillingView;
  actions: BillingActions;
};

type OpenForm =
  | { kind: 'period'; nonce: number }
  | { kind: 'credit'; nonce: number; invoice: AdminBillingView['invoices'][number] }
  | null;

export default function BillingPanel({ projectId, view, actions }: BillingPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState<OpenForm>(null);
  const [nonce, setNonce] = useState(0);
  const { summary, auto } = view;
  const money = (c: number | null) => (c === null ? '—' : formatEuros(c));

  function openPeriod() {
    setNonce((n) => n + 1);
    setOpen({ kind: 'period', nonce: nonce + 1 });
  }
  function openCredit(invoice: AdminBillingView['invoices'][number]) {
    setNonce((n) => n + 1);
    setOpen({ kind: 'credit', nonce: nonce + 1, invoice });
  }
  function done() {
    router.refresh();
  }

  const depositLine =
    auto.deposit.state === 'issued' && auto.deposit.number
      ? COPY.auto.issued(auto.deposit.number)
      : auto.deposit.state === 'waiting_contract'
        ? COPY.auto.waitingContract
        : null;

  const finalState = auto.final.state;
  const finalLine =
    finalState === 'issued' && auto.final.number
      ? COPY.auto.issued(auto.final.number)
      : finalState === 'waiting_acceptance'
        ? COPY.auto.waitingContract
        : finalState === 'over_invoiced'
          ? COPY.auto.finalOverInvoiced
          : finalState === 'nothing_to_invoice'
            ? COPY.auto.finalNothingToInvoice
            : null;

  return (
    <section className="pt-card" aria-labelledby="proj-billing-title">
      <h2 id="proj-billing-title" className="pt-heading">
        {COPY.title}
      </h2>
      {view.isTest ? (
        <p className="pt-warning">
          <AlertTriangle size={16} aria-hidden="true" /> {COPY.testProject}
        </p>
      ) : null}

      <dl className="pt-bill-summary">
        <div>
          <dt>{COPY.summary.quoteTotal}</dt>
          <dd>{money(summary.quoteTotalCents)}</dd>
        </div>
        <div>
          <dt>{summary.depositPercent === null ? 'Acompte' : COPY.summary.deposit(summary.depositPercent)}</dt>
          <dd>
            {summary.quoteTotalCents === null || summary.depositPercent === null
              ? '—'
              : formatEuros(Math.round((summary.quoteTotalCents * summary.depositPercent) / 100))}
          </dd>
        </div>
        <div>
          <dt>{COPY.summary.invoiced}</dt>
          <dd>{money(summary.invoicedCents)}</dd>
        </div>
        <div>
          <dt>{COPY.summary.collected}</dt>
          <dd>{money(summary.collectedCents)}</dd>
        </div>
        <div>
          <dt>{COPY.summary.remaining}</dt>
          <dd>{money(summary.remainingToInvoiceCents)}</dd>
        </div>
      </dl>
      {view.depositPaidViaStripeAt ? (
        <p className="pt-helper">{COPY.depositPaidVia(formatDateFr(view.depositPaidViaStripeAt))}</p>
      ) : null}
      {view.stripeFactsExist.deposit || view.stripeFactsExist.balance ? (
        <p className="pt-warning">
          <AlertTriangle size={16} aria-hidden="true" /> {COPY.manualFactWarning}
        </p>
      ) : null}

      <ul className="pt-bill-auto">
        <li>
          <span>{COPY.auto.depositLine}</span>
          {depositLine ? <span className="pt-helper"> : {depositLine}</span> : null}
        </li>
        <li>
          <span>{COPY.auto.finalLine}</span>
          {finalLine ? <span className="pt-helper"> : {finalLine}</span> : null}
          <p className="pt-helper">{COPY.auto.finalHelper}</p>
        </li>
      </ul>

      {view.contractSigned && open?.kind !== 'period' ? (
        <div>
          <button type="button" className="pt-btn-ghost" onClick={openPeriod}>
            <Plus size={16} aria-hidden="true" />
            {COPY.period.open}
          </button>
        </div>
      ) : null}
      {open?.kind === 'period' ? (
        <PeriodInvoiceForm
          key={open.nonce}
          projectId={projectId}
          paymentTermsDays={SELLER_V1.paymentTermsDays}
          preview={actions.previewPeriod}
          issue={actions.issuePeriod}
          onDone={() => {
            setOpen(null);
            done();
          }}
          onCancel={() => setOpen(null)}
        />
      ) : null}

      <InvoiceList
        invoices={view.invoices}
        download={actions.download}
        verifyHash={actions.verifyHash}
        loadData={actions.loadData}
        onCredit={openCredit}
      />

      {open?.kind === 'credit' ? (
        <CreditNoteForm
          key={open.nonce}
          origin={{
            id: open.invoice.id,
            number: open.invoice.number,
            totalInclTaxCents: open.invoice.totalInclTaxCents,
            creditedCents: open.invoice.creditedCents,
            creditMaxCents: open.invoice.creditMaxCents,
            refundEligible: open.invoice.refundEligible,
            paid: open.invoice.status === 'paid',
          }}
          preview={actions.previewCredit}
          issue={actions.issueCredit}
          onDone={() => {
            setOpen(null);
            done();
          }}
          onCancel={() => setOpen(null)}
        />
      ) : null}

      <PendingPayments pending={view.pending} />
    </section>
  );
}
