// PRECONDITION : requireAdmin(), accès projet et garde d'étape déjà vérifiés par l'action (13-17). Écrit en service_role.
// Ordre : rendu -> empreinte -> téléversement upsert:false -> RPC unique (document + instantané + outbox) -> envoi des mails au mieux.
import 'server-only';
import { isSellerConfigured } from '@/lib/documents/seller';
import { buildFilename, DOC_LABELS, type DocumentSnapshot } from '@/lib/documents/types';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { sendOutboxRow } from '@/lib/server/mail/outbox';
import { callRpc } from '@/lib/server/rpc';
import { SV_DOCUMENTS_BUCKET } from './download';
import { renderDocument } from './render';

type Mail = 'sent' | 'pending' | 'failed' | 'none';

export type IssueDocumentResult =
  | { ok: true; outcome: 'issued' | 'already_issued'; documentId: string; mail: Mail }
  | {
      ok: false;
      code:
        | 'invoice_not_issuable'
        | 'seller_not_configured'
        | 'replaces_mismatch'
        | 'revision_mismatch'
        | 'signed_no_replace'
        | 'upload_failed'
        | 'error';
    };

/** 'failed' l'emporte, puis 'pending' (non réclamé), puis 'sent' ('skipped' est terminal, jamais un échec) ; aucune ligne = 'none'. */
export function aggregateMail(results: ('sent' | 'failed' | 'skipped' | 'not_claimed')[]): Mail {
  if (results.length === 0) return 'none';
  if (results.some((r) => r === 'failed')) return 'failed';
  if (results.some((r) => r === 'not_claimed')) return 'pending';
  return 'sent';
}

async function sendOutbox(ids: string[]): Promise<Mail> {
  if (ids.length === 0) return 'none';
  try {
    const results = await Promise.all(ids.map((id) => sendOutboxRow(id)));
    return aggregateMail(results);
  } catch {
    console.error('[documents/issue] mail failed');
    return 'failed';
  }
}

/** Suppression au mieux de l'objet téléversé (service_role) ; ne lève jamais. */
async function removeOrphan(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  path: string | null,
): Promise<void> {
  if (!path) return;
  try {
    await admin.storage.from(SV_DOCUMENTS_BUCKET).remove([path]);
  } catch {
    console.error('[documents/issue] cleanup failed');
  }
}

export async function issueDocument(a: {
  documentId: string;
  projectId: string;
  snapshot: DocumentSnapshot;
  replaces: string | null;
  actorId: string;
}): Promise<IssueDocumentResult> {
  const { snapshot } = a;
  if (snapshot.docType === 'invoice') return { ok: false, code: 'invoice_not_issuable' };
  if (!isSellerConfigured(snapshot.seller)) return { ok: false, code: 'seller_not_configured' };

  // Objet téléversé et non encore rattaché à une ligne : à retirer si l'émission échoue (CR-01).
  let orphanPath: string | null = null;
  try {
    const rendered = await renderDocument(snapshot);
    const path = `${a.projectId}/${a.documentId}.pdf`;
    const admin = createSupabaseAdminClient();

    const up = await admin.storage.from(SV_DOCUMENTS_BUCKET).upload(path, rendered.buffer, {
      contentType: 'application/pdf',
      upsert: false,
      cacheControl: '31536000',
    });
    if (up.error) {
      // Doublon de stockage : si la ligne existe déjà, l'émission est idempotente. Jamais de nouvel essai.
      const existing = await admin
        .from('sv_project_documents')
        .select('id')
        .eq('id', a.documentId)
        .maybeSingle();
      if (!existing.error && existing.data) {
        return { ok: true, outcome: 'already_issued', documentId: a.documentId, mail: 'none' };
      }
      console.error('[documents/issue] upload_failed');
      return { ok: false, code: 'upload_failed' };
    }
    orphanPath = path;

    const rpc = await callRpc<{ outbox_ids?: string[] | null }>('documents/issue', 'sv_issue_document', {
      p_id: a.documentId,
      p_project_id: a.projectId,
      p_doc_type: snapshot.docType,
      p_revision: snapshot.revision,
      p_template_version: snapshot.templateVersion,
      p_reference: snapshot.reference,
      p_filename: buildFilename(snapshot.docType, snapshot.reference),
      p_storage_path: path,
      p_sha256: rendered.sha256,
      p_size: rendered.size,
      p_snapshot: snapshot,
      p_replaces: a.replaces,
      p_actor: a.actorId,
      p_document_label: DOC_LABELS[snapshot.docType],
    });
    if (!rpc.ok) {
      if (rpc.code !== 'sv_document_already_issued') {
        await removeOrphan(admin, orphanPath);
        orphanPath = null;
      }
      switch (rpc.code) {
        case 'sv_document_already_issued':
          // L'objet appartient à la ligne existante : ne jamais le supprimer.
          orphanPath = null;
          return { ok: true, outcome: 'already_issued', documentId: a.documentId, mail: 'none' };
        case 'sv_document_replaces_mismatch':
          return { ok: false, code: 'replaces_mismatch' };
        case 'sv_document_signed':
          return { ok: false, code: 'signed_no_replace' };
        case 'sv_document_revision_mismatch':
          return { ok: false, code: 'revision_mismatch' };
        default:
          return { ok: false, code: 'error' };
      }
    }

    orphanPath = null; // ligne créée : l'objet est référencé.
    const raw = rpc.data?.outbox_ids;
    const ids = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
    // Un échec d'envoi n'annule jamais l'émission (D-04) : le cron reprend le reste.
    const mail = await sendOutbox(ids);
    return { ok: true, outcome: 'issued', documentId: a.documentId, mail };
  } catch {
    console.error('[documents/issue] failed');
    if (orphanPath) await removeOrphan(createSupabaseAdminClient(), orphanPath);
    return { ok: false, code: 'error' };
  }
}
