import { AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { formatDateFr } from '@/lib/admin/format';
import { formatEuros } from '@/lib/documents/money';
import type { AdminBillingView } from './types';

const COPY = PROJECT_COPY.payments.admin.pending;

type Pending = AdminBillingView['pending'][number];
type CopyKey = keyof typeof COPY.statuses;

// Les statuts du loader (15-16) ne portent pas les clés de copie de l'UI-SPEC.
const STATUS_KEY: Record<Pending['status'], CopyKey> = {
  transfer_waiting: 'transfer_pending',
  amount_gap: 'amount_mismatch',
  unknown_invoice: 'unmatched',
  failed: 'failed',
};

function stripeUrl(ref: string, livemode: boolean): string {
  const base = livemode ? 'https://dashboard.stripe.com' : 'https://dashboard.stripe.com/test';
  // Seules les références pi_ ont une page dédiée ; sinon, recherche dans le tableau de bord.
  return ref.startsWith('pi_')
    ? `${base}/payments/${encodeURIComponent(ref)}`
    : `${base}/search?query=${encodeURIComponent(ref)}`;
}

function gapText(p: Pending): string | null {
  if (p.expectedCents === null || p.receivedCents === null) return null;
  const diff = p.receivedCents - p.expectedCents;
  if (diff === 0) return null;
  return diff > 0 ? COPY.overpaid(formatEuros(diff)) : COPY.missing(formatEuros(-diff));
}

export default function PendingPayments({ pending }: { pending: Pending[] }) {
  return (
    <section aria-labelledby="bill-pending-title" className="pt-bill-pending">
      <h3 id="bill-pending-title" className="pt-bill-heading">
        {COPY.heading}
      </h3>
      {pending.length === 0 ? (
        <p className="pt-helper">{COPY.none}</p>
      ) : (
        <>
          <table className="pt-table pt-bill-table">
            <caption className="pt-sr-only">{COPY.caption}</caption>
            <thead>
              <tr>
                <th scope="col">{COPY.columns.invoice}</th>
                <th scope="col">{COPY.columns.receivedOn}</th>
                <th scope="col" className="pt-bill-num">
                  {COPY.columns.expected}
                </th>
                <th scope="col" className="pt-bill-num">
                  {COPY.columns.received}
                </th>
                <th scope="col">{COPY.columns.gap}</th>
                <th scope="col">{COPY.columns.status}</th>
                <th scope="col">{COPY.columns.reference}</th>
                <th scope="col">{COPY.columns.action}</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((p, i) => {
                const key = STATUS_KEY[p.status];
                const Icon = key === 'transfer_pending' ? Clock : AlertTriangle;
                const gap = gapText(p);
                return (
                  <tr key={`${p.stripeRef ?? 'none'}-${i}`}>
                    <td data-label={COPY.columns.invoice}>{p.invoiceNumber ?? '—'}</td>
                    <td data-label={COPY.columns.receivedOn}>
                      {formatDateFr(p.receivedAt)}
                      {p.olderThan14Days ? <div className="pt-error">{COPY.olderThan14}</div> : null}
                    </td>
                    <td data-label={COPY.columns.expected} className="pt-bill-num">
                      {p.expectedCents === null ? '—' : formatEuros(p.expectedCents)}
                    </td>
                    <td data-label={COPY.columns.received} className="pt-bill-num">
                      {p.receivedCents === null ? '—' : formatEuros(p.receivedCents)}
                    </td>
                    <td data-label={COPY.columns.gap}>{gap ?? '—'}</td>
                    <td data-label={COPY.columns.status}>
                      <span className="pt-doc-badge">
                        <Icon size={16} aria-hidden="true" />
                        {COPY.statuses[key]}
                      </span>
                    </td>
                    <td data-label={COPY.columns.reference}>
                      {p.stripeRef ? <span className="pt-doc-hash">{p.stripeRef}</span> : '—'}
                    </td>
                    <td data-label={COPY.columns.action}>
                      {p.stripeRef ? (
                        <a
                          className="pt-btn-text"
                          href={stripeUrl(p.stripeRef, p.livemode)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {COPY.openInStripe}
                          <ExternalLink size={16} aria-hidden="true" />
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="pt-helper">{COPY.readOnlyHelper}</p>
        </>
      )}
    </section>
  );
}
