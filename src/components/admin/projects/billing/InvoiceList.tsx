'use client';

import { Fragment, useEffect, useState, useTransition } from 'react';
import { AlertTriangle, Check, Clock, Download, Lock, Receipt, Undo2 } from 'lucide-react';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { formatDateFr } from '@/lib/admin/format';
import { formatEuros } from '@/lib/documents/money';
import type { AdminBillingView, DownloadResult, InvoiceDataResult, VerifyResult } from './types';

const LIST = PROJECT_COPY.payments.admin.list;
const CREDIT = PROJECT_COPY.payments.admin.credit;
const STATUSES = PROJECT_COPY.payments.statuses;
const KINDS = PROJECT_COPY.payments.shortKinds;
const SNAP = PROJECT_COPY.documents.snapshot;

type AdminInvoice = AdminBillingView['invoices'][number];

type InvoiceListProps = {
  invoices: AdminInvoice[];
  download: (invoiceId: string) => Promise<DownloadResult>;
  verifyHash: (invoiceId: string) => Promise<VerifyResult>;
  loadData: (invoiceId: string) => Promise<InvoiceDataResult>;
  onCredit: (invoice: AdminInvoice) => void;
};

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec => (v && typeof v === 'object' ? (v as Rec) : {});
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

function StatusBadge({ status }: { status: AdminInvoice['status'] }) {
  const Icon = status === 'paid' ? Check : status === 'processing' ? Clock : null;
  return (
    <span className="pt-doc-badge">
      {Icon ? <Icon size={16} aria-hidden="true" /> : null}
      {STATUSES[status]}
    </span>
  );
}

function RefundMeta({ inv }: { inv: AdminInvoice }) {
  if (inv.refundFailed) {
    return (
      <p className="pt-warning">
        <AlertTriangle size={16} aria-hidden="true" /> {CREDIT.refundFailed}
      </p>
    );
  }
  if (inv.refundPending) {
    return (
      <p className="pt-helper">
        <Clock size={16} aria-hidden="true" /> {CREDIT.refundPending}
      </p>
    );
  }
  if (inv.status === 'refunded') {
    return <p className="pt-helper">{CREDIT.refundedOn(formatDateFr(inv.paidAt))}</p>;
  }
  return null;
}

function InvoiceData({
  inv,
  loadData,
  verifyHash,
}: {
  inv: AdminInvoice;
  loadData: InvoiceListProps['loadData'];
  verifyHash: InvoiceListProps['verifyHash'];
}) {
  const [data, setData] = useState<{ snapshot: Rec; lines: Rec[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'hash' | 'ref' | null>(null);
  const [verdict, setVerdict] = useState<{ kind: 'ok' | 'ko' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    loadData(inv.id)
      .then((res) => {
        if (cancelled) return;
        if (res.ok) setData({ snapshot: rec(res.snapshot), lines: res.lines });
        else setError(res.message);
      })
      .catch(() => {
        if (!cancelled) setError(PROJECT_COPY.errors.generic);
      });
    return () => {
      cancelled = true;
    };
  }, [inv.id, loadData]);

  async function copy(text: string, which: 'hash' | 'ref') {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  function onVerify() {
    setVerdict(null);
    startTransition(async () => {
      try {
        const res = await verifyHash(inv.id);
        if (!res.ok) setVerdict({ kind: 'error', text: res.message });
        else setVerdict(res.match ? { kind: 'ok', text: SNAP.verifyOk } : { kind: 'ko', text: SNAP.verifyKo });
      } catch {
        setVerdict({ kind: 'error', text: SNAP.verifyFailed });
      }
    });
  }

  const s = data?.snapshot ?? {};
  const seller = rec(s.seller);
  const client = rec(s.client);
  const period = rec(s.servicePeriod);
  const deductions = Array.isArray(s.deductions) ? (s.deductions as Rec[]) : [];
  const pay = inv.stripe;
  const payment = LIST.payment;

  return (
    <div className="pt-doc-snapshot">
      <h3>
        <Lock size={16} aria-hidden="true" /> {LIST.snapshotTitle}
      </h3>
      <p className="pt-helper">{LIST.readOnly}</p>
      {inv.sha256 ? (
        <div>
          <p className="pt-doc-hash">{inv.sha256}</p>
          <button type="button" className="pt-btn-text" onClick={() => copy(inv.sha256 ?? '', 'hash')}>
            {copied === 'hash' ? SNAP.copied : LIST.copyHash}
          </button>
        </div>
      ) : null}
      {error ? <p className="pt-error">{error}</p> : null}
      {data ? (
        <>
          <dl>
            <dt>Vendeur</dt>
            <dd>
              {str(seller.legalName)} · SIRET {str(seller.siret)}
            </dd>
            <dt>Acheteur</dt>
            <dd>
              {str(client.name)}
              {client.siren ? ` · SIREN ${str(client.siren)}` : ''}
            </dd>
            <dt>Régime de TVA</dt>
            <dd>{str(s.vatExemptionText) || str(s.vatRegime)}</dd>
            {period.start ? (
              <>
                <dt>Période</dt>
                <dd>{PROJECT_COPY.payments.portal.period(formatDateFr(str(period.start)), formatDateFr(str(period.end)))}</dd>
              </>
            ) : null}
            <dt>Lignes</dt>
            <dd>
              <ul>
                {data.lines.map((l, i) => (
                  <li key={i}>
                    {str(l.designation)} : {Number(l.quantity_milli) / 1000} × {formatEuros(Number(l.unit_price_cents))} ={' '}
                    {formatEuros(Number(l.line_total_cents))}
                  </li>
                ))}
              </ul>
            </dd>
            <dt>Totaux</dt>
            <dd>
              Total TTC : {formatEuros(inv.totalInclTaxCents)} · Net à payer : {formatEuros(inv.netToPayCents)}
            </dd>
            {deductions.length > 0 ? (
              <>
                <dt>Déduction d&apos;acompte</dt>
                <dd>
                  {deductions.map((d, i) => (
                    <span key={i}>
                      {str(d.invoiceNumber)} : {formatEuros(Number(d.amountCents))}{' '}
                    </span>
                  ))}
                </dd>
              </>
            ) : null}
          </dl>
          {pay.paymentIntentId ? (
            <div>
              <h4>{payment.title}</h4>
              <dl>
                <dt>{payment.reference}</dt>
                <dd>
                  <span className="pt-doc-hash">{pay.paymentIntentId}</span>{' '}
                  <button type="button" className="pt-btn-text" onClick={() => copy(pay.paymentIntentId ?? '', 'ref')}>
                    {copied === 'ref' ? SNAP.copied : payment.copy}
                  </button>
                </dd>
                <dt>{payment.mode}</dt>
                <dd>{pay.livemode ? payment.live : payment.test}</dd>
                <dt>{payment.confirmedOn}</dt>
                <dd>{formatDateFr(pay.confirmedAt)}</dd>
                <dt>{payment.source}</dt>
                <dd>{payment.verifiedWebhook}</dd>
              </dl>
            </div>
          ) : null}
        </>
      ) : error ? null : (
        <p className="pt-helper">…</p>
      )}
      <div>
        <button type="button" className="pt-btn-ghost" onClick={onVerify} disabled={pending}>
          {SNAP.verify}
        </button>
      </div>
      <div aria-live="polite">
        {verdict ? <p className={verdict.kind === 'ok' ? 'pt-success' : 'pt-error'}>{verdict.text}</p> : null}
      </div>
    </div>
  );
}

export default function InvoiceList({ invoices, download, verifyHash, loadData, onCredit }: InvoiceListProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [fullHashId, setFullHashId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function onDownload(id: string) {
    setError(null);
    setDownloadingId(id);
    startTransition(async () => {
      try {
        const res = await download(id);
        if (res.ok) window.location.assign(res.url);
        else setError(PROJECT_COPY.payments.portal.downloadFailed);
      } catch {
        setError(PROJECT_COPY.payments.portal.downloadFailed);
      } finally {
        setDownloadingId(null);
      }
    });
  }

  if (invoices.length === 0) return <p className="pt-helper">{LIST.empty}</p>;

  const rows = invoices.flatMap((inv) => [
    { inv, parent: null as AdminInvoice | null },
    ...inv.creditNotes.map((c) => ({ inv: c as AdminInvoice, parent: inv })),
  ]);

  return (
    <div>
      <table className="pt-table pt-bill-table">
        <caption className="pt-sr-only">{LIST.caption}</caption>
        <thead>
          <tr>
            <th scope="col">{LIST.columns.number}</th>
            <th scope="col">{LIST.columns.type}</th>
            <th scope="col">{LIST.columns.issuedOn}</th>
            <th scope="col" className="pt-bill-num">
              {LIST.columns.amount}
            </th>
            <th scope="col">{LIST.columns.status}</th>
            <th scope="col">{LIST.columns.hash}</th>
            <th scope="col">{LIST.columns.actions}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ inv, parent }) => {
            const open = openId === inv.id;
            const detailId = `inv-detail-${inv.id}`;
            const isCredit = parent !== null;
            const canCredit = !isCredit && inv.creditMaxCents > 0 && ['paid', 'to_pay', 'processing'].includes(inv.status);
            return (
              <Fragment key={inv.id}>
                <tr className={isCredit ? 'pt-doc-replaced' : undefined}>
                  <td data-label={LIST.columns.number}>
                    <span className="pt-doc-hash">
                      <Receipt size={16} aria-hidden="true" /> {inv.number}
                    </span>
                    {isCredit ? <div className="pt-helper">{PROJECT_COPY.payments.portal.creditOf(parent.number)}</div> : null}
                    {!isCredit && inv.partialCreditCents > 0 ? (
                      <div className="pt-helper">{PROJECT_COPY.payments.portal.partialCredit(formatEuros(inv.partialCreditCents))}</div>
                    ) : null}
                    <RefundMeta inv={inv} />
                  </td>
                  <td data-label={LIST.columns.type}>{KINDS[inv.kind]}</td>
                  <td data-label={LIST.columns.issuedOn}>{formatDateFr(inv.issuedOn)}</td>
                  <td data-label={LIST.columns.amount} className="pt-bill-num">
                    {formatEuros(inv.totalInclTaxCents)}
                  </td>
                  <td data-label={LIST.columns.status}>
                    <StatusBadge status={inv.status} />
                  </td>
                  <td data-label={LIST.columns.hash}>
                    {inv.sha256 ? (
                      <>
                        <span className="pt-doc-hash" title={inv.sha256}>
                          {fullHashId === inv.id ? inv.sha256 : inv.sha256.slice(0, 12)}
                        </span>{' '}
                        <button
                          type="button"
                          className="pt-btn-text"
                          aria-pressed={fullHashId === inv.id}
                          onClick={() => setFullHashId(fullHashId === inv.id ? null : inv.id)}
                        >
                          {LIST.viewHash}
                        </button>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td data-label={LIST.columns.actions}>
                    <button
                      type="button"
                      className="pt-btn-text"
                      onClick={() => onDownload(inv.id)}
                      disabled={downloadingId === inv.id}
                    >
                      <Download size={16} aria-hidden="true" />
                      {downloadingId === inv.id ? PROJECT_COPY.payments.portal.preparing : LIST.download}
                    </button>{' '}
                    <button
                      type="button"
                      className="pt-btn-text"
                      aria-expanded={open}
                      aria-controls={detailId}
                      onClick={() => setOpenId(open ? null : inv.id)}
                    >
                      {LIST.viewData}
                    </button>
                    {canCredit ? (
                      <>
                        {' '}
                        <button type="button" className="pt-btn-ghost" onClick={() => onCredit(inv)}>
                          <Undo2 size={16} aria-hidden="true" />
                          {LIST.credit}
                        </button>
                      </>
                    ) : null}
                  </td>
                </tr>
                {open ? (
                  <tr id={detailId}>
                    <td colSpan={7}>
                      <InvoiceData inv={inv} loadData={loadData} verifyHash={verifyHash} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      <div aria-live="polite">{error ? <p className="pt-error">{error}</p> : null}</div>
    </div>
  );
}
