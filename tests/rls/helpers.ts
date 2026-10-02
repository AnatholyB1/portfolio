import { randomUUID } from 'node:crypto';
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
