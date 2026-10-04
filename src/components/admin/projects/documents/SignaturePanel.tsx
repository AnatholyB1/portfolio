'use client';

import { useId, useState, useTransition } from 'react';
import { AlertTriangle, Check, Download, ShieldCheck } from 'lucide-react';
import { PROJECT_COPY } from '@/lib/projects/copy';
import type { ChainCheckResult, DocumentActions, SignatureView } from './types';

const COPY = PROJECT_COPY.signature.admin;
const PORTAL_SIG = PROJECT_COPY.signature;

type SignaturePanelProps = {
  documentId: string;
  reference: string;
  view: SignatureView;
  originalSha256: string;
  templateVersion: string;
  actions: Pick<DocumentActions, 'download' | 'exportTrail' | 'verifyChain' | 'downloadSealed' | 'resumeFinalization'>;
};

function fmt(iso: string, timeZone: 'Europe/Paris' | 'UTC'): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: iso, time: '' };
  return {
    date: new Intl.DateTimeFormat('fr-FR', { timeZone, day: '2-digit', month: '2-digit', year: 'numeric' }).format(d),
    time: new Intl.DateTimeFormat('fr-FR', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(d),
  };
}

function HashRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <dt>{label}</dt>
      <dd>
        <span className="pt-doc-hash">{value}</span>{' '}
        <button
          type="button"
          className="pt-btn-text"
          onClick={() => {
            void navigator.clipboard
              ?.writeText(value)
              .then(() => setCopied(true))
              .catch(() => setCopied(false));
          }}
        >
          {copied ? <Check size={16} aria-hidden="true" /> : null}
          {COPY.block.copy}
        </button>
      </dd>
    </>
  );
}

export default function SignaturePanel({
  documentId,
  reference,
  view,
  originalSha256,
  templateVersion,
  actions,
}: SignaturePanelProps) {
  const uid = useId();
  const liveId = `${uid}-live`;
  const [busy, setBusy] = useState<null | 'export' | 'verify' | 'original' | 'sealed' | 'resume'>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [check, setCheck] = useState<ChainCheckResult | null>(null);
  const [, startTransition] = useTransition();

  const sig = view.signature;
  const paris = sig ? fmt(sig.signedAt, 'Europe/Paris') : null;
  const utc = sig ? fmt(sig.signedAtUtc, 'UTC') : null;

  function run(kind: NonNullable<typeof busy>, task: () => Promise<void>) {
    setMessage(null);
    setBusy(kind);
    startTransition(async () => {
      try {
        await task();
      } catch {
        if (kind === 'verify') setCheck({ ok: false, message: COPY.integrityFailure });
        else setMessage(kind === 'export' ? COPY.exportFailed : PORTAL_SIG.success.downloadFailed);
      } finally {
        setBusy(null);
      }
    });
  }

  function onExport() {
    run('export', async () => {
      const res = await actions.exportTrail(documentId);
      if (!res.ok) {
        setMessage(COPY.exportFailed);
        return;
      }
      const blob = new Blob([res.json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = res.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        URL.revokeObjectURL(url);
      }
    });
  }

  function onVerify() {
    setCheck(null);
    run('verify', async () => {
      setCheck(await actions.verifyChain(documentId));
    });
  }

  function onDownload(kind: 'original' | 'sealed') {
    run(kind, async () => {
      const res = kind === 'original' ? await actions.download(documentId) : await actions.downloadSealed(documentId);
      if (res.ok) window.location.assign(res.url);
      else setMessage(PORTAL_SIG.success.downloadFailed);
    });
  }

  function onResume() {
    run('resume', async () => {
      const res = await actions.resumeFinalization(documentId);
      setMessage(res.ok ? null : res.message);
    });
  }

  let verdict: React.ReactNode = null;
  if (busy === 'verify') {
    verdict = <p className="pt-helper">{COPY.verifying}</p>;
  } else if (check) {
    if (!check.ok) {
      verdict = (
        <p className="pt-error">
          <AlertTriangle size={16} aria-hidden="true" /> {check.message || COPY.integrityFailure}
        </p>
      );
    } else if (check.intact) {
      const at = fmt(check.checkedAt, 'Europe/Paris');
      verdict = (
        <p className="pt-helper">
          <Check size={16} aria-hidden="true" /> {COPY.integrityOk(check.count, at.date, at.time)}
        </p>
      );
    } else {
      verdict = (
        <p className="pt-error">
          <AlertTriangle size={16} aria-hidden="true" /> {COPY.integrityBroken(check.brokenAt ?? 0)}
        </p>
      );
    }
  }

  return (
    <div className="pt-doc-signature">
      <h4 className="pt-heading">{COPY.block.title}</h4>
      {sig && paris && utc ? (
        <dl className="pt-summary">
          <dt>{COPY.block.signer}</dt>
          <dd>
            {sig.signerName}, {sig.signerRole} · {sig.signerEmail}
          </dd>
          <dt>{COPY.block.signedAt}</dt>
          <dd>
            {paris.date} {paris.time} (Paris) · {utc.date} {utc.time} (UTC)
          </dd>
          <dt>{COPY.block.ip}</dt>
          <dd>{sig.ip ?? '—'}</dd>
          <dt>{COPY.block.templateVersion}</dt>
          <dd>{templateVersion}</dd>
          <dt>{COPY.block.consentVersion}</dt>
          <dd>{sig.consentVersion}</dd>
          <HashRow label={COPY.block.originalHash} value={originalSha256} />
          {view.seal ? <HashRow label={COPY.block.sealedHash} value={view.seal.sha256} /> : null}
          <HashRow label={COPY.block.lastLinkHash} value={sig.signedLinkHash} />
          {view.reserves.length > 0 ? (
            <>
              <dt>{COPY.block.reserves}</dt>
              <dd>
                <ul>
                  {view.reserves.map((r) => (
                    <li key={r.index}>
                      {r.index}. {r.criterion} : {r.note}
                    </li>
                  ))}
                </ul>
              </dd>
            </>
          ) : null}
        </dl>
      ) : null}

      {view.pendingFinalization ? (
        <p className="pt-warning">{PORTAL_SIG.code.finalizePending}</p>
      ) : null}

      <div className="pt-doc-actions">
        <button type="button" className="pt-btn-ghost" onClick={onExport} disabled={busy !== null}>
          <Download size={16} aria-hidden="true" />
          {busy === 'export' ? COPY.exporting : COPY.exportTrail}
        </button>
        <button type="button" className="pt-btn-ghost" onClick={onVerify} disabled={busy !== null}>
          <ShieldCheck size={16} aria-hidden="true" />
          {COPY.verify}
        </button>
        <button type="button" className="pt-btn-text" onClick={() => onDownload('original')} disabled={busy !== null}>
          {COPY.downloadOriginal}
        </button>
        {view.seal ? (
          <button type="button" className="pt-btn-text" onClick={() => onDownload('sealed')} disabled={busy !== null}>
            {COPY.downloadSealed}
          </button>
        ) : null}
        {view.pendingFinalization ? (
          <button type="button" className="pt-btn-ghost" onClick={onResume} disabled={busy !== null}>
            {PORTAL_SIG.code.finalizeAction}
          </button>
        ) : null}
      </div>
      <div id={liveId} aria-live="polite" data-reference={reference}>
        {verdict}
        {message ? <p className="pt-error">{message}</p> : null}
      </div>

      <details className="pt-doc-trail">
        <summary>{COPY.trailSummary(view.events.length)}</summary>
        {view.events.length === 0 ? (
          <p className="pt-helper">{COPY.trailEmpty}</p>
        ) : (
          <div className="pt-doc-trail-scroll">
            <table className="pt-table">
              <thead>
                <tr>
                  <th scope="col">{COPY.trailColumns.date}</th>
                  <th scope="col">{COPY.trailColumns.event}</th>
                  <th scope="col">{COPY.trailColumns.actor}</th>
                  <th scope="col">{COPY.trailColumns.ip}</th>
                </tr>
              </thead>
              <tbody>
                {view.events.map((e) => {
                  const t = fmt(e.occurredAtUtc, 'Europe/Paris');
                  return (
                    <tr key={e.seq}>
                      <td data-label={COPY.trailColumns.date}>
                        {t.date} {t.time}
                      </td>
                      <td data-label={COPY.trailColumns.event}>{e.label}</td>
                      <td data-label={COPY.trailColumns.actor}>{e.actorKind}</td>
                      <td data-label={COPY.trailColumns.ip}>{e.ip ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </details>
    </div>
  );
}
