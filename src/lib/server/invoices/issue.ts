// PRECONDITION : l'appelant a autorisé l'action (requireAdmin + accès projet, ou signature scellée pour l'émission
// automatique). Écrit en service_role.
// Ordre en deux phases : RPC (numéro + lignes structurées + outbox) -> rendu depuis l'instantané stocké -> téléversement
// upsert:false -> rattachement unique du PDF. Un échec après l'attribution du numéro le conserve : le balayage termine le PDF.
import 'server-only';
import { createHash } from 'node:crypto';
import type { InvoiceKind, LedgerSnapshot } from '@/lib/documents/types';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { SV_DOCUMENTS_BUCKET } from '@/lib/server/documents/download';
import { aggregateMail } from '@/lib/server/documents/issue';
import { sendOutboxRow } from '@/lib/server/mail/outbox';
import { ADMIN_NOTIFY_EMAIL } from '@/lib/server/mail/rules';
import { callRpc } from '@/lib/server/rpc';
import type { CreditForm, IssueInput } from './build';
import { renderLedgerPdf } from './render';

export type { CreditForm, IssueInput, PeriodForm } from './build';

type Mail = 'sent' | 'pending' | 'failed' | 'none';
type Pdf = 'attached' | 'pending';

export type IssueInvoiceResult =
  | {
      ok: true;
      outcome: 'issued' | 'already_issued';
      invoiceId: string;
      number: string;
      mail: Mail;
      pdf: Pdf;
    }
  | { ok: false; code: string };

export type IssueCreditNoteResult =
  | {
      ok: true;
      outcome: 'issued' | 'already_issued';
      creditNoteId: string;
      number: string;
      fullyCredited: boolean;
      mail: Mail;
      pdf: Pdf;
    }
  | { ok: false; code: string };

type IssueRpcData = { invoice_id?: string; number?: string; already?: boolean; outbox_ids?: unknown };
type CreditRpcData = {
  credit_note_id?: string;
  number?: string;
  already?: boolean;
  outbox_ids?: unknown;
  fully_credited?: boolean;
};

function idsOf(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
}

/** Un échec d'envoi n'annule jamais l'émission (phase 13 D-04) : le cron reprend le reste. */
async function sendOutbox(ids: string[]): Promise<Mail> {
  if (ids.length === 0) return 'none';
  try {
    const results = await Promise.all(ids.map((id) => sendOutboxRow(id)));
    return aggregateMail(results);
  } catch {
    console.error('[invoices/issue] mail failed');
    return 'failed';
  }
}

function isAlreadyExists(err: unknown): boolean {
  const e = err as { message?: unknown; statusCode?: unknown; status?: unknown } | null;
  if (!e) return false;
  if (String(e.statusCode ?? e.status ?? '') === '409') return true;
  return typeof e.message === 'string' && /already exists|duplicate/i.test(e.message);
}

/**
 * Rend le PDF depuis l'instantané stocké et le rattache une seule fois. Une ligne pdf existante n'est jamais
 * re-rendue ; un objet déjà téléversé sans ligne est rattaché avec l'empreinte des octets stockés (D-18).
 */
export async function attachInvoicePdf(invoiceId: string): Promise<'attached' | 'already' | 'failed'> {
  try {
    const admin = createSupabaseAdminClient();
    const pdf = await admin.from('sv_invoice_pdfs').select('invoice_id').eq('invoice_id', invoiceId).maybeSingle();
    if (pdf.error) return 'failed';
    if (pdf.data) return 'already';

    const inv = await admin
      .from('sv_invoices')
      .select('id, project_id, snapshot')
      .eq('id', invoiceId)
      .maybeSingle();
    if (inv.error || !inv.data) return 'failed';
    const row = inv.data as { id: string; project_id: string; snapshot: LedgerSnapshot };
    const snapshot = row.snapshot;
    if (!snapshot || (snapshot.docType !== 'invoice' && snapshot.docType !== 'credit_note')) return 'failed';

    const path = `${row.project_id}/invoices/${row.id}.pdf`;
    const rendered = await renderLedgerPdf(snapshot);
    let sha256 = rendered.sha256;
    let size = rendered.size;

    const up = await admin.storage.from(SV_DOCUMENTS_BUCKET).upload(path, rendered.buffer, {
      contentType: 'application/pdf',
      upsert: false,
      cacheControl: '31536000',
    });
    if (up.error) {
      if (!isAlreadyExists(up.error)) {
        console.error('[invoices/issue] upload failed');
        return 'failed';
      }
      // Objet déjà téléversé (essai précédent) : empreinte des octets stockés, jamais du nouveau rendu.
      const dl = await admin.storage.from(SV_DOCUMENTS_BUCKET).download(path);
      if (dl.error || !dl.data) {
        console.error('[invoices/issue] stored object unreadable');
        return 'failed';
      }
      const bytes = Buffer.from(await dl.data.arrayBuffer());
      sha256 = createHash('sha256').update(bytes).digest('hex');
      size = bytes.length;
    }

    const att = await callRpc<{ attached?: boolean }>('invoices/issue', 'sv_attach_invoice_pdf', {
      p_invoice_id: invoiceId,
      p_storage_path: path,
      p_sha256: sha256,
      p_size: size,
      p_template_version: snapshot.templateVersion,
    });
    if (!att.ok) return 'failed';
    return att.data?.attached === false ? 'already' : 'attached';
  } catch {
    console.error('[invoices/issue] attach failed');
    return 'failed';
  }
}

async function pdfState(invoiceId: string): Promise<Pdf> {
  const r = await attachInvoicePdf(invoiceId);
  return r === 'failed' ? 'pending' : 'attached';
}

export async function issueInvoice(input: IssueInput): Promise<IssueInvoiceResult> {
  try {
    const rpc = await callRpc<IssueRpcData>('invoices/issue', 'sv_issue_invoice', {
      p_id: input.id,
      p_issue_key: input.issueKey,
      p_project_id: input.projectId,
      p_kind: input.kind satisfies InvoiceKind,
      p_header: input.header,
      p_lines: input.lines,
      p_deductions: input.deductions,
      p_admin_email: ADMIN_NOTIFY_EMAIL,
    });
    if (!rpc.ok) return { ok: false, code: rpc.code };
    const invoiceId = rpc.data?.invoice_id;
    const number = rpc.data?.number;
    if (typeof invoiceId !== 'string' || typeof number !== 'string') {
      console.error('[invoices/issue] unexpected rpc payload');
      return { ok: false, code: 'error' };
    }
    const already = rpc.data?.already === true;
    const pdf = await pdfState(invoiceId);
    const mail = already ? 'none' : await sendOutbox(idsOf(rpc.data?.outbox_ids));
    return { ok: true, outcome: already ? 'already_issued' : 'issued', invoiceId, number, mail, pdf };
  } catch {
    console.error('[invoices/issue] failed');
    return { ok: false, code: 'error' };
  }
}

export async function issueCreditNote(
  input: { id: string; issueKey: string } & CreditForm & {
      lines: object[];
      snapshot: object;
    },
): Promise<IssueCreditNoteResult> {
  try {
    const rpc = await callRpc<CreditRpcData>('invoices/issue', 'sv_issue_credit_note', {
      p_id: input.id,
      p_issue_key: input.issueKey,
      p_origin_invoice_id: input.originInvoiceId,
      p_scope: input.scope,
      p_amount_cents: input.amountCents,
      p_reason: input.reason,
      p_refund_requested: input.refundRequested,
      p_lines: input.lines,
      p_snapshot: input.snapshot,
      p_created_by: input.createdBy,
    });
    if (!rpc.ok) return { ok: false, code: rpc.code };
    const creditNoteId = rpc.data?.credit_note_id;
    const number = rpc.data?.number;
    if (typeof creditNoteId !== 'string' || typeof number !== 'string') {
      console.error('[invoices/issue] unexpected rpc payload');
      return { ok: false, code: 'error' };
    }
    const already = rpc.data?.already === true;
    const pdf = await pdfState(creditNoteId);
    const mail = already ? 'none' : await sendOutbox(idsOf(rpc.data?.outbox_ids));
    return {
      ok: true,
      outcome: already ? 'already_issued' : 'issued',
      creditNoteId,
      number,
      fullyCredited: rpc.data?.fully_credited === true,
      mail,
      pdf,
    };
  } catch {
    console.error('[invoices/issue] failed');
    return { ok: false, code: 'error' };
  }
}

/** Termine les PDF manquants (plus anciens d'abord). Ne lève jamais. */
export async function sweepMissingPdfs(limit: number): Promise<{ attached: number; failed: number }> {
  const out = { attached: 0, failed: 0 };
  try {
    const res = await createSupabaseAdminClient()
      .from('sv_invoices')
      .select('id, sv_invoice_pdfs(invoice_id)')
      .is('sv_invoice_pdfs', null)
      .order('issued_at', { ascending: true })
      .limit(limit);
    if (res.error || !Array.isArray(res.data)) {
      console.error('[invoices/issue] sweep list failed');
      return out;
    }
    for (const r of res.data as { id: string }[]) {
      const state = await attachInvoicePdf(String(r.id));
      if (state === 'failed') out.failed += 1;
      else out.attached += 1;
    }
  } catch {
    console.error('[invoices/issue] sweep failed');
  }
  return out;
}
