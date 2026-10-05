// PRECONDITION : appelé après une signature scellée (finalizeSignature) ou depuis la route cron protégée par CRON_SECRET.
// Émission automatique de l'acompte (contrat signé, D-07) et de la facture finale (PV signé, D-09), idempotente.
import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { buildDepositInput, buildFinalInput } from './build';
import { loadInvoiceContext, type InvoiceContext } from './context';
import { attachInvoicePdf, issueInvoice, sweepMissingPdfs } from './issue';

export type EnsureResult = 'issued' | 'exists' | 'not_ready' | 'nothing_to_invoice' | 'failed';

export type SweepResult = {
  deposits: number;
  finals: number;
  skipped: number;
  pdfs: { attached: number; failed: number };
  failed: number;
};

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : '';
}

async function ensure(projectId: string, kind: 'deposit' | 'final'): Promise<EnsureResult> {
  try {
    const now = new Date();
    const ctx: InvoiceContext | null = await loadInvoiceContext(projectId);
    if (!ctx) return 'not_ready';
    if (kind === 'deposit' ? !ctx.contractSigned : !ctx.acceptanceSigned) return 'not_ready';

    const existing = ctx.invoices.find((i) => i.kind === kind);
    if (existing) {
      await attachInvoicePdf(existing.id); // no-op quand le PDF est déjà rattaché
      return 'exists';
    }

    let input;
    try {
      input = kind === 'deposit' ? buildDepositInput(ctx, now) : buildFinalInput(ctx, now);
    } catch (e) {
      const m = messageOf(e);
      if (m === 'nothing_to_invoice') {
        console.error(
          kind === 'final'
            ? '[invoices/auto] final_nothing_to_invoice: post balance_received manually'
            : '[invoices/auto] deposit_nothing_to_invoice',
        );
        return 'nothing_to_invoice';
      }
      if (m === 'over_invoiced') console.error('[invoices/auto] over_invoiced');
      else console.error(`[invoices/auto] ${kind}_build_failed`);
      return 'failed';
    }

    const res = await issueInvoice(input);
    if (!res.ok) {
      console.error(`[invoices/auto] ${kind}_issue_failed`);
      return 'failed';
    }
    return res.outcome === 'issued' ? 'issued' : 'exists';
  } catch {
    console.error(`[invoices/auto] ${kind}_failed`);
    return 'failed';
  }
}

export function ensureDepositInvoice(projectId: string): Promise<EnsureResult> {
  return ensure(projectId, 'deposit');
}

export function ensureFinalInvoice(projectId: string): Promise<EnsureResult> {
  return ensure(projectId, 'final');
}

/** Projets (les plus anciens d'abord) dont le fait effectif existe mais sans facture du type voulu. */
function pending(facts: Row[], invoices: Row[], factType: string, kind: string, limit: number): string[] {
  const revoked = new Set(facts.filter((f) => f.type === 'fact_revoked').map((f) => Number(f.target_fact_id)));
  const invoiced = new Set(invoices.filter((i) => i.kind === kind).map((i) => String(i.project_id)));
  const out: string[] = [];
  const sorted = facts
    .filter((f) => f.type === factType && !revoked.has(Number(f.id)))
    .sort((a, b) => Number(a.id) - Number(b.id));
  for (const f of sorted) {
    const pid = String(f.project_id);
    if (invoiced.has(pid) || out.includes(pid)) continue;
    out.push(pid);
    if (out.length >= limit) break;
  }
  return out;
}

export async function sweepInvoices(limit = 10): Promise<SweepResult> {
  const result: SweepResult = { deposits: 0, finals: 0, skipped: 0, pdfs: { attached: 0, failed: 0 }, failed: 0 };
  const tally = (r: EnsureResult, key: 'deposits' | 'finals') => {
    if (r === 'issued') result[key] += 1;
    else if (r === 'nothing_to_invoice') result.skipped += 1;
    else if (r === 'failed') result.failed += 1;
  };
  try {
    const admin = createSupabaseAdminClient();
    const [facts, invoices] = await Promise.all([
      admin
        .from('sv_project_facts')
        .select('id, project_id, type, target_fact_id')
        .in('type', ['contract_signed', 'acceptance_signed', 'fact_revoked']),
      admin.from('sv_invoices').select('project_id, kind').in('kind', ['deposit', 'final']),
    ]);
    if (facts.error || invoices.error) {
      console.error('[invoices/auto] sweep_read_failed');
      result.failed += 1;
    } else {
      const f = (facts.data ?? []) as Row[];
      const inv = (invoices.data ?? []) as Row[];
      for (const pid of pending(f, inv, 'contract_signed', 'deposit', limit)) {
        tally(await ensureDepositInvoice(pid), 'deposits');
      }
      for (const pid of pending(f, inv, 'acceptance_signed', 'final', limit)) {
        tally(await ensureFinalInvoice(pid), 'finals');
      }
    }
  } catch {
    console.error('[invoices/auto] sweep_failed');
    result.failed += 1;
  }
  try {
    result.pdfs = await sweepMissingPdfs(limit);
  } catch {
    console.error('[invoices/auto] sweep_pdfs_failed');
  }
  return result;
}
