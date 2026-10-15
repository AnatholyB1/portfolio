'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Check, Download, FileText, PenLine, ShieldCheck } from 'lucide-react';
import { formatDateFr } from '@/lib/admin/format';
import { documentSubject, nameWithSubject } from '@/lib/projects/accessibleNames';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { DOC_LABELS, STATUS_LABELS, type DocType, type DocumentStatus } from '@/lib/documents/types';
import type { DownloadResult } from './types';
import { StatusNote } from '@/components/ui/Toast';
import './project.css';

export type DocumentListItem = {
  id: string;
  docType: DocType;
  revision: number;
  issuedAt: string;
  /** null = statut indisponible (lecture des faits en échec). */
  status: DocumentStatus | null;
  replacedBy: { revision: number; issuedAt: string } | null;
  /** Date de signature électronique (lecture RLS), null si non signé. */
  signedAt: string | null;
};

type Props = {
  projectTitle: string;
  documents: DocumentListItem[];
  getDownloadUrl: (id: string) => Promise<DownloadResult>;
  getSealedDownloadUrl: (id: string) => Promise<DownloadResult>;
};

const SIGNABLE: readonly DocType[] = ['quote', 'contract', 'acceptance'];

// Teinte du badge : fait (signé, payé) en accent, à faire en filet d'accent, le reste neutre.
function toneOf(status: DocumentStatus | null): 'success' | 'action' | 'wait' | undefined {
  if (status === 'signed' || status === 'paid') return 'success';
  if (status === 'to_sign' || status === 'to_pay') return 'action';
  if (status === 'replaced' || status === null) return 'wait';
  return undefined;
}

// Tableau des documents émis. Le lien signé n'est jamais rendu dans le DOM (D-15).
export default function DocumentsList({ projectTitle, documents, getDownloadUrl, getSealedDownloadUrl }: Props) {
  const copy = PROJECT_COPY.documents.portal;
  const sig = PROJECT_COPY.signature.documentsTab;
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function onDownload(id: string, sealed: boolean) {
    setError(null);
    setDownloadingId(id);
    startTransition(async () => {
      try {
        const res = await (sealed ? getSealedDownloadUrl(id) : getDownloadUrl(id));
        if (res.ok) {
          window.location.assign(res.url);
        } else {
          setError(copy.downloadFailed);
        }
      } catch {
        setError(copy.downloadFailed);
      } finally {
        setDownloadingId(null);
      }
    });
  }

  return (
    <div className="pt-stack">
      <table className="pt-table pt-docs-table">
        <caption className="pt-sr-only">{copy.caption(projectTitle)}</caption>
        <thead>
          <tr>
            <th scope="col">{copy.columns.document}</th>
            <th scope="col">{copy.columns.issuedOn}</th>
            <th scope="col">{copy.columns.version}</th>
            <th scope="col">{copy.columns.status}</th>
            <th scope="col">{copy.columns.action}</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((d) => (
            <tr key={d.id} className={d.replacedBy ? 'pt-doc-replaced' : undefined}>
              <td data-label={copy.columns.document}>
                <span className="pt-file-name">
                  <FileText size={16} aria-hidden="true" />
                  {DOC_LABELS[d.docType]}
                </span>
                {d.replacedBy ? (
                  <span className="pt-doc-meta">
                    {copy.replacedBy(d.replacedBy.revision, formatDateFr(d.replacedBy.issuedAt))}
                  </span>
                ) : null}
                {d.signedAt ? (
                  <span className="pt-doc-meta">
                    <ShieldCheck size={16} aria-hidden="true" /> {sig.signedOn(formatDateFr(d.signedAt))}
                  </span>
                ) : null}
              </td>
              <td data-label={copy.columns.issuedOn} className="pt-nowrap">{formatDateFr(d.issuedAt)}</td>
              <td data-label={copy.columns.version} className="pt-nowrap">{copy.version(d.revision)}</td>
              <td data-label={copy.columns.status}>
                <span className="pt-doc-badge" data-tone={toneOf(d.status)}>
                  {d.status === 'signed' || d.status === 'paid' ? <Check size={14} aria-hidden="true" /> : null}
                  {d.status ? STATUS_LABELS[d.status] : copy.statusUnavailable}
                </span>
              </td>
              <td data-label={copy.columns.action}>
                <div className="pt-docs-actions">
                {d.status === 'to_sign' && SIGNABLE.includes(d.docType) ? (
                  <Link href={`/espace-client/documents/${d.id}/signer`} className="pt-btn-ghost pt-file-action">
                    <PenLine size={16} aria-hidden="true" />
                    {sig.readAndSign}
                  </Link>
                ) : null}
                {(() => {
                  const visible =
                    downloadingId === d.id ? copy.preparing : d.status === 'signed' && d.signedAt ? sig.downloadSigned : copy.download;
                  return (
                    <button
                      type="button"
                      className="pt-btn-text pt-file-action"
                      aria-label={nameWithSubject(
                        visible,
                        documentSubject(DOC_LABELS[d.docType], d.revision, formatDateFr(d.issuedAt)),
                      )}
                      onClick={() => onDownload(d.id, d.status === 'signed' && d.signedAt !== null)}
                      disabled={downloadingId === d.id}
                    >
                      <Download size={16} aria-hidden="true" />
                      {visible}
                    </button>
                  );
                })()}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <StatusNote tone="error" live="assertive">
        {error}
      </StatusNote>
    </div>
  );
}
