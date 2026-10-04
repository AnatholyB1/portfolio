// Téléchargement de factures émises. PRECONDITION : l'appelant a exécuté requireAdmin() ou requireClient().
// L'autorisation est la lecture RLS de la ligne ; le chemin n'est résolu qu'ici en service_role (D-18).
import 'server-only';
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { SV_DOCUMENTS_BUCKET } from '@/lib/server/documents/download';

/** Lien court (T-15-46). */
export const INVOICE_SIGNED_URL_SECONDS = 60;

export const SV_INVOICES_BUCKET = SV_DOCUMENTS_BUCKET;

type PdfRow = { storage_path: unknown; sha256: unknown };

async function readPdfRow(invoiceId: string): Promise<PdfRow | null> {
  const res = await createSupabaseAdminClient()
    .from('sv_invoice_pdfs')
    .select('storage_path, sha256')
    .eq('invoice_id', invoiceId)
    .maybeSingle();
  if (res.error || !res.data) return null;
  return res.data as PdfRow;
}

export async function createInvoiceDownloadUrl(
  rls: SupabaseClient,
  invoiceId: string,
): Promise<{ ok: true; url: string } | { ok: false; code: 'not_found' | 'not_ready' | 'error' }> {
  try {
    const inv = await rls.from('sv_invoices').select('id, number, kind').eq('id', invoiceId).maybeSingle();
    if (inv.error || !inv.data) return { ok: false, code: 'not_found' };
    const pdf = await readPdfRow(invoiceId);
    if (!pdf) return { ok: false, code: 'not_ready' };
    const prefix = String(inv.data.kind) === 'credit_note' ? 'Avoir' : 'Facture';
    const signed = await createSupabaseAdminClient()
      .storage.from(SV_INVOICES_BUCKET)
      .createSignedUrl(String(pdf.storage_path), INVOICE_SIGNED_URL_SECONDS, {
        download: `${prefix}-${String(inv.data.number)}.pdf`,
      });
    if (signed.error || !signed.data) {
      console.error('[invoices/download] signed url failed');
      return { ok: false, code: 'error' };
    }
    return { ok: true, url: signed.data.signedUrl };
  } catch {
    console.error('[invoices/download] download failed');
    return { ok: false, code: 'error' };
  }
}

/** Admin : recalcule le SHA-256 de l'objet stocké et le compare à celui du registre. */
export async function verifyInvoiceHash(invoiceId: string): Promise<'match' | 'mismatch' | 'missing'> {
  try {
    const pdf = await readPdfRow(invoiceId);
    if (!pdf) return 'missing';
    const file = await createSupabaseAdminClient().storage.from(SV_INVOICES_BUCKET).download(String(pdf.storage_path));
    if (file.error || !file.data) return 'missing';
    const hex = createHash('sha256')
      .update(Buffer.from(await file.data.arrayBuffer()))
      .digest('hex');
    return hex === String(pdf.sha256) ? 'match' : 'mismatch';
  } catch {
    console.error('[invoices/download] hash verify failed');
    return 'missing';
  }
}
