import 'server-only';
// PRECONDITION : la signature est déjà enregistrée (sv_verify_signature_code). Écrit en service_role.
// Ordre A/B/C (D-09, D-16) : A re-hash de l'original ; B téléversement upsert:false vers un chemin aléatoire ;
// C RPC sv_seal_document (scellé + fait + outbox). Jamais de re-rendu : l'original reste intact (D-07).
import { createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import type { DocType } from '@/lib/documents/types';
import { buildCertificateData, type CertificateData } from '@/lib/signature/certificate';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { SV_DOCUMENTS_BUCKET } from '@/lib/server/documents/download';
import { aggregateMail } from '@/lib/server/documents/issue';
import { sendOutboxRow } from '@/lib/server/mail/outbox';
import { ADMIN_NOTIFY_EMAIL } from '@/lib/server/mail/rules';
import { ensureDepositInvoice, ensureFinalInvoice } from '@/lib/server/invoices/autoIssue';
import { afterFactPosted } from '@/lib/server/projects/facts';
import { callRpc } from '@/lib/server/rpc';
import { appendCertificatePages } from './certificatePdf';

const MAX_SEALED_BYTES = 10485760;

export type FinalizeSignatureResult =
  | { ok: true; outcome: 'sealed'; sealSha256: string }
  | { ok: true; outcome: 'already_sealed' }
  | {
      ok: false;
      code:
        | 'not_signed'
        | 'hash_mismatch'
        | 'too_large'
        | 'upload_failed'
        | 'seal_failed'
        | 'error';
    };

const sha256Hex = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');

/** Pages d'origine intactes + page(s) de certificat. Sérialisation sans flux d'objets. */
export async function buildSealedPdf(
  original: Uint8Array,
  data: CertificateData,
  signedAt?: Date,
): Promise<{ bytes: Uint8Array; sha256: string; size: number }> {
  const pdf = await PDFDocument.load(original, { updateMetadata: false });
  if (signedAt) {
    pdf.setCreationDate(signedAt);
    pdf.setModificationDate(signedAt);
  }
  await appendCertificatePages(pdf, data);
  const bytes = await pdf.save({ useObjectStreams: false });
  return { bytes, sha256: sha256Hex(bytes), size: bytes.length };
}

/** Suppression au mieux de l'objet téléversé ; ne lève jamais. */
async function removeOrphan(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  path: string | null,
): Promise<void> {
  if (!path) return;
  try {
    await admin.storage.from(SV_DOCUMENTS_BUCKET).remove([path]);
  } catch {
    console.error('[signature/seal] cleanup_failed');
  }
}

type SigRow = {
  signer_email: string;
  signer_name: string;
  signer_role: string;
  ip: string | null;
  consent_version: string;
  signed_event_seq: number;
  signed_link_hash: string;
  signed_at: string;
  signed_at_utc: string;
  acceptance_submission_id: string | null;
};
type DocRow = {
  project_id: string;
  doc_type: DocType;
  reference: string;
  revision: number;
  template_version: string;
  issued_at: string;
  sha256: string;
  storage_path: string;
};
type RespRow = { criterion_index: number; status: 'delivered' | 'reserved' | 'refused'; note: string | null };

export async function finalizeSignature(documentId: string): Promise<FinalizeSignatureResult> {
  let orphanPath: string | null = null;
  const admin = createSupabaseAdminClient();
  try {
    const sigRes = await admin
      .from('sv_document_signatures')
      .select(
        'signer_email, signer_name, signer_role, ip, consent_version, signed_event_seq, signed_link_hash, signed_at, signed_at_utc, acceptance_submission_id',
      )
      .eq('document_id', documentId)
      .maybeSingle();
    if (sigRes.error) {
      console.error('[signature/seal] error');
      return { ok: false, code: 'error' };
    }
    if (!sigRes.data) {
      console.error('[signature/seal] not_signed');
      return { ok: false, code: 'not_signed' };
    }
    const sig = sigRes.data as unknown as SigRow;

    const docRes = await admin
      .from('sv_project_documents')
      .select('project_id, doc_type, reference, revision, template_version, issued_at, sha256, storage_path')
      .eq('id', documentId)
      .maybeSingle();
    if (docRes.error || !docRes.data) {
      console.error('[signature/seal] error');
      return { ok: false, code: 'error' };
    }
    const doc = docRes.data as unknown as DocRow;

    let acceptance: RespRow[] | null = null;
    if (sig.acceptance_submission_id) {
      const resp = await admin
        .from('sv_acceptance_responses')
        .select('criterion_index, status, note')
        .eq('submission_id', sig.acceptance_submission_id)
        .order('criterion_index', { ascending: true });
      if (resp.error || !Array.isArray(resp.data)) {
        console.error('[signature/seal] error');
        return { ok: false, code: 'error' };
      }
      acceptance = resp.data as unknown as RespRow[];
    }

    // A : l'original est relu et re-haché avant tout usage (T-14-33).
    const file = await admin.storage.from(SV_DOCUMENTS_BUCKET).download(doc.storage_path);
    if (file.error || !file.data) {
      console.error('[signature/seal] error');
      return { ok: false, code: 'error' };
    }
    const original = new Uint8Array(await file.data.arrayBuffer());
    if (sha256Hex(original) !== doc.sha256) {
      console.error('[signature/seal] hash_mismatch');
      return { ok: false, code: 'hash_mismatch' };
    }

    const data = buildCertificateData({
      document: {
        docType: doc.doc_type,
        reference: doc.reference,
        revision: Number(doc.revision),
        templateVersion: doc.template_version,
        issuedAt: doc.issued_at,
        sha256: doc.sha256,
      },
      signature: {
        signerName: sig.signer_name,
        signerRole: sig.signer_role,
        signerEmail: sig.signer_email,
        signedAt: sig.signed_at,
        signedAtUtc: sig.signed_at_utc,
        ip: sig.ip,
        consentVersion: sig.consent_version,
        signedEventSeq: Number(sig.signed_event_seq),
        signedLinkHash: sig.signed_link_hash,
      },
      acceptance: acceptance
        ? acceptance.map((r) => ({ index: Number(r.criterion_index), status: r.status, note: r.note }))
        : null,
    });

    const sealed = await buildSealedPdf(original, data, new Date(sig.signed_at));
    if (sealed.size > MAX_SEALED_BYTES) {
      console.error('[signature/seal] too_large');
      return { ok: false, code: 'too_large' };
    }

    // B : téléversement sans écrasement vers un chemin aléatoire (T-14-35).
    const path = `${doc.project_id}/sealed/${crypto.randomUUID()}.pdf`;
    const up = await admin.storage.from(SV_DOCUMENTS_BUCKET).upload(path, sealed.bytes, {
      contentType: 'application/pdf',
      upsert: false,
      cacheControl: '31536000',
    });
    if (up.error) {
      console.error('[signature/seal] upload_failed');
      return { ok: false, code: 'upload_failed' };
    }
    orphanPath = path;

    // C : scellé + fait + outbox dans une seule transaction SQL (T-14-34).
    const rpc = await callRpc<{
      seal_id?: string;
      fact_id?: number | null;
      fact_changed?: boolean;
      outbox_ids?: string[] | null;
    }>('signature/seal', 'sv_seal_document', {
      p_document_id: documentId,
      p_storage_path: path,
      p_sha256: sealed.sha256,
      p_size: sealed.size,
      p_admin_email: ADMIN_NOTIFY_EMAIL,
    });
    if (!rpc.ok) {
      await removeOrphan(admin, orphanPath);
      orphanPath = null;
      if (rpc.code === 'sv_already_sealed') return { ok: true, outcome: 'already_sealed' };
      console.error('[signature/seal] seal_failed');
      return { ok: false, code: 'seal_failed' };
    }
    orphanPath = null; // scellé créé : l'objet est référencé.

    const raw = rpc.data?.outbox_ids;
    const ids = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
    if (ids.length > 0) {
      try {
        aggregateMail(await Promise.all(ids.map((id) => sendOutboxRow(id))));
      } catch {
        console.error('[signature/seal] mail_failed');
      }
    }
    const factId = rpc.data?.fact_id;
    if (rpc.data?.fact_changed === true && factId !== null && factId !== undefined) {
      try {
        await afterFactPosted(doc.project_id, Number(factId));
      } catch {
        console.error('[signature/seal] notify_failed');
      }
    }
    // Facturation automatique (D-07, D-09) : au mieux, jamais bloquante ; le cron quotidien reprend (Pitfall 7).
    if (doc.doc_type === 'contract' || doc.doc_type === 'acceptance') {
      try {
        if (doc.doc_type === 'contract') await ensureDepositInvoice(doc.project_id);
        else await ensureFinalInvoice(doc.project_id);
      } catch {
        console.error('[signature/seal] invoice_failed');
      }
    }
    return { ok: true, outcome: 'sealed', sealSha256: sealed.sha256 };
  } catch {
    console.error('[signature/seal] error');
    await removeOrphan(admin, orphanPath);
    return { ok: false, code: 'error' };
  }
}
