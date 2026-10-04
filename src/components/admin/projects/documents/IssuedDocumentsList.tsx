'use client';

import { Fragment, useState, useTransition } from 'react';
import { Check, Download } from 'lucide-react';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { formatDateFr } from '@/lib/admin/format';
import { DOC_LABELS, STATUS_LABELS } from '@/lib/documents/types';
import type { DocumentActions, IssuedDocView, SignatureView } from './types';
import SnapshotPanel from './SnapshotPanel';
import SignaturePanel from './SignaturePanel';

const ADMIN = PROJECT_COPY.documents.admin;
const PORTAL = PROJECT_COPY.documents.portal;
const SIGN = PROJECT_COPY.signature.admin;

type IssuedDocumentsListProps = {
  documents: IssuedDocView[];
  actions: Pick<
    DocumentActions,
    'download' | 'verify' | 'loadSnapshot' | 'exportTrail' | 'verifyChain' | 'downloadSealed' | 'resumeFinalization'
  >;
  signatures?: Record<string, SignatureView>;
};

export default function IssuedDocumentsList({ documents, actions, signatures = {} }: IssuedDocumentsListProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullHashId, setFullHashId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function onDownload(id: string) {
    setError(null);
    setDownloadingId(id);
    startTransition(async () => {
      try {
        const res = await actions.download(id);
        if (res.ok) window.location.assign(res.url);
        else setError(PORTAL.downloadFailed);
      } catch {
        setError(PORTAL.downloadFailed);
      } finally {
        setDownloadingId(null);
      }
    });
  }

  if (documents.length === 0) {
    return <p className="pt-helper">{ADMIN.noIssued}</p>;
  }

  return (
    <div>
      <table className="pt-table">
        <caption className="pt-sr-only">{ADMIN.issuedCaption}</caption>
        <thead>
          <tr>
            <th scope="col">{PORTAL.columns.document}</th>
            <th scope="col">{PORTAL.columns.issuedOn}</th>
            <th scope="col">{PORTAL.columns.status}</th>
            <th scope="col">{ADMIN.columns.model}</th>
            <th scope="col">{ADMIN.columns.hash}</th>
            <th scope="col">{ADMIN.columns.actions}</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((d) => {
            const replaced = d.replacedBy !== null;
            const open = openId === d.id;
            const detailId = `doc-detail-${d.id}`;
            const sv = signatures[d.id];
            const sig = sv?.signature ?? null;
            const showCheck = d.status === 'signed' || d.status === 'paid';
            return (
              <Fragment key={d.id}>
                <tr className={replaced ? 'pt-doc-replaced' : undefined}>
                  <td data-label={PORTAL.columns.document}>
                    <div>
                      {DOC_LABELS[d.docType]} · {PORTAL.version(d.revision)}
                    </div>
                    {d.replacedBy ? (
                      <div className="pt-helper">
                        {PORTAL.replacedBy(d.replacedBy.revision, formatDateFr(d.replacedBy.issuedAt))}
                      </div>
                    ) : null}
                    {sig ? (
                      <p className="pt-doc-signed-line">
                        {SIGN.signedBy(sig.signerName, formatDateFr(sig.signedAtUtc), sig.ip ?? '—')}
                      </p>
                    ) : null}
                    {sv?.refusal ? (
                      <div className="pt-warning">
                        <div>
                          <p>{SIGN.pvRefusal(sv.refusal.count)}</p>
                          <ul>
                            {sv.refusal.items.map((r) => (
                              <li key={r.index}>
                                {r.index}. {r.criterion}
                                {r.note ? ` : ${r.note}` : ''}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : null}
                  </td>
                  <td data-label={PORTAL.columns.issuedOn}>{formatDateFr(d.issuedAt)}</td>
                  <td data-label={PORTAL.columns.status}>
                    <span className="pt-doc-badge">
                      {showCheck ? <Check size={16} aria-hidden="true" /> : null}
                      {STATUS_LABELS[d.status]}
                    </span>
                  </td>
                  <td data-label={ADMIN.columns.model}>
                    <span className="pt-doc-hash">{d.templateVersion}</span>
                  </td>
                  <td data-label={ADMIN.columns.hash}>
                    <span className="pt-doc-hash" title={d.sha256}>
                      {fullHashId === d.id ? d.sha256 : d.sha256.slice(0, 12)}
                    </span>{' '}
                    <button
                      type="button"
                      className="pt-btn-text"
                      aria-pressed={fullHashId === d.id}
                      onClick={() => setFullHashId(fullHashId === d.id ? null : d.id)}
                    >
                      {ADMIN.viewHash}
                    </button>
                  </td>
                  <td data-label={ADMIN.columns.actions}>
                    <button
                      type="button"
                      className="pt-btn-text"
                      onClick={() => onDownload(d.id)}
                      disabled={downloadingId === d.id}
                    >
                      <Download size={16} aria-hidden="true" />
                      {downloadingId === d.id ? PORTAL.preparing : ADMIN.download}
                    </button>{' '}
                    <button
                      type="button"
                      className="pt-btn-text"
                      aria-expanded={open}
                      aria-controls={detailId}
                      onClick={() => setOpenId(open ? null : d.id)}
                    >
                      {ADMIN.viewData}
                    </button>
                  </td>
                </tr>
                {open ? (
                  <tr id={detailId}>
                    <td colSpan={6}>
                      <SnapshotPanel doc={d} loadSnapshot={actions.loadSnapshot} verify={actions.verify} />
                      {sv && (sig || sv.events.length > 0) ? (
                        <SignaturePanel
                          documentId={d.id}
                          reference={`${d.docType}-v${d.revision}`}
                          view={sv}
                          originalSha256={d.sha256}
                          templateVersion={d.templateVersion}
                          actions={actions}
                        />
                      ) : null}
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
