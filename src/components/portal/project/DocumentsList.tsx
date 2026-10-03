'use client';

import { useState, useTransition } from 'react';
import { Check, Download, FileText } from 'lucide-react';
import { formatDateFr } from '@/lib/admin/format';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { DOC_LABELS, STATUS_LABELS, type DocType, type DocumentStatus } from '@/lib/documents/types';
import type { DownloadResult } from './types';
import './project.css';

export type DocumentListItem = {
  id: string;
  docType: DocType;
  revision: number;
  issuedAt: string;
  /** null = statut indisponible (lecture des faits en échec). */
  status: DocumentStatus | null;
  replacedBy: { revision: number; issuedAt: string } | null;
};

type Props = {
  projectTitle: string;
  documents: DocumentListItem[];
  getDownloadUrl: (id: string) => Promise<DownloadResult>;
};

// Tableau des documents émis. Le lien signé n'est jamais rendu dans le DOM (D-15).
export default function DocumentsList({ projectTitle, documents, getDownloadUrl }: Props) {
  const copy = PROJECT_COPY.documents.portal;
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function onDownload(id: string) {
    setError(null);
    setDownloadingId(id);
    startTransition(async () => {
      try {
        const res = await getDownloadUrl(id);
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
    <div>
      <table className="pt-table">
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
              </td>
              <td data-label={copy.columns.issuedOn}>{formatDateFr(d.issuedAt)}</td>
              <td data-label={copy.columns.version}>{copy.version(d.revision)}</td>
              <td data-label={copy.columns.status}>
                <span className="pt-doc-badge">
                  {d.status === 'signed' || d.status === 'paid' ? <Check size={14} aria-hidden="true" /> : null}
                  {d.status ? STATUS_LABELS[d.status] : copy.statusUnavailable}
                </span>
              </td>
              <td data-label={copy.columns.action}>
                <button
                  type="button"
                  className="pt-btn-text pt-file-action"
                  onClick={() => onDownload(d.id)}
                  disabled={downloadingId === d.id}
                >
                  <Download size={16} aria-hidden="true" />
                  {downloadingId === d.id ? copy.preparing : copy.download}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="pt-error" aria-live="polite">
        {error}
      </p>
    </div>
  );
}
