'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { DOC_LABELS, type DocType } from '@/lib/documents/types';
import type { DocumentInput } from '@/lib/documents/schemas';
import type { DocumentActions, FieldErrors } from './types';

const COPY = PROJECT_COPY.documents.admin;

type PreviewIssuePanelProps = {
  docType: DocType;
  replacingRevision: number | null;
  canIssue: boolean;
  blockedReason?: string;
  buildInput: () => DocumentInput | null;
  dirtyKey: string;
  actions: Pick<DocumentActions, 'preview' | 'issue'>;
  onFieldErrors?: (errors: FieldErrors) => void;
  onIssued?: () => void;
};

type Msg = { kind: 'success' | 'warning' | 'error'; text: string };

function base64ToBlobUrl(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
}

export default function PreviewIssuePanel({
  docType,
  replacingRevision,
  canIssue,
  blockedReason,
  buildInput,
  dirtyKey,
  actions,
  onFieldErrors,
  onIssued,
}: PreviewIssuePanelProps) {
  const router = useRouter();
  const uid = useId();
  const titleId = `${uid}-confirm-title`;
  const blockedId = `${uid}-blocked`;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [documentId, setDocumentId] = useState(() => crypto.randomUUID());
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<'preview' | 'issue' | null>(null);
  const urlRef = useRef<string | null>(null);
  const titleRef = useRef<HTMLParagraphElement>(null);
  const msgRef = useRef<HTMLParagraphElement>(null);

  function setUrl(next: string | null) {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = next;
    setPreviewUrl(next);
  }

  // Une modification du formulaire invalide l'aperçu (D-02) et libère le blob.
  useEffect(() => {
    if (urlRef.current && previewKey !== null && previewKey !== dirtyKey) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
      setPreviewUrl(null);
      setConfirming(false);
    }
  }, [dirtyKey, previewKey]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (confirming) titleRef.current?.focus();
  }, [confirming]);

  const previewCurrent = previewUrl !== null && previewKey === dirtyKey;

  function onPreview() {
    setMsg(null);
    const input = buildInput();
    if (!input) {
      setMsg({ kind: 'error', text: COPY.validationSummary });
      return;
    }
    setMode('preview');
    startTransition(async () => {
      try {
        const res = await actions.preview({ ...input, documentId });
        if (res.ok) {
          setUrl(base64ToBlobUrl(res.pdfBase64));
          setPreviewKey(dirtyKey);
        } else {
          setMsg({ kind: 'error', text: res.message });
          if (res.fieldErrors) onFieldErrors?.(res.fieldErrors);
        }
      } catch {
        setMsg({ kind: 'error', text: COPY.previewFailed });
      } finally {
        setMode(null);
      }
    });
  }

  function onConfirm() {
    const input = buildInput();
    if (!input) {
      setConfirming(false);
      setMsg({ kind: 'error', text: COPY.validationSummary });
      return;
    }
    setMode('issue');
    startTransition(async () => {
      try {
        const res = await actions.issue({ ...input, documentId });
        if (!res.ok) {
          setMsg({ kind: 'error', text: res.message });
          if (res.fieldErrors) onFieldErrors?.(res.fieldErrors);
          return;
        }
        setConfirming(false);
        if (res.outcome === 'already_issued') {
          setMsg({ kind: 'warning', text: COPY.alreadyIssued });
        } else if (res.mail === 'pending' || res.mail === 'failed') {
          setMsg({ kind: 'warning', text: COPY.mailFailed });
        } else {
          setMsg({ kind: 'success', text: COPY.success });
        }
        setUrl(null);
        setPreviewKey(null);
        setDocumentId(crypto.randomUUID());
        onIssued?.();
        router.refresh();
        setTimeout(() => msgRef.current?.focus(), 0);
      } catch {
        setMsg({ kind: 'error', text: COPY.issueFailed });
      } finally {
        setMode(null);
      }
    });
  }

  const label = DOC_LABELS[docType].toLowerCase();

  return (
    <div className="pt-doc-panel">
      <div className="pt-doc-actions">
        <button type="button" className="pt-btn-ghost" onClick={onPreview}
          disabled={pending}
          aria-describedby={!canIssue && blockedReason ? blockedId : undefined}
        >
          {pending && mode === 'preview' ? COPY.previewing : COPY.preview}
        </button>
        {canIssue ? (
          <button
            type="button"
            className="pt-btn-primary"
            disabled={!previewCurrent || pending}
            onClick={() => setConfirming(true)}
          >
            {COPY.issue}
          </button>
        ) : null}
      </div>
      {!canIssue && blockedReason ? (
        <p className="pt-helper" id={blockedId}>
          {blockedReason}
        </p>
      ) : null}
      {canIssue ? <p className="pt-helper">{COPY.issueHelper}</p> : null}

      {confirming ? (
        <div
          className="pt-doc-confirm"
          role="group"
          aria-labelledby={titleId}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setConfirming(false);
          }}
        >
          <p id={titleId} ref={titleRef} tabIndex={-1}>
            <strong>{COPY.confirmTitle(label)}</strong>
          </p>
          <p>{COPY.confirmBody}</p>
          {replacingRevision !== null ? <p>{COPY.confirmReplace(replacingRevision)}</p> : null}
          <div className="pt-doc-actions">
            <button type="button" className="pt-btn-primary" onClick={onConfirm} disabled={pending}>
              {pending && mode === 'issue' ? COPY.issuing : COPY.confirm}
            </button>
            <button
              type="button"
              className="pt-btn-text"
              onClick={() => setConfirming(false)}
              disabled={pending}
            >
              {COPY.cancel}
            </button>
          </div>
        </div>
      ) : null}

      <div aria-live="polite">
        {msg ? (
          <p
            ref={msgRef}
            tabIndex={-1}
            className={
              msg.kind === 'success' ? 'pt-success' : msg.kind === 'warning' ? 'pt-warning' : 'pt-error'
            }
          >
            {msg.text}
          </p>
        ) : null}
      </div>

      {previewUrl ? (
        <div className="pt-doc-preview">
          <p className="pt-warning">{COPY.previewBanner}</p>
          <iframe title="Aperçu du document" src={previewUrl} />
          <a className="pt-btn-text" href={previewUrl} target="_blank" rel="noopener noreferrer">
            {COPY.openPreview}
          </a>
        </div>
      ) : null}
    </div>
  );
}
