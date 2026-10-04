// PRECONDITION : l'appelant a déjà autorisé l'accès (requireAdmin + accès projet) ou s'exécute après une signature scellée.
// Lecture en service_role du contexte de facturation d'un projet (D-05, D-07, D-08, D-09).
import 'server-only';
import { clientPartyFrom } from '@/lib/documents/snapshot';
import type { ClientParty, ContractSnapshot, InvoiceKind } from '@/lib/documents/types';
import type { OnboardingRow } from '@/lib/projects/onboardingSchema';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { loadActiveSnapshot, loadProjectDocuments } from '@/lib/server/documents/read';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type InvoiceContextInvoice = {
  id: string;
  kind: InvoiceKind;
  number: string;
  issuedOn: string;
  totalInclTaxCents: number;
  netToPayCents: number;
  creditedCents: number;
};

export type InvoiceContext = {
  project: { id: string; title: string; offer: string; clientId: string };
  client: { id: string; name: string; siret: string | null; company: unknown; isTest: boolean };
  buyer: ClientParty;
  contract: { documentId: string; reference: string; quote: ContractSnapshot['quote'] } | null;
  quoteDocumentId: string | null;
  invoices: InvoiceContextInvoice[];
  contractSigned: boolean;
  acceptanceSigned: boolean;
};

function onboardingFrom(d: Row | null): OnboardingRow | null {
  if (!d) return null;
  return {
    companyConfirmedAt: d.company_confirmed_at ?? null,
    signatoryName: d.signatory_name ?? null,
    signatoryRole: d.signatory_role ?? null,
    projectContactName: d.project_contact_name ?? null,
    projectContactEmail: d.project_contact_email ?? null,
    projectContactPhone: d.project_contact_phone ?? null,
    billingSameAsCompany: d.billing_same_as_company ?? true,
    billingAddress: d.billing_address ?? null,
    vatStatus: d.vat_status ?? null,
    vatNumber: d.vat_number ?? null,
    existingSiteUrl: d.existing_site_url ?? null,
    socialLinks: Array.isArray(d.social_links) ? d.social_links : [],
    projectGoal: d.project_goal ?? null,
  };
}

/** Faits effectifs : un fait est annulé quand un fact_revoked le cible. */
function effective(facts: Row[], type: string): boolean {
  const revoked = new Set(facts.filter((f) => f.type === 'fact_revoked').map((f) => Number(f.target_fact_id)));
  return facts.some((f) => f.type === type && !revoked.has(Number(f.id)));
}

/** Null quand le projet est introuvable ou qu'une lecture échoue ; jamais de décision sur des données partielles. */
export async function loadInvoiceContext(projectId: string): Promise<InvoiceContext | null> {
  try {
    const admin = createSupabaseAdminClient();
    const proj = await admin
      .from('sv_projects')
      .select('id, title, offer, client_id')
      .eq('id', projectId)
      .maybeSingle();
    if (proj.error || !proj.data) return null;
    const p = proj.data as Row;

    const [cli, onb, facts, inv] = await Promise.all([
      admin.from('sv_clients').select('id, name, siret, company, is_test').eq('id', p.client_id).maybeSingle(),
      admin.from('sv_client_onboarding').select('*').eq('client_id', p.client_id).maybeSingle(),
      admin.from('sv_project_facts').select('id, type, target_fact_id').eq('project_id', projectId),
      admin
        .from('sv_invoices')
        .select('id, kind, number, issued_on, total_incl_tax_cents, net_to_pay_cents, credits_invoice_id')
        .eq('project_id', projectId)
        .order('issued_at', { ascending: true }),
    ]);
    if (cli.error || !cli.data || onb.error || facts.error || inv.error) return null;
    const c = cli.data as Row;

    const credited = new Map<string, number>();
    for (const r of (inv.data ?? []) as Row[]) {
      if (r.kind === 'credit_note' && r.credits_invoice_id) {
        const k = String(r.credits_invoice_id);
        credited.set(k, (credited.get(k) ?? 0) + Number(r.total_incl_tax_cents));
      }
    }
    const invoices: InvoiceContextInvoice[] = ((inv.data ?? []) as Row[])
      .filter((r) => r.kind !== 'credit_note')
      .map((r) => ({
        id: String(r.id),
        kind: r.kind as InvoiceKind,
        number: String(r.number),
        issuedOn: String(r.issued_on),
        totalInclTaxCents: Number(r.total_incl_tax_cents),
        netToPayCents: Number(r.net_to_pay_cents),
        creditedCents: credited.get(String(r.id)) ?? 0,
      }));

    const buyer = clientPartyFrom(
      { name: String(c.name), siret: c.siret ?? null, company: c.company },
      onboardingFrom((onb.data as Row | null) ?? null),
    );

    const active = await loadActiveSnapshot(admin, projectId, 'contract');
    let contract: InvoiceContext['contract'] = null;
    let quoteDocumentId: string | null = null;
    if (active && active.snapshot.docType === 'contract') {
      const snap = active.snapshot;
      contract = { documentId: active.doc.id, reference: snap.reference, quote: snap.quote };
      const docs = await loadProjectDocuments(admin, projectId);
      quoteDocumentId =
        docs.find((d) => d.docType === 'quote' && d.reference === snap.quote.reference)?.id ?? null;
    }

    const factRows = (facts.data ?? []) as Row[];
    return {
      project: { id: String(p.id), title: String(p.title), offer: String(p.offer), clientId: String(p.client_id) },
      client: {
        id: String(c.id),
        name: String(c.name),
        siret: c.siret ?? null,
        company: c.company,
        isTest: c.is_test === true,
      },
      buyer,
      contract,
      quoteDocumentId,
      invoices,
      contractSigned: effective(factRows, 'contract_signed'),
      acceptanceSigned: effective(factRows, 'acceptance_signed'),
    };
  } catch {
    console.error('[invoices/context] load failed');
    return null;
  }
}
