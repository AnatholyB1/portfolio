// Lectures de la file « À traiter » de l'accueil admin. PRÉCONDITION : l'appelant a passé
// requireAdmin() et fournit le client RLS de l'admin (jamais service_role). Chaque tuile
// est lue séparément et en parallèle : un échec donne `null` (affiché « lecture impossible »),
// jamais un zéro trompeur. Aucune migration : uniquement des tables et vues déjà lues ailleurs.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { parisDateOf } from '@/lib/documents/dates';
import { countDocumentsToSign, type PendingDoc, type ProjectFact } from '@/lib/documents/pendingSignatures';
import type { DocType } from '@/lib/documents/types';
import type { ActorKind, FactType } from '@/lib/projects/steps';
import type { QueueCounts } from '@/lib/admin/workQueue';
import { unpaidInvoices, type InvoiceRow, type PaymentEventRow } from '@/lib/server/pilotage/billing';
import { PAYMENT_EVENT_COLS, PILOTAGE_INVOICE_COLS } from '@/lib/server/pilotage/load';
import { loadAdminProjects } from '@/lib/server/projects/read';

type Row = Record<string, unknown>;

// Au-delà de ces plafonds un décompte serait faux : la tuile passe en « lecture impossible ».
const DOC_CAP = 1000;
const FACT_CAP = 5000;
const INVOICE_CAP = 300;
const EVENT_CAP = 3000;
const SUPPRESSION_CAP = 500;
const REVIEW_WINDOW_DAYS = 7;

async function safe(label: string, run: () => Promise<number>): Promise<number | null> {
  try {
    return await run();
  } catch {
    // Aucune donnée personnelle dans le journal.
    console.error(`[admin/workQueue] ${label} failed`);
    return null;
  }
}

function rows(res: { data: unknown; error: unknown }, cap?: number): Row[] {
  if (res.error) throw new Error('read_failed');
  const data = (res.data ?? []) as Row[];
  if (cap !== undefined && data.length >= cap) throw new Error('cap_reached');
  return data;
}

function count(res: { count: number | null; error: unknown }): number {
  if (res.error) throw new Error('read_failed');
  return res.count ?? 0;
}

async function newLeads(supabase: SupabaseClient): Promise<number> {
  return count(
    await supabase
      .from('sv_leads_admin_v')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new')
      .is('erased_at', null),
  );
}

async function returningLeads(supabase: SupabaseClient): Promise<number> {
  return count(
    await supabase
      .from('sv_leads_admin_v')
      .select('id', { count: 'exact', head: true })
      .eq('unseen_return', true),
  );
}

/** Projets en cours qui attendent Sèvalys (émission d'un document ou d'une facture, production). */
async function projectsToPrepare(supabase: SupabaseClient, now: Date): Promise<number> {
  const projects = await loadAdminProjects(supabase, now);
  return projects.filter((p) => !p.state.done && p.state.waitingOn === 'admin').length;
}

/**
 * Documents signables (devis, contrat, recette) non remplacés et dont le fait de signature n'est pas en vigueur.
 * Même règle que le portail et la fiche projet (statut dérivé des faits) : un fait posé à la main, sans ligne de
 * signature électronique, ferme bien le document.
 */
async function documentsToSign(supabase: SupabaseClient): Promise<number> {
  const [docRes, factRes] = await Promise.all([
    supabase
      .from('sv_project_documents')
      .select('id, project_id, doc_type, revision, replaces_document_id, issued_at')
      .in('doc_type', ['quote', 'contract', 'acceptance'])
      .limit(DOC_CAP),
    supabase
      .from('sv_project_facts')
      .select('id, project_id, type, target_fact_id, actor_kind, created_at')
      .limit(FACT_CAP),
  ]);
  const docs: PendingDoc[] = rows(docRes, DOC_CAP).map((d) => ({
    id: String(d.id),
    projectId: String(d.project_id),
    docType: d.doc_type as DocType,
    revision: Number(d.revision),
    replacesDocumentId: typeof d.replaces_document_id === 'string' ? d.replaces_document_id : null,
    issuedAt: String(d.issued_at),
  }));
  const facts: ProjectFact[] = rows(factRes, FACT_CAP).map((f) => ({
    id: Number(f.id),
    projectId: String(f.project_id),
    type: f.type as FactType,
    targetFactId: f.target_fact_id === null || f.target_fact_id === undefined ? null : Number(f.target_fact_id),
    actorKind: f.actor_kind as ActorKind,
    createdAt: String(f.created_at),
  }));
  return countDocumentsToSign(docs, facts);
}

function toInvoice(r: Row): InvoiceRow {
  const n = (v: unknown) => {
    const x = Number(v);
    if (!Number.isSafeInteger(x)) throw new Error('bad_number');
    return x;
  };
  return {
    id: String(r.id),
    projectId: String(r.project_id),
    clientId: String(r.client_id),
    kind: r.kind as InvoiceRow['kind'],
    number: String(r.number),
    isTest: r.is_test === true,
    issuedOn: String(r.issued_on),
    dueDate: typeof r.due_date === 'string' ? r.due_date : null,
    totalExclTaxCents: n(r.total_excl_tax_cents),
    vatTotalCents: n(r.vat_total_cents),
    totalInclTaxCents: n(r.total_incl_tax_cents),
    prepaidCents: n(r.prepaid_cents),
    netToPayCents: n(r.net_to_pay_cents),
    vatRegime: r.vat_regime as InvoiceRow['vatRegime'],
    creditsInvoiceId: typeof r.credits_invoice_id === 'string' ? r.credits_invoice_id : null,
  };
}

/** Factures (hors test) échues et non soldées, avoirs et paiements déduits (même règle que le pilotage). */
async function overdueInvoices(supabase: SupabaseClient, today: string): Promise<number> {
  const invRes = await supabase
    .from('sv_invoices')
    .select(PILOTAGE_INVOICE_COLS)
    .neq('kind', 'credit_note')
    .eq('is_test', false)
    .lt('due_date', today)
    .limit(INVOICE_CAP);
  const invoices = rows(invRes, INVOICE_CAP).map(toInvoice);
  if (invoices.length === 0) return 0;
  const ids = invoices.map((i) => i.id);

  const [evRes, creditRes] = await Promise.all([
    supabase.from('sv_invoice_payment_events').select(PAYMENT_EVENT_COLS).in('invoice_id', ids).limit(EVENT_CAP),
    supabase.from('sv_invoices').select(PILOTAGE_INVOICE_COLS).eq('kind', 'credit_note').in('credits_invoice_id', ids),
  ]);
  const events: PaymentEventRow[] = rows(evRes, EVENT_CAP).map((r) => ({
    id: Number(r.id),
    invoiceId: String(r.invoice_id),
    kind: r.kind as PaymentEventRow['kind'],
    amountCents: r.amount_cents === null || r.amount_cents === undefined ? null : Number(r.amount_cents),
    method: typeof r.method === 'string' ? r.method : null,
    occurredAt: String(r.occurred_at),
  }));
  const credits = rows(creditRes).map(toInvoice);

  return unpaidInvoices([...invoices, ...credits], events, today, 'ttc', false).filter(
    (u) => u.overdue && u.dueDate !== null,
  ).length;
}

/** Adresses bloquées pour plainte ou rebond définitif et non réactivées. */
async function suppressionAnomalies(supabase: SupabaseClient): Promise<number> {
  const supRes = await supabase
    .from('sv_mail_suppressions')
    .select('id')
    .in('cause', ['complaint', 'bounce_permanent'])
    .limit(SUPPRESSION_CAP);
  const sup = rows(supRes, SUPPRESSION_CAP);
  if (sup.length === 0) return 0;
  const liftRes = await supabase
    .from('sv_mail_suppression_lifts')
    .select('suppression_id')
    .in(
      'suppression_id',
      sup.map((s) => s.id),
    );
  const lifted = new Set(rows(liftRes).map((l) => Number(l.suppression_id)));
  return sup.filter((s) => !lifted.has(Number(s.id))).length;
}

async function recentReviews(supabase: SupabaseClient, now: Date): Promise<number> {
  const since = new Date(now.getTime() - REVIEW_WINDOW_DAYS * 86_400_000).toISOString();
  return count(
    await supabase.from('sv_reviews').select('id', { count: 'exact', head: true }).gte('published_at', since),
  );
}

export async function loadWorkQueue(supabase: SupabaseClient, now: Date = new Date()): Promise<QueueCounts> {
  const today = parisDateOf(now);
  const [prep, newL, retL, docs, inv, sup, rev] = await Promise.all([
    safe('projectsToPrepare', () => projectsToPrepare(supabase, now)),
    safe('newLeads', () => newLeads(supabase)),
    safe('returningLeads', () => returningLeads(supabase)),
    safe('documentsToSign', () => documentsToSign(supabase)),
    safe('overdueInvoices', () => overdueInvoices(supabase, today)),
    safe('suppressionAnomalies', () => suppressionAnomalies(supabase)),
    safe('recentReviews', () => recentReviews(supabase, now)),
  ]);
  return {
    projectsToPrepare: prep,
    newLeads: newL,
    returningLeads: retL,
    documentsToSign: docs,
    overdueInvoices: inv,
    suppressionAnomalies: sup,
    recentReviews: rev,
  };
}
