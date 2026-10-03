'use client';

import { useEffect, useState, useTransition } from 'react';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { formatDateFr } from '@/lib/admin/format';
import { formatSize } from '@/lib/projects/fileRules';
import { formatEuros } from '@/lib/documents/money';
import type { DocumentSnapshot, QuoteLine } from '@/lib/documents/types';
import type { DocumentActions, IssuedDocView } from './types';

const COPY = PROJECT_COPY.documents.snapshot;

type SnapshotPanelProps = {
  doc: IssuedDocView;
  loadSnapshot: DocumentActions['loadSnapshot'];
  verify: DocumentActions['verify'];
};

function Lines({ lines, totalCents }: { lines: QuoteLine[]; totalCents: number }) {
  return (
    <>
      <ul>
        {lines.map((l, i) => (
          <li key={i}>
            {l.designation} : {l.quantity} × {formatEuros(l.unitPriceCents)} = {formatEuros(l.totalCents)}
          </li>
        ))}
      </ul>
      <p className="pt-doc-totals">Total HT : {formatEuros(totalCents)}</p>
    </>
  );
}

function TypeDetails({ s }: { s: DocumentSnapshot }) {
  switch (s.docType) {
    case 'quote':
      return (
        <>
          <Lines lines={s.lines} totalCents={s.totalCents} />
          <p className="pt-doc-totals">
            Acompte : {formatEuros(s.depositCents)} · Solde : {formatEuros(s.balanceCents)}
          </p>
        </>
      );
    case 'contract':
      return (
        <>
          <Lines lines={s.quote.lines} totalCents={s.quote.totalCents} />
          <p className="pt-doc-totals">
            Acompte : {formatEuros(s.quote.depositCents)} · Solde : {formatEuros(s.quote.balanceCents)}
          </p>
        </>
      );
    case 'spec':
      return (
        <ul>
          <li>Contexte : {s.sections.context}</li>
          <li>Périmètre : {s.sections.scope}</li>
          <li>Livrables : {s.sections.deliverables}</li>
          <li>Hors périmètre : {s.sections.outOfScope || '—'}</li>
          <li>Planning : {s.sections.planning || '—'}</li>
          <li>Critères d&apos;acceptation : {s.acceptanceCriteria.length}</li>
        </ul>
      );
    case 'acceptance':
      return (
        <p>
          Critères : {s.acceptanceCriteria.length} · Livraison : {formatDateFr(s.deliveryDate)}
        </p>
      );
    case 'invoice':
      return <Lines lines={s.lines} totalCents={s.totalCents} />;
  }
}

export default function SnapshotPanel({ doc, loadSnapshot, verify }: SnapshotPanelProps) {
  const [snapshot, setSnapshot] = useState<DocumentSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [verdict, setVerdict] = useState<{ kind: 'ok' | 'ko' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    loadSnapshot(doc.id)
      .then((res) => {
        if (cancelled) return;
        if (res.ok) setSnapshot(res.snapshot);
        else setError(res.message);
      })
      .catch(() => {
        if (!cancelled) setError(PROJECT_COPY.documents.admin.previewFailed);
      });
    return () => {
      cancelled = true;
    };
  }, [doc.id, loadSnapshot]);

  async function copyHash() {
    try {
      await navigator.clipboard.writeText(doc.sha256);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function onVerify() {
    setVerdict(null);
    startTransition(async () => {
      try {
        const res = await verify(doc.id);
        if (!res.ok) setVerdict({ kind: 'error', text: res.message });
        else setVerdict(res.match ? { kind: 'ok', text: COPY.verifyOk } : { kind: 'ko', text: COPY.verifyKo });
      } catch {
        setVerdict({ kind: 'error', text: COPY.verifyKo });
      }
    });
  }

  return (
    <div className="pt-doc-snapshot">
      <h3>{COPY.title}</h3>
      <p className="pt-helper">
        {COPY.meta(doc.templateVersion, formatDateFr(doc.issuedAt), formatSize(doc.sizeBytes))}
      </p>
      <p className="pt-helper">{COPY.readOnly}</p>

      <div>
        <p className="pt-doc-hash">{doc.sha256}</p>
        <button type="button" className="pt-btn-text" onClick={copyHash}>
          {copied ? COPY.copied : COPY.copyHash}
        </button>
        <span aria-live="polite" className="pt-sr-only">
          {copied ? COPY.copied : ''}
        </span>
      </div>

      {error ? <p className="pt-error">{error}</p> : null}

      {snapshot ? (
        <>
          <dl>
            <dt>Vendeur</dt>
            <dd>
              {snapshot.seller.legalName} · SIRET {snapshot.seller.siret}
            </dd>
            <dt>Client</dt>
            <dd>
              {snapshot.client.name} · SIREN {snapshot.client.siren}
            </dd>
            <dt>Projet</dt>
            <dd>{snapshot.project.title}</dd>
            <dt>Référence</dt>
            <dd>{snapshot.reference}</dd>
          </dl>
          <TypeDetails s={snapshot} />
          <details>
            <summary>{COPY.raw}</summary>
            <pre className="pt-doc-hash" style={{ maxHeight: 320, overflow: 'auto' }}>
              {JSON.stringify(snapshot, null, 2)}
            </pre>
          </details>
        </>
      ) : error ? null : (
        <p className="pt-helper">…</p>
      )}

      <div>
        <button type="button" className="pt-btn-ghost" onClick={onVerify} disabled={pending}>
          {COPY.verify}
        </button>
      </div>
      <div aria-live="polite">
        {verdict ? (
          <p className={verdict.kind === 'ok' ? 'pt-success' : 'pt-error'}>{verdict.text}</p>
        ) : null}
      </div>
    </div>
  );
}
