// PRECONDITION : l'appelant a exécuté requireClient() ou requireAdmin() et vérifié l'accès RLS.
import 'server-only';
import { canonicalJson } from '@/lib/signature/canonical';
import { CONSENT_TEXTS } from '@/lib/signature/consentText';
import { verifyChainExport } from '@/lib/signature/verifyChain';
import { ADMIN_NOTIFY_EMAIL } from '@/lib/server/mail/rules';
import { sendOutboxRow } from '@/lib/server/mail/outbox';
import { callRpc } from '@/lib/server/rpc';

const SCOPE = 'signature/chain';

export type ChainActor = { kind: 'client' | 'admin'; id: string; ip: string | null };

/** Journalise l'ouverture (dédoublonnée 5 min côté SQL). Ne lève jamais. */
export async function logDocumentOpened(documentId: string, actor: ChainActor): Promise<boolean> {
  const res = await callRpc(SCOPE, 'sv_log_document_opened', {
    p_document_id: documentId,
    p_actor_kind: actor.kind,
    p_actor_id: actor.id,
    p_ip: actor.ip,
  });
  return res.ok;
}

/** Journalise le téléchargement du scellé. Ne lève jamais. */
export async function logSealDownloaded(documentId: string, actor: ChainActor): Promise<boolean> {
  const res = await callRpc(SCOPE, 'sv_log_seal_downloaded', {
    p_document_id: documentId,
    p_actor_kind: actor.kind,
    p_actor_id: actor.id,
    p_ip: actor.ip,
  });
  return res.ok;
}

export type RecordConsentResult = { ok: true; seq: number } | { ok: false; code: string };

export async function recordConsent(a: {
  documentId: string;
  userId: string;
  ip: string | null;
  version: string;
}): Promise<RecordConsentResult> {
  if (!Object.prototype.hasOwnProperty.call(CONSENT_TEXTS, a.version)) {
    return { ok: false, code: 'invalid_version' };
  }
  const texts = CONSENT_TEXTS[a.version as keyof typeof CONSENT_TEXTS];
  const payload = canonicalJson({ version: a.version, esign: texts.esign, evidence: texts.evidence });
  const res = await callRpc<{ seq: number }>(SCOPE, 'sv_record_signature_consent', {
    p_document_id: a.documentId,
    p_actor_id: a.userId,
    p_ip: a.ip,
    p_consent_version: a.version,
    p_payload: payload,
  });
  if (!res.ok) return { ok: false, code: res.code };
  return { ok: true, seq: Number(res.data?.seq) };
}

type AcceptanceRpc = {
  submission_id: string;
  delivered_count: number;
  reserved_count: number;
  refused_count: number;
  outbox_ids: string[] | null;
};

const ACCEPTANCE_CODES: Record<string, string> = {
  sv_acceptance_refused: 'acceptance_refused',
  sv_acceptance_mismatch: 'acceptance_mismatch',
  sv_invalid_answer: 'invalid_answer',
  sv_document_superseded: 'document_superseded',
};

export type SubmitAcceptanceResult =
  | {
      ok: true;
      submissionId: string;
      deliveredCount: number;
      reservedCount: number;
      refusedCount: number;
    }
  | { ok: false; code: string };

export async function submitAcceptance(a: {
  documentId: string;
  userId: string;
  ip: string | null;
  answers: unknown;
}): Promise<SubmitAcceptanceResult> {
  const res = await callRpc<AcceptanceRpc>(SCOPE, 'sv_submit_acceptance', {
    p_document_id: a.documentId,
    p_actor_id: a.userId,
    p_ip: a.ip,
    p_answers: a.answers,
    p_admin_email: ADMIN_NOTIFY_EMAIL,
  });
  if (!res.ok) return { ok: false, code: ACCEPTANCE_CODES[res.code] ?? 'error' };
  const ids = res.data.outbox_ids ?? [];
  try {
    await Promise.all(ids.map((id) => sendOutboxRow(id)));
  } catch {
    console.error('[signature/chain] mail failed');
  }
  return {
    ok: true,
    submissionId: res.data.submission_id,
    deliveredCount: res.data.delivered_count,
    reservedCount: res.data.reserved_count,
    refusedCount: res.data.refused_count,
  };
}

export type ExportChainResult =
  | { ok: true; json: string; verified: true }
  | { ok: false; code: 'chain_broken'; brokenAtSeq: number | null }
  | { ok: false; code: 'error' };

export async function exportSignatureChain(documentId: string): Promise<ExportChainResult> {
  const res = await callRpc<unknown>(SCOPE, 'sv_export_signature_chain', { p_document_id: documentId });
  if (!res.ok) return { ok: false, code: 'error' };
  const check = verifyChainExport(res.data);
  if (!check.ok) return { ok: false, code: 'chain_broken', brokenAtSeq: check.brokenAtSeq };
  return { ok: true, json: JSON.stringify(res.data, null, 2), verified: true };
}

export type VerifyChainDbResult =
  | { ok: true; chainOk: boolean; count: number; brokenAt: number | null; headHash: string | null }
  | { ok: false; code: string };

export async function verifySignatureChainInDb(documentId: string): Promise<VerifyChainDbResult> {
  const res = await callRpc<{ ok: boolean; count: number; broken_at: number | null; head_hash: string | null }>(
    SCOPE,
    'sv_verify_signature_chain',
    { p_document_id: documentId },
  );
  if (!res.ok) return { ok: false, code: res.code };
  return {
    ok: true,
    chainOk: res.data.ok,
    count: res.data.count,
    brokenAt: res.data.broken_at,
    headHash: res.data.head_hash,
  };
}
