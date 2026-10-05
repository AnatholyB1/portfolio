'use client';

import { Fragment, useState, useTransition } from 'react';
import { Check, Clock, CreditCard, Download, Receipt, Undo2 } from 'lucide-react';
import { formatDateFr } from '@/lib/admin/format';
import { formatEuros } from '@/lib/documents/money';
import { PROJECT_COPY } from '@/lib/projects/copy';

import PayButton, { type PayResult } from './PayButton';
import type { DownloadResult, PortalInvoiceView } from './types';
import './project.css';

type Props = {
  projectTitle: string;
  invoices: PortalInvoiceView[];
  pay: (invoiceId: string) => Promise<PayResult>;
  getDownloadUrl: (invoiceId: string) => Promise<DownloadResult>;
};

function payLabel(kind: PortalInvoiceView['kind']): string {
  const copy = PROJECT_COPY.payments.portal;
  if (kind === 'deposit') return copy.payDeposit;
  if (kind === 'final') return copy.payBalance;
  return copy.payInvoice;
}

function StatusBadge({ status }: { status: PortalInvoiceView['status'] }) {
  return (
    <span className="pt-doc-badge">
      {status === 'processing' ? <Clock size={14} aria-hidden="true" /> : null}
      {status === 'paid' ? <Check size={14} aria-hidden="true" /> : null}
      {status === 'credited' || status === 'refunded' ? <Undo2 size={14} aria-hidden="true" /> : null}
      {PROJECT_COPY.payments.statuses[status]}
    </span>
  );
}

export default function PaymentsList({ projectTitle, invoices, pay, getDownloadUrl }: Props) {
  const copy = PROJECT_COPY.payments.portal;
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const next = invoices.find((i) => i.status === 'to_pay') ?? null;

  function onDownload(id: string) {
    setError(null);
    setDownloadingId(id);
    startTransition(async () => {
      try {
        const res = await getDownloadUrl(id);
        if (res.ok) window.location.assign(res.url);
        else setError(copy.downloadFailed);
      } catch {
        setError(copy.downloadFailed);
      } finally {
        setDownloadingId(null);
      }
    });
  }

  function downloadButton(inv: PortalInvoiceView) {
    if (!inv.hasPdf) return null;
    return (
      <button
        type="button"
        className="pt-btn-text pt-file-action"
        onClick={() => onDownload(inv.id)}
        disabled={downloadingId === inv.id}
      >
        <Download size={16} aria-hidden="true" />
        {downloadingId === inv.id ? copy.preparing : copy.download}
      </button>
    );
  }

  function row(inv: PortalInvoiceView, isNote: boolean, origin?: PortalInvoiceView) {
    const isNext = next !== null && next.id === inv.id;
    return (
      <tr key={inv.id} className={isNote ? 'pt-doc-replaced' : inv.status === 'processing' ? 'pt-pay-processing' : undefined}>
        <td data-label={copy.columns.invoice}>
          <span className="pt-file-name">
            {isNote ? <Undo2 size={16} aria-hidden="true" /> : <Receipt size={16} aria-hidden="true" />}
            {isNote ? copy.creditLabel(inv.number) : PROJECT_COPY.payments.kinds[inv.kind]}
          </span>
          {isNote ? null : <span className="pt-doc-meta pt-pay-number">{inv.number}</span>}
          {isNote && origin ? <span className="pt-doc-meta">{copy.creditOf(origin.number)}</span> : null}
        </td>
        <td data-label={copy.columns.issuedOn}>{formatDateFr(inv.issuedOn)}</td>
        <td data-label={copy.columns.period}>
          {inv.periodStart && inv.periodEnd ? copy.period(formatDateFr(inv.periodStart), formatDateFr(inv.periodEnd)) : '—'}
        </td>
        <td data-label={copy.columns.amount} className="pt-pay-amount-cell">
          {formatEuros(inv.totalInclTaxCents)}
        </td>
        <td data-label={copy.columns.status}>
          <StatusBadge status={inv.status} />
          {inv.status === 'paid' && inv.partialCreditCents > 0 ? (
            <span className="pt-doc-meta">{copy.partialCredit(formatEuros(inv.partialCreditCents))}</span>
          ) : null}
        </td>
        <td data-label={copy.columns.action}>
          {inv.status === 'to_pay' && !isNext ? (
            <PayButton invoiceId={inv.id} label={copy.pay} variant="ghost" pay={pay} />
          ) : null}
          {inv.status === 'processing' ? <span className="pt-doc-meta">{copy.waiting}</span> : null}
          {inv.status === 'paid' && inv.paidAt ? (
            <span className="pt-doc-meta">{copy.paidOn(formatDateFr(inv.paidAt))}</span>
          ) : null}
          {inv.lastFailedAt && inv.status === 'to_pay' ? (
            <p className="pt-error">{PROJECT_COPY.payments.returnBanner.failed}</p>
          ) : null}
          {downloadButton(inv)}
        </td>
      </tr>
    );
  }

  return (
    <div>
      {next ? (
        <section className="pt-pay-card" aria-labelledby={`pay-next-${next.id}`}>
          <h2 id={`pay-next-${next.id}`}>{copy.toPayHeading}</h2>
          <p className="pt-doc-meta">
            {PROJECT_COPY.payments.kinds[next.kind]} <span className="pt-pay-number">{next.number}</span>
            {next.dueDate ? ` · ${formatDateFr(next.dueDate)}` : ''}
          </p>
          <p className="pt-pay-amount">{formatEuros(next.amountDueCents)}</p>
          {next.lastFailedAt ? <p className="pt-error">{PROJECT_COPY.payments.returnBanner.failed}</p> : null}
          <PayButton invoiceId={next.id} label={payLabel(next.kind)} variant="primary" pay={pay} />
          <p className="pt-doc-meta">{copy.secureNote}</p>
          {next.kind === 'deposit' ? <p className="pt-doc-meta">{copy.depositHelper}</p> : null}
        </section>
      ) : null}

      <table className="pt-table">
        <caption className="pt-sr-only">{copy.caption(projectTitle)}</caption>
        <thead>
          <tr>
            <th scope="col">{copy.columns.invoice}</th>
            <th scope="col">{copy.columns.issuedOn}</th>
            <th scope="col">{copy.columns.period}</th>
            <th scope="col">{copy.columns.amount}</th>
            <th scope="col">{copy.columns.status}</th>
            <th scope="col">{copy.columns.action}</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <Fragment key={inv.id}>
              {row(inv, false)}
              {inv.creditNotes.map((n) => row(n, true, inv))}
            </Fragment>
          ))}
        </tbody>
      </table>
      <p className="pt-error" aria-live="polite">
        {error}
      </p>
      <p className="pt-doc-meta">{copy.vatNote}</p>
    </div>
  );
}
