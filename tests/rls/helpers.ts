import { createHash, createHmac, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = () => process.env.SV_TEST_SUPABASE_URL as string;
const pub = () => process.env.SV_TEST_PUBLISHABLE_KEY as string;
const secret = () => process.env.SV_TEST_SECRET_KEY as string;

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

export const PASSWORD = 'Rls-test-pass-0123!';

export interface TestUser {
  id: string;
  email: string;
  client: SupabaseClient;
}

const createdUsers: string[] = [];
const createdClients: string[] = [];

let svcInstance: SupabaseClient | null = null;
export function svc(): SupabaseClient {
  svcInstance ??= createClient(url(), secret(), noSession);
  return svcInstance;
}

export function anonClient(): SupabaseClient {
  return createClient(url(), pub(), noSession);
}

export function randomSiret(): string {
  let s = '';
  for (let i = 0; i < 14; i++) s += Math.floor(Math.random() * 10);
  return s;
}

/** Create a confirmed user with a password (throwaway branch only) and sign in. */
export async function makeUser(
  label: string,
  opts: { password?: boolean; metadata?: { user_metadata?: object; app_metadata?: object } } = {},
): Promise<TestUser> {
  const email = `rls-${label}-${randomUUID()}@example.test`;
  const withPassword = opts.password !== false;
  const { data, error } = await svc().auth.admin.createUser({
    email,
    ...(withPassword ? { password: PASSWORD } : {}),
    email_confirm: true,
    ...(opts.metadata ?? {}),
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  createdUsers.push(data.user.id);
  const client = anonClient();
  if (withPassword) {
    const res = await client.auth.signInWithPassword({ email, password: PASSWORD });
    if (res.error) throw new Error(`signIn failed: ${res.error.message}`);
  }
  return { id: data.user.id, email, client };
}

export async function makeClient(name: string, siret: string = randomSiret()): Promise<{ id: string; siret: string }> {
  const { data, error } = await svc().from('sv_clients').insert({ name, siret }).select('id').single();
  if (error || !data) throw new Error(`makeClient failed: ${error?.message}`);
  createdClients.push(data.id);
  return { id: data.id, siret };
}

export async function addMember(clientId: string, user: TestUser) {
  const { error } = await svc()
    .from('sv_client_members')
    .insert({ client_id: clientId, user_id: user.id, invited_email: user.email });
  if (error) throw new Error(`addMember failed: ${error.message}`);
}

export async function makeAdmin(user: TestUser) {
  const { error } = await svc().from('sv_admins').insert({ user_id: user.id, email: user.email });
  if (error) throw new Error(`makeAdmin failed: ${error.message}`);
}

export async function makeGeckoAdmin(user: TestUser) {
  const { error } = await svc().from('gecko_admins').insert({ id: user.id, email: user.email });
  if (error) throw new Error(`makeGeckoAdmin failed: ${error.message}`);
}

/** Track a user created outside makeUser (e.g. via public signUp) for cleanup. */
export function trackUser(id: string) {
  createdUsers.push(id);
}

/** Unique e-mail per call: the dedupe window is 9 months, never reuse an address across runs. */
export function uniqueEmail(label: string): string {
  return `rls-lead-${label}-${randomUUID()}@example.test`;
}

export interface LeadRpcResult {
  lead_id: string;
  contact_id: string;
  is_return: boolean;
  previous_lead_id: string | null;
}

export type LeadRpcOpts = Partial<{
  p_channel: string;
  p_nom: string;
  p_email: string;
  p_email_norm: string;
  p_phone: string | null;
  p_phone_norm: string | null;
  p_payload: object;
  p_consent_rgpd: boolean;
  p_source: object;
  p_first_touch: object;
  p_last_touch: object;
  p_ip_hash: string | null;
  p_consent: object | null;
}>;

/** Create a lead through the sv_ingest_lead RPC (service role). Throws on RPC error. */
export async function makeLeadViaRpc(opts: LeadRpcOpts = {}): Promise<LeadRpcResult> {
  const email = opts.p_email ?? opts.p_email_norm ?? uniqueEmail('x');
  const touch = {
    params: { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'test' },
    landing: '/',
    referrer: null,
    at: Date.now(),
  };
  const args = {
    p_channel: 'simulateur',
    p_nom: 'Test Lead',
    p_email: email,
    p_email_norm: opts.p_email_norm ?? email,
    p_phone: null,
    p_phone_norm: null,
    p_payload: {},
    p_consent_rgpd: true,
    p_source: { source: 'google', medium: 'cpc', campaign: 'test', kind: 'touch' },
    p_first_touch: touch,
    p_last_touch: touch,
    p_ip_hash: null,
    p_consent: null,
    ...opts,
  };
  args.p_email = email;
  const { data, error } = await svc().rpc('sv_ingest_lead', args);
  if (error) throw new Error(`sv_ingest_lead failed: ${error.message}`);
  return data as LeadRpcResult;
}

/**
 * Time travel for dedupe/purge/retention tests. Only touches last_contact_at:
 * the creation timestamp is frozen by the protect_lead_source trigger (sv_source_frozen).
 */
export async function backdateLead(leadId: string, months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  const { error } = await svc().from('sv_leads').update({ last_contact_at: d.toISOString() }).eq('id', leadId);
  if (error) throw new Error(`backdateLead failed: ${error.message}`);
}

/** Create a project through the sv_create_project RPC (service role). Returns the project id. */
export async function makeProject(
  clientId: string,
  opts: { title?: string; offer?: string; actor?: string | null } = {},
): Promise<string> {
  const { data, error } = await svc().rpc('sv_create_project', {
    p_client_id: clientId,
    p_actor: opts.actor ?? null,
    p_title: opts.title ?? 'Projet RLS',
    p_offer: opts.offer ?? 'site-vitrine',
  });
  if (error) throw new Error(`sv_create_project failed: ${error.message}`);
  return (data as { project_id: string }).project_id;
}

export interface PostFactOpts {
  actorKind?: string;
  actorId?: string | null;
  targetFactId?: number | null;
  reason?: string | null;
}

/** Append a project fact through the sv_post_project_fact RPC (service role). */
export async function postFact(
  projectId: string,
  type: string,
  opts: PostFactOpts = {},
): Promise<{ fact_id: number; changed: boolean }> {
  const { data, error } = await svc().rpc('sv_post_project_fact', {
    p_project_id: projectId,
    p_type: type,
    p_actor_kind: opts.actorKind ?? 'system',
    p_actor_id: opts.actorId ?? null,
    p_target_fact_id: opts.targetFactId ?? null,
    p_reason: opts.reason ?? null,
  });
  if (error) throw new Error(`sv_post_project_fact failed: ${error.message}`);
  return data as { fact_id: number; changed: boolean };
}

/** A lead moved to a convertible status (default 'qualified') through sv_set_lead_status. */
export async function makeConvertibleLead(status = 'qualified', opts: LeadRpcOpts = {}): Promise<LeadRpcResult> {
  const lead = await makeLeadViaRpc(opts);
  const { error } = await svc().rpc('sv_set_lead_status', {
    p_lead_id: lead.lead_id,
    p_status: status,
    p_actor: null,
    p_lost_reason: null,
    p_note: null,
  });
  if (error) throw new Error(`sv_set_lead_status failed: ${error.message}`);
  return lead;
}

export const DOCUMENTS_BUCKET = 'sv-documents';

const MINIMAL_PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n' +
    'trailer<</Root 1 0 R>>\n%%EOF\n',
);

/**
 * Issue a test document through the real storage upload + sv_issue_document RPC
 * (service role). Documents and snapshots are append-only: they are never cleaned up.
 */
export async function issueTestDocument(
  projectId: string,
  opts: {
    docType?: 'quote' | 'contract' | 'spec' | 'acceptance';
    replaces?: string | null;
    revision?: number;
    actor?: string | null;
    snapshot?: object;
  } = {},
): Promise<{
  id: string;
  path: string;
  result: { document_id: string; revision: number; outbox_ids: string[] };
}> {
  const id = randomUUID();
  const path = `${projectId}/${id}.pdf`;
  const up = await svc().storage.from(DOCUMENTS_BUCKET).upload(path, MINIMAL_PDF, {
    upsert: false,
    contentType: 'application/pdf',
  });
  if (up.error) throw new Error(`document upload failed: ${up.error.message}`);
  const revision = opts.revision ?? 1;
  const { data, error } = await svc().rpc('sv_issue_document', {
    p_id: id,
    p_project_id: projectId,
    p_doc_type: opts.docType ?? 'quote',
    p_revision: revision,
    p_template_version: 'v1',
    p_reference: `TEST-${revision}`,
    p_filename: `Test-${id}.pdf`,
    p_storage_path: path,
    p_sha256: createHash('sha256').update(MINIMAL_PDF).digest('hex'),
    p_size: MINIMAL_PDF.length,
    p_snapshot: opts.snapshot ?? { test: true },
    p_replaces: opts.replaces ?? null,
    p_actor: opts.actor ?? null,
    p_document_label: 'Devis',
  });
  if (error) throw new Error(`sv_issue_document failed: ${error.message}`);
  return { id, path, result: data as { document_id: string; revision: number; outbox_ids: string[] } };
}

// ---------------------------------------------------------------------------
// Phase 14 (electronic signature) helpers
// ---------------------------------------------------------------------------

const PROD_REF = 'ubxllsvanurkwkohzxau';

/** HMAC secret of the signature code (SV_TEST_ prefix so vitest.rls.config.ts loads it). Throws when missing. */
export function signatureTestSecret(): string {
  const s = process.env.SV_TEST_SIGNATURE_CODE_SECRET ?? process.env.SV_SIGNATURE_CODE_SECRET;
  if (!s) throw new Error('SV_TEST_SIGNATURE_CODE_SECRET is not set (see .env.test.local)');
  return s;
}
export const SIGNATURE_TEST_SECRET = {
  get value(): string {
    return signatureTestSecret();
  },
};

/** HMAC-SHA256(secret, `${documentId}:${userId}:${code}`) hex, same formula as the production codes module. */
export function testCodeHmac(documentId: string, userId: string, code: string): string {
  return createHmac('sha256', signatureTestSecret()).update(`${documentId}:${userId}:${code}`).digest('hex');
}

/**
 * Run a SQL statement on the throwaway branch through the Supabase CLI and return the raw output.
 * Refuses any URL containing the production ref.
 */
export function dbQuery(sql: string): string {
  const dbUrl = process.env.SV_TEST_DB_URL;
  if (!dbUrl) throw new Error('SV_TEST_DB_URL is required for dbQuery');
  if (dbUrl.includes(PROD_REF)) throw new Error(`dbQuery refused: target contains production ref ${PROD_REF}`);
  try {
    return execFileSync('supabase', ['db', 'query', '--db-url', `"${dbUrl}"`, `"${sql.replace(/"/g, '\\"')}"`], {
      encoding: 'utf8',
      stdio: 'pipe',
      shell: true,
    });
  } catch (e: any) {
    return `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
}

/** Complete the signatory section of a client's onboarding (service role upsert). */
export async function completeSignatory(clientId: string, name = 'Jeanne Test', role = 'Gérante') {
  const { error } = await svc()
    .from('sv_client_onboarding')
    .upsert({ client_id: clientId, signatory_name: name, signatory_role: role }, { onConflict: 'client_id' });
  if (error) throw new Error(`completeSignatory failed: ${error.message}`);
}

/**
 * Issue a signable document (quote, contract or acceptance) with a real snapshot.
 * sv_issue_document has no fact prerequisite, so no project fact is posted here.
 * The acceptance snapshot carries acceptanceCriteria (default: 3 criteria).
 */
export async function issueSignableDocument(
  projectId: string,
  docType: 'quote' | 'contract' | 'acceptance',
  opts: { criteria?: string[]; replaces?: string | null; revision?: number } = {},
) {
  const snapshot =
    docType === 'acceptance'
      ? { test: true, acceptanceCriteria: opts.criteria ?? ['Critère 1', 'Critère 2', 'Critère 3'] }
      : { test: true };
  return issueTestDocument(projectId, { docType, replaces: opts.replaces, revision: opts.revision, snapshot });
}

/**
 * Drive a full signature: consent, optional acceptance answers, code request and verify.
 * Returns the sv_verify_signature_code jsonb. Throws on any RPC error.
 */
export async function signTestDocument(
  documentId: string,
  user: { id: string },
  opts: { answers?: unknown[]; ip?: string; adminEmail?: string } = {},
): Promise<unknown> {
  const ip = opts.ip ?? '203.0.113.7';
  const consent = await svc().rpc('sv_record_signature_consent', {
    p_document_id: documentId,
    p_actor_id: user.id,
    p_ip: ip,
    p_consent_version: 'v1',
    p_payload: JSON.stringify({ version: 'v1' }),
  });
  if (consent.error) throw new Error(`sv_record_signature_consent failed: ${consent.error.message}`);
  if (opts.answers) {
    const acc = await svc().rpc('sv_submit_acceptance', {
      p_document_id: documentId,
      p_actor_id: user.id,
      p_ip: ip,
      p_answers: opts.answers,
      p_admin_email: opts.adminEmail ?? 'admin@example.test',
    });
    if (acc.error) throw new Error(`sv_submit_acceptance failed: ${acc.error.message}`);
  }
  const hmac = testCodeHmac(documentId, user.id, '123456');
  const req = await svc().rpc('sv_request_signature_code', {
    p_document_id: documentId,
    p_actor_id: user.id,
    p_ip: ip,
    p_code_hmac: hmac,
    p_consent_version: 'v1',
  });
  if (req.error) throw new Error(`sv_request_signature_code failed: ${req.error.message}`);
  const ver = await svc().rpc('sv_verify_signature_code', {
    p_document_id: documentId,
    p_actor_id: user.id,
    p_ip: ip,
    p_code_hmac: hmac,
  });
  if (ver.error) throw new Error(`sv_verify_signature_code failed: ${ver.error.message}`);
  return ver.data;
}

// ---------------------------------------------------------------------------
// Phase 15 (invoices and payments) helpers
// ---------------------------------------------------------------------------

/** Flag a client as a test client (series TFA/TAV). Locked by the DB once an invoice exists. */
export async function setClientTest(clientId: string, isTest: boolean) {
  const { error } = await svc().from('sv_clients').update({ is_test: isTest }).eq('id', clientId);
  if (error) throw new Error(`setClientTest failed: ${error.message}`);
}

/**
 * Reach contract_signed on a project. sv_post_project_fact enforces no prerequisite,
 * so the steps are posted in engine order: onboarding_completed, quote_accepted, contract_signed.
 */
export async function reachContractSigned(projectId: string) {
  await postFact(projectId, 'onboarding_completed', { actorKind: 'system' });
  await postFact(projectId, 'quote_accepted', { actorKind: 'admin' });
  await postFact(projectId, 'contract_signed', { actorKind: 'admin' });
}

/**
 * Reach acceptance_signed: contract_signed first, then deposit_received, production_completed
 * and acceptance_signed (engine order).
 */
export async function reachAcceptanceSigned(projectId: string) {
  await reachContractSigned(projectId);
  await postFact(projectId, 'deposit_received', { actorKind: 'admin' });
  await postFact(projectId, 'production_completed', { actorKind: 'admin' });
  await postFact(projectId, 'acceptance_signed', { actorKind: 'admin' });
}

export interface TestInvoiceLine {
  designation: string;
  quantity_milli: number;
  unit_code: string;
  unit_price_cents: number;
  line_total_cents: number;
}

/** Valid p_header (seller values from SELLER_V1, franchise VAT). totalExclCents must equal the lines sum. */
export function invoiceHeader(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    seller_legal_name: 'Anatholy Bricon',
    seller_trade_name: 'Sèvalys',
    seller_siret: '90098846000011',
    seller_address_line: '71 rue de Grand Cour',
    seller_postal_code: '37550',
    seller_city: 'Saint-Avertin',
    seller_vat_number: null,
    seller_iban: 'FR7628233000011010832334333',
    seller_bic: 'REVOFRP2',
    seller_email: 'contact@sevalys.com',
    buyer_name: 'RLS Client',
    buyer_siret: '12345678900012',
    buyer_siren: '123456789',
    buyer_address_line: '1 rue du Test',
    buyer_postal_code: '37000',
    buyer_city: 'Tours',
    buyer_vat_number: null,
    vat_regime: 'franchise',
    vat_exemption_code: 'VATEX-FR-FRANCHISE',
    vat_exemption_text: 'TVA non applicable, art. 293 B du CGI',
    payment_terms_days: 30,
    payment_terms_text: 'Paiement à 30 jours à compter de la date de facture, par virement',
    late_penalty_text: "Pénalités de retard : trois fois le taux d'intérêt légal",
    recovery_indemnity_text: 'Indemnité forfaitaire pour frais de recouvrement : 40 €',
    total_excl_tax_cents: 50000,
    vat_total_cents: 0,
    prepaid_cents: 0,
    template_version: 'v1',
    snapshot: { test: true },
    ...overrides,
  };
}

function defaultInvoiceLines(): TestInvoiceLine[] {
  return [
    { designation: 'Acompte site vitrine', quantity_milli: 1000, unit_code: 'C62', unit_price_cents: 50000, line_total_cents: 50000 },
  ];
}

/**
 * Issue an invoice through public.sv_issue_invoice (service role). Deterministic issue key
 * unless one is given. When lines are overridden without a header, the header total follows the lines.
 * Returns the RPC jsonb. Invoices are append-only: they are never cleaned up.
 */
export async function issueTestInvoice(
  projectId: string,
  opts: {
    kind?: 'deposit' | 'period' | 'final';
    lines?: TestInvoiceLine[];
    deductions?: unknown[];
    header?: Record<string, unknown>;
    issueKey?: string;
    id?: string;
    adminEmail?: string;
  } = {},
): Promise<{ invoice_id: string; number: string; issued_on: string; due_date: string; already: boolean; outbox_ids: string[] }> {
  const id = opts.id ?? randomUUID();
  const kind = opts.kind ?? 'deposit';
  const lines = opts.lines ?? defaultInvoiceLines();
  const totalExcl = lines.reduce((s, l) => s + l.line_total_cents, 0);
  const prepaid = (opts.deductions as { amount_cents: number }[] | undefined)?.reduce((s, d) => s + d.amount_cents, 0) ?? 0;
  const header = invoiceHeader({
    total_excl_tax_cents: totalExcl,
    prepaid_cents: prepaid,
    ...(kind === 'period' ? { service_period_start: '2026-10-01', service_period_end: '2026-10-31' } : {}),
    ...(opts.header ?? {}),
  });
  const { data, error } = await svc().rpc('sv_issue_invoice', {
    p_id: id,
    p_issue_key: opts.issueKey ?? `rls-inv-${id}`,
    p_project_id: projectId,
    p_kind: kind,
    p_header: header,
    p_lines: lines,
    p_deductions: opts.deductions ?? [],
    p_admin_email: opts.adminEmail ?? 'contact@sevalys.com',
  });
  if (error) throw new Error(`sv_issue_invoice failed: ${error.message}`);
  return data as any;
}

/** Issue a credit note through public.sv_issue_credit_note (service role). Default: total scope over the open amount. */
export async function issueTestCreditNote(
  originId: string,
  opts: {
    scope?: 'total' | 'partial';
    amountCents?: number;
    reason?: string;
    refundRequested?: boolean;
    lines?: TestInvoiceLine[];
    issueKey?: string;
    id?: string;
    createdBy?: string | null;
  } = {},
): Promise<{ credit_note_id: string; number: string; issued_on: string; already: boolean; outbox_ids: string[]; fully_credited: boolean }> {
  const id = opts.id ?? randomUUID();
  const amount = opts.amountCents ?? 50000;
  const lines =
    opts.lines ??
    [{ designation: 'Avoir', quantity_milli: 1000, unit_code: 'C62', unit_price_cents: amount, line_total_cents: amount }];
  const { data, error } = await svc().rpc('sv_issue_credit_note', {
    p_id: id,
    p_issue_key: opts.issueKey ?? `rls-cn-${id}`,
    p_origin_invoice_id: originId,
    p_scope: opts.scope ?? 'total',
    p_amount_cents: amount,
    p_reason: opts.reason ?? 'Avoir de test RLS',
    p_refund_requested: opts.refundRequested ?? false,
    p_lines: lines,
    p_snapshot: { test: true },
    p_created_by: opts.createdBy ?? null,
  });
  if (error) throw new Error(`sv_issue_credit_note failed: ${error.message}`);
  return data as any;
}

/** Record a checkout session (ids cs_test_ + random) for an invoice through sv_record_checkout_session. */
export async function recordTestSession(
  invoiceId: string,
  opts: { livemode?: boolean; amountCents?: number; sessionId?: string; expiresAt?: string } = {},
): Promise<{ sessionId: string; result: unknown }> {
  const sessionId = opts.sessionId ?? `cs_test_${randomUUID().replace(/-/g, '')}`;
  let amount = opts.amountCents;
  if (amount === undefined) {
    const inv = await svc().from('sv_invoices').select('net_to_pay_cents').eq('id', invoiceId).single();
    if (inv.error || !inv.data) throw new Error(`recordTestSession: invoice lookup failed: ${inv.error?.message}`);
    amount = Number(inv.data.net_to_pay_cents);
  }
  const { data, error } = await svc().rpc('sv_record_checkout_session', {
    p_invoice_id: invoiceId,
    p_session_id: sessionId,
    p_livemode: opts.livemode ?? false,
    p_url: `https://checkout.stripe.com/c/pay/${sessionId}`,
    p_amount_cents: amount,
    p_expires_at: opts.expiresAt ?? new Date(Date.now() + 23 * 3600 * 1000).toISOString(),
  });
  if (error) throw new Error(`sv_record_checkout_session failed: ${error.message}`);
  return { sessionId, result: data };
}

export interface ApplyTestEventArgs {
  type: string;
  kind: string;
  invoiceId?: string | null;
  eventId?: string;
  livemode?: boolean;
  objectId?: string;
  customerId?: string | null;
  paymentIntentId?: string | null;
  checkoutSessionId?: string | null;
  amountCents?: number | null;
  expectedCents?: number | null;
  currency?: string | null;
  method?: string | null;
  refundId?: string | null;
  adminEmail?: string;
}

/** Apply a Stripe event through sv_apply_stripe_event (ids evt_test_ + random, admin contact@sevalys.com). */
export async function applyTestEvent(args: ApplyTestEventArgs): Promise<any> {
  const { data, error } = await svc().rpc('sv_apply_stripe_event', {
    p_event_id: args.eventId ?? `evt_test_${randomUUID().replace(/-/g, '')}`,
    p_type: args.type,
    p_livemode: args.livemode ?? false,
    p_object_id: args.objectId ?? args.checkoutSessionId ?? args.paymentIntentId ?? `obj_test_${randomUUID().replace(/-/g, '')}`,
    p_kind: args.kind,
    p_invoice_id: args.invoiceId ?? null,
    p_customer_id: args.customerId ?? null,
    p_payment_intent_id: args.paymentIntentId ?? null,
    p_checkout_session_id: args.checkoutSessionId ?? null,
    p_amount_cents: args.amountCents ?? null,
    p_expected_cents: args.expectedCents ?? null,
    p_currency: args.currency ?? 'eur',
    p_method: args.method ?? null,
    p_refund_id: args.refundId ?? null,
    p_admin_email: args.adminEmail ?? 'contact@sevalys.com',
  });
  if (error) throw new Error(`sv_apply_stripe_event failed: ${error.message}`);
  return data;
}

// NOTE: cleanup() does NOT delete leads, contacts or sv_lead_events. Events are
// immutable (deny triggers) and leads are tombstoned only. The branch is
// throwaway; tests must always use uniqueEmail() so runs never collide.
// Clients are deleted by tracked id only, never by name or SIRET.
export async function cleanup() {
  for (const id of createdClients.splice(0)) {
    const { error } = await svc().from('sv_clients').delete().eq('id', id);
    // RESEARCH Pitfall 1: a client referenced by projects/facts (immutable) can no
    // longer be deleted; tolerate it, the branch is throwaway.
    if (error && !/violates foreign key|sv_immutable_table/.test(error.message)) {
      throw new Error(`cleanup client failed: ${error.message}`);
    }
  }
  for (const id of createdUsers.splice(0)) {
    await svc().auth.admin.deleteUser(id);
  }
}
