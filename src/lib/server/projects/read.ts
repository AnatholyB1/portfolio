// Couche de lecture partagée portail / admin (D-10, D-16, D-20, D-21, D-22).
// Toutes les lectures passent par le client RLS de l'appelant avec des colonnes explicites.
// Seule exception : la RPC des dernières connexions via callRpc (service_role), après requireAdmin().
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { callRpc } from '@/lib/server/rpc';
import { PENDING_UPLOAD_HIDE_HOURS } from '@/lib/projects/fileRules';
import { deriveProjectState, type ActorKind, type Fact, type FactType, type ProjectState } from '@/lib/projects/steps';
import { classifyProject, lastActivity, type AdminProjectRow } from '@/lib/projects/blocking';
import type { OnboardingRow } from '@/lib/projects/onboardingSchema';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const PROJECT_COLS = 'id, client_id, lead_id, title, offer, started_at, created_at';
const FACT_COLS = 'id, project_id, type, target_fact_id, actor_kind, occurred_at, created_at';
const NOTE_COLS = 'fact_id, body';
const ONBOARDING_COLS =
  'client_id, company_confirmed_at, signatory_name, signatory_role, project_contact_name, project_contact_email, project_contact_phone, billing_same_as_company, billing_address, vat_status, vat_number, existing_site_url, social_links, project_goal, updated_at';
const FILE_COLS =
  'id, project_id, storage_path, filename, mime, size_bytes, uploaded_by_kind, status, created_at, ready_at';
const LINK_COLS = 'id, project_id, title, url, created_at';
const CONSENT_COLS = 'id, project_id, granted, text_version, text_snapshot, created_at';
const CLIENT_COLS = 'id, name, siret, company';

export type ProjectSummary = {
  id: string;
  clientId: string;
  title: string;
  offer: string;
  startedAt: string;
};
export type FileRow = {
  id: string;
  projectId: string;
  storagePath: string;
  filename: string;
  mime: string;
  sizeBytes: number;
  uploadedByKind: 'client' | 'admin';
  status: 'pending' | 'ready';
  createdAt: string;
  readyAt: string | null;
};
export type LinkRow = { id: string; projectId: string; title: string; url: string; createdAt: string };
export type ConsentRow = {
  id: number;
  projectId: string;
  granted: boolean;
  textVersion: string;
  textSnapshot: string;
  createdAt: string;
};
export type ClientInfo = { id: string; name: string; siret: string | null; company: unknown };
export type ProjectBundle = {
  project: ProjectSummary;
  client: ClientInfo;
  facts: Fact[];
  notes: Record<number, string>;
  onboarding: OnboardingRow | null;
  files: FileRow[];
  links: LinkRow[];
  consents: ConsentRow[];
  state: ProjectState;
  lastActivityAt: string;
};

const toProject = (d: Row): ProjectSummary => ({
  id: d.id,
  clientId: d.client_id,
  title: d.title,
  offer: d.offer,
  startedAt: d.started_at,
});
const toFact = (d: Row): Fact => ({
  id: Number(d.id),
  type: d.type as FactType,
  targetFactId: d.target_fact_id === null || d.target_fact_id === undefined ? null : Number(d.target_fact_id),
  actorKind: d.actor_kind as ActorKind,
  createdAt: d.created_at,
});
const toFile = (d: Row): FileRow => ({
  id: d.id,
  projectId: d.project_id,
  storagePath: d.storage_path,
  filename: d.filename,
  mime: d.mime,
  sizeBytes: Number(d.size_bytes),
  uploadedByKind: d.uploaded_by_kind,
  status: d.status,
  createdAt: d.created_at,
  readyAt: d.ready_at ?? null,
});
const toLink = (d: Row): LinkRow => ({
  id: d.id,
  projectId: d.project_id,
  title: d.title,
  url: d.url,
  createdAt: d.created_at,
});
const toConsent = (d: Row): ConsentRow => ({
  id: Number(d.id),
  projectId: d.project_id,
  granted: !!d.granted,
  textVersion: d.text_version,
  textSnapshot: d.text_snapshot,
  createdAt: d.created_at,
});
const toOnboarding = (d: Row): OnboardingRow => ({
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
});
const toClient = (d: Row): ClientInfo => ({
  id: d.id,
  name: d.name ?? '',
  siret: d.siret ?? null,
  company: d.company ?? null,
});

const byCreatedDesc = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt);

function dropStalePending(files: FileRow[], now: Date): FileRow[] {
  const cutoff = now.getTime() - PENDING_UPLOAD_HIDE_HOURS * 3_600_000;
  return files.filter((f) => f.status !== 'pending' || new Date(f.createdAt).getTime() >= cutoff);
}

export function latestConsent(consents: ConsentRow[]): ConsentRow | null {
  let best: ConsentRow | null = null;
  for (const c of consents) if (!best || c.id > best.id) best = c;
  return best;
}

export function pickActiveProject(
  projects: ProjectSummary[],
  requestedId: string | null | undefined,
  activityByProject: Record<string, string>,
): ProjectSummary | null {
  if (projects.length === 0) return null;
  if (requestedId) {
    const hit = projects.find((p) => p.id === requestedId);
    if (hit) return hit;
  }
  const act = (p: ProjectSummary) => activityByProject[p.id] ?? p.startedAt;
  return projects.reduce((best, p) => (act(p) > act(best) ? p : best));
}

export async function loadClientProjects(rls: SupabaseClient): Promise<ProjectSummary[]> {
  const res = await rls.from('sv_projects').select(PROJECT_COLS).order('started_at', { ascending: false });
  if (res.error || !res.data) return [];
  return (res.data as unknown as Row[]).map(toProject);
}

export async function loadProjectBundle(
  rls: SupabaseClient,
  projectId: string,
  now: Date,
): Promise<ProjectBundle | null> {
  const pr = await rls.from('sv_projects').select(PROJECT_COLS).eq('id', projectId).maybeSingle();
  if (pr.error || !pr.data) return null;
  const project = toProject(pr.data as unknown as Row);

  const [clientRes, factsRes, onbRes, filesRes, linksRes, consentsRes] = await Promise.all([
    rls.from('sv_clients').select(CLIENT_COLS).eq('id', project.clientId).maybeSingle(),
    rls.from('sv_project_facts').select(FACT_COLS).eq('project_id', projectId).order('id', { ascending: true }),
    rls.from('sv_client_onboarding').select(ONBOARDING_COLS).eq('client_id', project.clientId).maybeSingle(),
    rls.from('sv_project_files').select(FILE_COLS).eq('project_id', projectId).order('created_at', { ascending: false }),
    rls.from('sv_project_links').select(LINK_COLS).eq('project_id', projectId).order('created_at', { ascending: false }),
    rls
      .from('sv_project_consents')
      .select(CONSENT_COLS)
      .eq('project_id', projectId)
      .order('id', { ascending: false }),
  ]);

  const factRows = ((factsRes.data ?? []) as unknown as Row[]);
  const facts = factRows.map(toFact);
  const files = dropStalePending(((filesRes.data ?? []) as unknown as Row[]).map(toFile), now).sort(byCreatedDesc);
  const links = ((linksRes.data ?? []) as unknown as Row[]).map(toLink).sort(byCreatedDesc);
  const consents = ((consentsRes.data ?? []) as unknown as Row[]).map(toConsent).sort((a, b) => b.id - a.id);
  const onbRaw = (onbRes.data ?? null) as unknown as Row | null;

  // Notes admin : vides pour un client (RLS admin-only, aucune ligne renvoyée).
  const notes: Record<number, string> = {};
  if (facts.length > 0) {
    const nr = await rls
      .from('sv_project_fact_notes')
      .select(NOTE_COLS)
      .in('fact_id', facts.map((f) => f.id));
    for (const n of ((nr.data ?? []) as unknown as Row[])) notes[Number(n.fact_id)] = n.body;
  }

  const state = deriveProjectState(facts, project.startedAt);
  const lastActivityAt = lastActivity({
    startedAt: project.startedAt,
    dates: [
      ...facts.map((f) => f.createdAt),
      ...files.map((f) => f.readyAt ?? (f.status === 'ready' ? f.createdAt : null)),
      ...links.map((l) => l.createdAt),
      ...consents.map((c) => c.createdAt),
      onbRaw?.updated_at ?? null,
    ],
    lastSignInAt: null,
  });

  return {
    project,
    client: clientRes.data ? toClient(clientRes.data as unknown as Row) : { id: project.clientId, name: '', siret: null, company: null },
    facts,
    notes,
    onboarding: onbRaw ? toOnboarding(onbRaw) : null,
    files,
    links,
    consents,
    state,
    lastActivityAt,
  };
}

function clientDisplayName(c: ClientInfo | undefined): string {
  const nom = (c?.company as { nom?: unknown } | null)?.nom;
  if (typeof nom === 'string' && nom.trim()) return nom;
  return c?.name ?? '';
}

/** PRECONDITION : requireAdmin() a déjà été exécuté par l'appelant (D-21, T-12-40). */
export async function loadAdminProjects(rls: SupabaseClient, now: Date): Promise<AdminProjectRow[]> {
  const [pr, fr, fi, li, co, ob, cl] = await Promise.all([
    rls.from('sv_projects').select(PROJECT_COLS),
    rls.from('sv_project_facts').select(FACT_COLS),
    rls.from('sv_project_files').select(FILE_COLS),
    rls.from('sv_project_links').select(LINK_COLS),
    rls.from('sv_project_consents').select(CONSENT_COLS),
    rls.from('sv_client_onboarding').select(ONBOARDING_COLS),
    rls.from('sv_clients').select(CLIENT_COLS),
  ]);
  const projects = ((pr.data ?? []) as unknown as Row[]).map(toProject);
  if (projects.length === 0) return [];

  const factsBy = new Map<string, Fact[]>();
  for (const d of (fr.data ?? []) as unknown as Row[]) {
    const arr = factsBy.get(d.project_id) ?? [];
    arr.push(toFact(d));
    factsBy.set(d.project_id, arr);
  }
  const filesBy = new Map<string, FileRow[]>();
  for (const f of ((fi.data ?? []) as unknown as Row[]).map(toFile)) {
    const arr = filesBy.get(f.projectId) ?? [];
    arr.push(f);
    filesBy.set(f.projectId, arr);
  }
  const linksBy = new Map<string, LinkRow[]>();
  for (const l of ((li.data ?? []) as unknown as Row[]).map(toLink)) {
    const arr = linksBy.get(l.projectId) ?? [];
    arr.push(l);
    linksBy.set(l.projectId, arr);
  }
  const consentsBy = new Map<string, ConsentRow[]>();
  for (const c of ((co.data ?? []) as unknown as Row[]).map(toConsent)) {
    const arr = consentsBy.get(c.projectId) ?? [];
    arr.push(c);
    consentsBy.set(c.projectId, arr);
  }
  const onbUpdated = new Map<string, string>();
  for (const d of (ob.data ?? []) as unknown as Row[]) if (d.updated_at) onbUpdated.set(d.client_id, d.updated_at);
  const clients = new Map<string, ClientInfo>();
  for (const d of (cl.data ?? []) as unknown as Row[]) clients.set(d.id, toClient(d));

  const clientIds = [...new Set(projects.map((p) => p.clientId))];
  const signIns = new Map<string, string>();
  const rpc = await callRpc<{ client_id: string; last_sign_in_at: string | null }[]>(
    'admin/projects',
    'sv_client_last_sign_in',
    { p_client_ids: clientIds },
  );
  if (rpc.ok && Array.isArray(rpc.data)) {
    for (const r of rpc.data) if (r.last_sign_in_at) signIns.set(r.client_id, r.last_sign_in_at);
  }

  return projects.map((p) => {
    const facts = factsBy.get(p.id) ?? [];
    const files = filesBy.get(p.id) ?? [];
    const state = deriveProjectState(facts, p.startedAt);
    const lastActivityAt = lastActivity({
      startedAt: p.startedAt,
      dates: [
        ...facts.map((f) => f.createdAt),
        ...files.map((f) => f.readyAt),
        ...(linksBy.get(p.id) ?? []).map((l) => l.createdAt),
        ...(consentsBy.get(p.id) ?? []).map((c) => c.createdAt),
        onbUpdated.get(p.clientId) ?? null,
      ],
      lastSignInAt: signIns.get(p.clientId) ?? null,
    });
    const { blockers, isDormant, daysWaiting } = classifyProject(state, lastActivityAt, now);
    return {
      projectId: p.id,
      clientName: clientDisplayName(clients.get(p.clientId)),
      title: p.title,
      offer: p.offer,
      state,
      lastActivityAt,
      daysWaiting,
      isDormant,
      blockers,
    };
  });
}
