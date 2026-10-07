// PRECONDITION : l'appelant a déjà passé requireAdmin() et fournit le client RLS de l'admin. Aucune lecture service_role (D-14).
// Toutes les lectures demandent des colonnes explicitement accordées à `authenticated` ; le registre de paiements est lu
// par RLS sur ses six colonnes accordées. Un échec de lecture lève PilotageLoadError : jamais de total partiel ou nul.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { InvoiceRow, PaymentEventRow } from './billing';
import { COST_CATEGORIES, type CashBalanceRow, type CostCategory, type ProjectCostRow, type RecurringRow } from './costs';
import type { LeadSourceRow } from './attribution';
import type { FactRow, QuoteDocRow, SnapshotRow } from './quotes';
import { LEDGER_KINDS } from '@/lib/documents/invoiceStatus';

export const PILOTAGE_INVOICE_COLS =
  'id, project_id, client_id, kind, number, is_test, issued_on, due_date, total_excl_tax_cents, vat_total_cents, total_incl_tax_cents, prepaid_cents, net_to_pay_cents, vat_regime, credits_invoice_id';
export const PAYMENT_EVENT_COLS = 'id, invoice_id, kind, amount_cents, method, occurred_at';
export const QUOTE_DOC_COLS = 'id, project_id, doc_type, revision, reference, replaces_document_id, issued_at';
export const SNAPSHOT_COLS = 'document_id, data';
export const FACT_COLS = 'id, project_id, type, target_fact_id, occurred_at';
export const PROJECT_COLS = 'id, client_id, lead_id, title';
export const CLIENT_COLS = 'id, name, is_test';
export const LEAD_COLS = 'id, source_kind, source_source, source_medium, source_campaign';
export const RECURRING_COLS = 'id, series_id, label, category, amount_cents, frequency, starts_on, ends_on, stopped, created_at';
export const PROJECT_COST_COLS = 'id, project_id, incurred_on, category, label, amount_cents, vat_cents, voids_cost_id, created_at';
export const BALANCE_COLS = 'id, as_of, amount_cents, note, created_at';

const PAGE = 1000;
const MAX_PAGES = 20;
const SNAPSHOT_CHUNK = 50;

/** Échec de lecture du pilotage : jamais confondu avec une liste vide ni un total nul. */
export class PilotageLoadError extends Error {
  constructor() {
    super('pilotage_load_failed');
    this.name = 'PilotageLoadError';
  }
}

type Row = Record<string, unknown>;
type PageFn = (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>;

function fail(): never {
  console.error('[pilotage/load] read failed');
  throw new PilotageLoadError();
}

async function readAll(page: PageFn): Promise<Row[]> {
  const out: Row[] = [];
  for (let i = 0; i < MAX_PAGES; i++) {
    let res;
    try {
      res = await page(i * PAGE, i * PAGE + PAGE - 1);
    } catch {
      return fail();
    }
    if (res.error) return fail();
    const rows = (res.data ?? []) as Row[];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
  // Plus de 20 pages : jamais de troncature silencieuse (Pitfall 9).
  return fail();
}

async function readOnce(run: () => PromiseLike<{ data: unknown; error: unknown }>): Promise<Row[]> {
  let res;
  try {
    res = await run();
  } catch {
    return fail();
  }
  if (res.error) return fail();
  return (res.data ?? []) as Row[];
}

function int(v: unknown): number {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  if (typeof n !== 'number' || !Number.isSafeInteger(n)) return fail();
  return n;
}
const intOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : int(v));
function str(v: unknown): string {
  if (typeof v !== 'string') return fail();
  return v;
}
const strOrNull = (v: unknown): string | null => (v === null || v === undefined ? null : str(v));
function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T {
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) return fail();
  return v as T;
}

const INVOICE_KINDS = ['deposit', 'period', 'final', 'credit_note'] as const;
const VAT_REGIMES = ['franchise', 'standard'] as const;
const FREQUENCIES = ['monthly', 'yearly'] as const;
const LEAD_KINDS = ['touch', 'direct', 'legacy'] as const;

export type PilotageRows = {
  invoices: InvoiceRow[];
  paymentEvents: PaymentEventRow[];
  quoteDocs: QuoteDocRow[];
  snapshots: SnapshotRow[];
  facts: FactRow[];
  projects: { id: string; clientId: string; leadId: string | null; title: string }[];
  clients: { id: string; name: string; isTest: boolean }[];
  leads: LeadSourceRow[];
  recurringCosts: RecurringRow[];
  projectCosts: ProjectCostRow[];
  cashBalances: CashBalanceRow[];
};

async function fetchInvoices(rls: SupabaseClient): Promise<InvoiceRow[]> {
  const rows = await readAll((a, b) => rls.from('sv_invoices').select(PILOTAGE_INVOICE_COLS).order('id').range(a, b));
  return rows.map((r) => ({
    id: str(r.id),
    projectId: str(r.project_id),
    clientId: str(r.client_id),
    kind: oneOf(r.kind, INVOICE_KINDS),
    number: str(r.number),
    isTest: r.is_test === true,
    issuedOn: str(r.issued_on),
    dueDate: strOrNull(r.due_date),
    totalExclTaxCents: int(r.total_excl_tax_cents),
    vatTotalCents: int(r.vat_total_cents),
    totalInclTaxCents: int(r.total_incl_tax_cents),
    prepaidCents: int(r.prepaid_cents),
    netToPayCents: int(r.net_to_pay_cents),
    vatRegime: oneOf(r.vat_regime, VAT_REGIMES),
    creditsInvoiceId: strOrNull(r.credits_invoice_id),
  }));
}

async function fetchPaymentEvents(rls: SupabaseClient): Promise<PaymentEventRow[]> {
  const rows = await readAll((a, b) =>
    rls.from('sv_invoice_payment_events').select(PAYMENT_EVENT_COLS).order('id').range(a, b),
  );
  // Un évènement sans facture est une anomalie déjà signalée ailleurs (A5) : il ne compte dans aucun total.
  return rows
    .filter((r) => r.invoice_id !== null && r.invoice_id !== undefined)
    .map((r) => ({
      id: int(r.id),
      invoiceId: str(r.invoice_id),
      kind: oneOf(r.kind, LEDGER_KINDS),
      amountCents: intOrNull(r.amount_cents),
      method: strOrNull(r.method),
      occurredAt: str(r.occurred_at),
    }));
}

async function fetchQuoteDocs(rls: SupabaseClient): Promise<QuoteDocRow[]> {
  const rows = await readAll((a, b) =>
    rls.from('sv_project_documents').select(QUOTE_DOC_COLS).eq('doc_type', 'quote').order('id').range(a, b),
  );
  return rows.map((r) => ({
    id: str(r.id),
    projectId: str(r.project_id),
    revision: int(r.revision),
    reference: str(r.reference),
    replacesDocumentId: strOrNull(r.replaces_document_id),
    issuedAt: str(r.issued_at),
  }));
}

async function fetchSnapshots(rls: SupabaseClient, docIds: string[]): Promise<SnapshotRow[]> {
  const out: SnapshotRow[] = [];
  for (let i = 0; i < docIds.length; i += SNAPSHOT_CHUNK) {
    const chunk = docIds.slice(i, i + SNAPSHOT_CHUNK);
    const rows = await readOnce(() => rls.from('sv_document_snapshots').select(SNAPSHOT_COLS).in('document_id', chunk));
    for (const r of rows) out.push({ documentId: str(r.document_id), data: r.data });
  }
  return out;
}

async function fetchFacts(rls: SupabaseClient): Promise<FactRow[]> {
  const rows = await readAll((a, b) =>
    rls
      .from('sv_project_facts')
      .select(FACT_COLS)
      .in('type', ['contract_signed', 'fact_revoked'])
      .order('id')
      .range(a, b),
  );
  return rows.map((r) => ({
    id: int(r.id),
    projectId: str(r.project_id),
    type: str(r.type),
    targetFactId: intOrNull(r.target_fact_id),
    occurredAt: str(r.occurred_at),
  }));
}

async function fetchProjects(rls: SupabaseClient): Promise<PilotageRows['projects']> {
  const rows = await readAll((a, b) => rls.from('sv_projects').select(PROJECT_COLS).order('id').range(a, b));
  return rows.map((r) => ({
    id: str(r.id),
    clientId: str(r.client_id),
    leadId: strOrNull(r.lead_id),
    title: str(r.title),
  }));
}

async function fetchClients(rls: SupabaseClient): Promise<PilotageRows['clients']> {
  const rows = await readAll((a, b) => rls.from('sv_clients').select(CLIENT_COLS).order('id').range(a, b));
  return rows.map((r) => ({ id: str(r.id), name: str(r.name), isTest: r.is_test === true }));
}

async function fetchLeads(rls: SupabaseClient): Promise<LeadSourceRow[]> {
  const rows = await readAll((a, b) => rls.from('sv_leads').select(LEAD_COLS).order('id').range(a, b));
  return rows.map((r) => ({
    id: str(r.id),
    sourceKind: oneOf(r.source_kind, LEAD_KINDS),
    sourceSource: str(r.source_source),
    sourceMedium: str(r.source_medium),
    sourceCampaign: strOrNull(r.source_campaign),
  }));
}

async function fetchRecurring(rls: SupabaseClient): Promise<RecurringRow[]> {
  const rows = await readAll((a, b) => rls.from('sv_recurring_costs').select(RECURRING_COLS).order('id').range(a, b));
  return rows.map((r) => ({
    id: int(r.id),
    seriesId: str(r.series_id),
    label: str(r.label),
    category: oneOf<CostCategory>(r.category, COST_CATEGORIES),
    amountCents: int(r.amount_cents),
    frequency: oneOf(r.frequency, FREQUENCIES),
    startsOn: str(r.starts_on),
    endsOn: strOrNull(r.ends_on),
    stopped: r.stopped === true,
    createdAt: str(r.created_at),
  }));
}

async function fetchProjectCosts(rls: SupabaseClient): Promise<ProjectCostRow[]> {
  const rows = await readAll((a, b) => rls.from('sv_project_costs').select(PROJECT_COST_COLS).order('id').range(a, b));
  return rows.map((r) => ({
    id: int(r.id),
    projectId: str(r.project_id),
    incurredOn: str(r.incurred_on),
    category: oneOf<CostCategory>(r.category, COST_CATEGORIES),
    label: str(r.label),
    amountCents: int(r.amount_cents),
    vatCents: intOrNull(r.vat_cents),
    voidsCostId: intOrNull(r.voids_cost_id),
    createdAt: str(r.created_at),
  }));
}

async function fetchBalances(rls: SupabaseClient): Promise<CashBalanceRow[]> {
  const rows = await readAll((a, b) => rls.from('sv_cash_balances').select(BALANCE_COLS).order('id').range(a, b));
  return rows.map((r) => ({
    id: int(r.id),
    asOf: str(r.as_of),
    amountCents: int(r.amount_cents),
    note: strOrNull(r.note),
    createdAt: str(r.created_at),
  }));
}

export async function loadPilotageRows(rls: SupabaseClient): Promise<PilotageRows> {
  const [invoices, paymentEvents, quoteDocs, facts, projects, clients, leads, recurringCosts, projectCosts, cashBalances] =
    await Promise.all([
      fetchInvoices(rls),
      fetchPaymentEvents(rls),
      fetchQuoteDocs(rls),
      fetchFacts(rls),
      fetchProjects(rls),
      fetchClients(rls),
      fetchLeads(rls),
      fetchRecurring(rls),
      fetchProjectCosts(rls),
      fetchBalances(rls),
    ]);
  const snapshots = await fetchSnapshots(
    rls,
    quoteDocs.map((d) => d.id),
  );
  return { invoices, paymentEvents, quoteDocs, snapshots, facts, projects, clients, leads, recurringCosts, projectCosts, cashBalances };
}

export type CostsRegisterRows = {
  recurring: RecurringRow[];
  projectCosts: ProjectCostRow[];
  balances: CashBalanceRow[];
  projects: { id: string; title: string; clientName: string; isTest: boolean }[];
};

export async function loadCostsRegister(rls: SupabaseClient): Promise<CostsRegisterRows> {
  const [recurring, projectCosts, balances, projects, clients] = await Promise.all([
    fetchRecurring(rls),
    fetchProjectCosts(rls),
    fetchBalances(rls),
    fetchProjects(rls),
    fetchClients(rls),
  ]);
  const clientById = new Map(clients.map((c) => [c.id, c]));
  return {
    recurring,
    projectCosts,
    balances,
    projects: projects.map((p) => {
      const c = clientById.get(p.clientId);
      return { id: p.id, title: p.title, clientName: c?.name ?? '', isTest: c?.isTest === true };
    }),
  };
}
