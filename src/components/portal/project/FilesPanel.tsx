'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Download, FileText, Image as ImageIcon, Upload } from 'lucide-react';
import { formatDateFr } from '@/lib/admin/format';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { ALLOWED_FILE_TYPES, formatSize, validateUpload, type FileKind } from '@/lib/projects/fileRules';
import type { FileRowView, FilesPanelProps } from './types';
import './project.css';

type UploadState = { name: string; loaded: number; total: number };

function KindIcon({ kind }: { kind: FileKind }) {
  if (kind === 'image' || kind === 'vector') return <ImageIcon size={16} aria-hidden="true" />;
  if (kind === 'archive') return <Archive size={16} aria-hidden="true" />;
  return <FileText size={16} aria-hidden="true" />;
}

// Certains navigateurs ne renseignent pas le type MIME (ai, eps) : repli par extension.
function mimeOf(file: File): string {
  if (file.type) return file.type;
  const dot = file.name.lastIndexOf('.');
  const ext = dot >= 0 ? file.name.slice(dot + 1).toLowerCase() : '';
  return ALLOWED_FILE_TYPES.find((t) => t.ext === ext)?.mimes[0] ?? '';
}

function uploaderLabel(row: FileRowView, viewer: 'client' | 'admin'): string {
  if (viewer === 'client') {
    return row.uploadedByKind === 'client' ? PROJECT_COPY.files.byClient : PROJECT_COPY.files.byAdmin;
  }
  return row.uploadedByKind === 'client' ? 'Client' : 'Sèvalys';
}

export default function FilesPanel({
  projectId,
  files,
  viewer,
  requestUpload,
  confirmUpload,
  getDownloadUrl,
}: FilesPanelProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const [progress, setProgress] = useState<UploadState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [failedFile, setFailedFile] = useState<File | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sorted = [...files].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));

  function putFile(signedUrl: string, file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      const body = new FormData();
      body.append('cacheControl', '3600');
      body.append('', file);
      xhr.open('PUT', signedUrl);
      xhr.setRequestHeader('x-upsert', 'false');
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress({ name: file.name, loaded: e.loaded, total: e.total });
      };
      xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
      xhr.onerror = () => resolve(false);
      xhr.onabort = () => resolve(false);
      xhr.send(body);
    });
  }

  async function send(file: File) {
    setError(null);
    setSuccess(null);
    setFailedFile(null);
    const mime = mimeOf(file);
    const check = validateUpload({ filename: file.name, size: file.size, mime });
    if (!check.ok) {
      setError(check.code === 'too_large' ? PROJECT_COPY.errors.fileTooLarge : PROJECT_COPY.errors.fileType);
      return;
    }
    setProgress({ name: file.name, loaded: 0, total: file.size });
    try {
      const req = await requestUpload({ projectId, filename: file.name, size: file.size, mime });
      if (!req.ok) {
        setError(req.message);
        return;
      }
      const sent = await putFile(req.signedUrl, file);
      if (!sent) {
        setError(PROJECT_COPY.errors.uploadFailed(file.name));
        setFailedFile(file);
        return;
      }
      const confirmed = await confirmUpload(req.fileId);
      if (!confirmed.ok) {
        setError(confirmed.message);
        setFailedFile(file);
        return;
      }
      setSuccess(PROJECT_COPY.files.added(file.name));
      router.refresh();
    } catch {
      setError(PROJECT_COPY.errors.uploadFailed(file.name));
      setFailedFile(file);
    } finally {
      xhrRef.current = null;
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void send(file);
  }

  function onDownload(id: string) {
    setError(null);
    setDownloadingId(id);
    startTransition(async () => {
      try {
        const res = await getDownloadUrl(id);
        if (res.ok) {
          window.location.assign(res.url);
        } else {
          setError(PROJECT_COPY.errors.downloadFailed);
        }
      } catch {
        setError(PROJECT_COPY.errors.downloadFailed);
      } finally {
        setDownloadingId(null);
      }
    });
  }

  const uploading = progress !== null;

  return (
    <div className="pt-file-upload">
      <h2>{PROJECT_COPY.files.heading}</h2>
      <label className="pt-btn-ghost pt-file-pick" aria-disabled={uploading}>
        <Upload size={16} aria-hidden="true" />
        <span>{PROJECT_COPY.files.add}</span>
        <input
          ref={inputRef}
          type="file"
          className="pt-file-input"
          onChange={onPick}
          disabled={uploading}
        />
      </label>
      <p className="pt-helper">{PROJECT_COPY.files.helper}</p>

      {progress ? (
        <div className="pt-file-row">
          <span className="pt-file-name">{progress.name}</span>
          <progress
            className="pt-file-progress"
            value={progress.loaded}
            max={progress.total || 1}
            aria-label={PROJECT_COPY.files.uploading}
          />
          <span>{PROJECT_COPY.files.uploading}</span>
          <button type="button" className="pt-btn-text" onClick={() => xhrRef.current?.abort()}>
            {PROJECT_COPY.files.cancel}
          </button>
        </div>
      ) : null}

      <div aria-live="polite">
        {success ? <p className="pt-success">{success}</p> : null}
        {error ? (
          <div className="pt-file-row">
            <p className="pt-error">{error}</p>
            {failedFile ? (
              <button type="button" className="pt-btn-text" onClick={() => void send(failedFile)}>
                {PROJECT_COPY.files.retry}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {sorted.length === 0 ? (
        <p className="pt-helper">{PROJECT_COPY.files.empty}</p>
      ) : (
        <table className="pt-table">
          <caption className="pt-sr-only">{PROJECT_COPY.files.heading}</caption>
          <thead>
            <tr>
              <th scope="col">Nom</th>
              <th scope="col">Déposé par</th>
              <th scope="col">Ajouté le</th>
              <th scope="col">Taille</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((f) => (
              <tr key={f.id}>
                <td data-label="Nom">
                  <span className="pt-file-name">
                    <KindIcon kind={f.kind} />
                    {f.filename}
                  </span>
                </td>
                <td data-label="Déposé par">{uploaderLabel(f, viewer)}</td>
                <td data-label="Ajouté le">{formatDateFr(f.createdAt)}</td>
                <td data-label="Taille" className="pt-file-size">
                  {formatSize(f.sizeBytes)}
                </td>
                <td data-label="Action">
                  <button
                    type="button"
                    className="pt-btn-text pt-file-action"
                    onClick={() => onDownload(f.id)}
                    disabled={downloadingId === f.id}
                  >
                    <Download size={16} aria-hidden="true" />
                    {downloadingId === f.id ? PROJECT_COPY.files.preparing : PROJECT_COPY.files.download}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
