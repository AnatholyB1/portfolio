// PRECONDITION : appelé uniquement depuis la route cron protégée par CRON_SECRET (admin client, service_role).
// Relances génériques (D-16) : documents non signés (d3/d7 client, d14 admin) et demandes d'avis (gated).
// Les relances d'acompte restent sur le chemin SQL. Jamais de lead ni de prospect (D-10).
import 'server-only';
import { parisDateOf } from '@/lib/documents/dates';
import { documentStatus } from '@/lib/documents/status';
import { chainHeads, type ChainDoc } from '@/lib/documents/steps';
import { DOC_LABELS, type DocType } from '@/lib/documents/types';
import { effectiveFacts, type Fact } from '@/lib/projects/steps';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { reviewConfigReady, reviewRequestsEnabled } from '@/lib/server/mail/flags';
import { reviewSecret } from '@/lib/reviews/token';
import { ensureReviewLink } from '@/lib/server/reviews/links';
import { enqueueMail, type EnqueueInput } from '@/lib/server/mail/outbox';
import { ADMIN_NOTIFY_EMAIL, dedupeKey } from '@/lib/server/mail/rules';
import {
  REMINDER_MAX_AGE_DAYS,
  REVIEW_REQUEST_CADENCE,
  STANDARD_REMINDER_CADENCE,
  parisElapsedDays,
  reminderStage,
} from './cadence';
import { heldProjectIds } from './holds';

/** Retourne l'id du lien d'avis du projet (le meme pour J+7 et J+21), ou null. */
export type ReviewLink = (projectId: string) => string | null;

export type SweepDoc = {
  id: string;
  project_id: string;
  doc_type: string;
  revision: number;
  replaces_document_id: string | null;
  issued_at: string;
};
export type SweepFact = {
  id: number;
  project_id: string;
  type: string;
  target_fact_id: number | null;
  actor_kind: string;
  created_at: string;
};
export type SweepSubmission = { document_id: string; refused_count: number };
export type SweepHold = { id: number; project_id: string; action: string; created_at: string };
export type SweepProject = { id: string; client_id: string; title: string };
export type SweepMember = { client_id: string; invited_email: string };
export type SweepClient = { id: string; name: string };
export type OpenReminderRow = {
  id: string;
  event_type: string;
  dedupe_key: string;
  project_id: string | null;
  status: string;
};

export type PlanInput = {
  docs: SweepDoc[];
  facts: SweepFact[];
  submissions: SweepSubmission[];
  holds: SweepHold[];
  projects: SweepProject[];
  members: SweepMember[];
  clients: SweepClient[];
  openReminderRows: OpenReminderRow[];
  reviewedProjectIds: string[];
};

export type PlanOpts = { reviewEnabled: boolean; reviewLink: ReviewLink; limit: number };

const REMINDER_DOC_TYPES: readonly string[] = ['quote', 'contract', 'acceptance'];
const REMINDER_EVENTS = ['document_reminder', 'document_reminder_admin', 'review_request'] as const;

const PAGE_SIZE = 500;
export const READ_PAGE_GUARD = 20;
const IN_CHUNK = 200;
const WINDOW_DAYS = REMINDER_MAX_AGE_DAYS + 1;

const toFact = (f: SweepFact): Fact => ({
  id: Number(f.id),
  type: f.type as Fact['type'],
  targetFactId: f.target_fact_id === null ? null : Number(f.target_fact_id),
  actorKind: f.actor_kind as Fact['actorKind'],
  createdAt: f.created_at,
});

const toChainDoc = (d: SweepDoc): ChainDoc => ({
  id: d.id,
  docType: d.doc_type as DocType,
  revision: Number(d.revision),
  replacesDocumentId: d.replaces_document_id,
  issuedAt: d.issued_at,
});

function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    const list = m.get(k);
    if (list) list.push(r);
    else m.set(k, [r]);
  }
  return m;
}

type ReviewScope = Pick<PlanInput, 'facts' | 'holds' | 'projects' | 'reviewedProjectIds'>;

/** Pure: projets au PV signé effectif, non suspendus, sans avis déposé -> début (date du PV). */
function signedReviewProjects(input: ReviewScope): Map<string, string> {
  const held = heldProjectIds(input.holds);
  const reviewed = new Set(input.reviewedProjectIds);
  const projectIds = new Set(input.projects.map((p) => p.id));
  const out = new Map<string, string>();
  for (const [projectId, rows] of groupBy(input.facts, (f) => f.project_id)) {
    if (!projectIds.has(projectId) || held.has(projectId) || reviewed.has(projectId)) continue;
    const signed = effectiveFacts(rows.map(toFact)).filter((f) => f.type === 'acceptance_signed');
    if (signed.length === 0) continue;
    out.set(projectId, signed.reduce((a, b) => (b.createdAt > a.createdAt ? b : a)).createdAt);
  }
  return out;
}

/** Pure: projets à solliciter maintenant (palier d7/d21, ni suspendu ni déjà noté). Aucun critère de satisfaction. */
export function reviewCandidates(input: ReviewScope, now: Date): string[] {
  const ids: string[] = [];
  for (const [projectId, start] of signedReviewProjects(input)) {
    const stage = reminderStage(parisElapsedDays(new Date(start), now), REVIEW_REQUEST_CADENCE.client);
    if (stage === 'd7' || stage === 'd21') ids.push(projectId);
  }
  return ids;
}

/** Pure: décide quelles relances mettre en file et quelles lignes ouvertes ne sont plus dues. */
export function planReminders(
  input: PlanInput,
  now: Date,
  opts: PlanOpts,
): { enqueues: EnqueueInput[]; staleIds: string[] } {
  const held = heldProjectIds(input.holds);
  const projectById = new Map(input.projects.map((p) => [p.id, p]));
  const clientById = new Map(input.clients.map((c) => [c.id, c]));
  const membersByClient = groupBy(input.members, (m) => m.client_id);
  const factsByProject = groupBy(input.facts, (f) => f.project_id);
  const docsByProject = groupBy(input.docs, (d) => d.project_id);
  const refusedDocs = new Set(
    input.submissions.filter((s) => Number(s.refused_count) > 0).map((s) => s.document_id),
  );

  const recipientsOf = (project: SweepProject): string[] => {
    const set = new Set<string>();
    for (const m of membersByClient.get(project.client_id) ?? []) {
      const e = String(m.invited_email ?? '').trim().toLowerCase();
      if (e) set.add(e);
    }
    return [...set];
  };

  const enqueues: EnqueueInput[] = [];
  const eligibleDocIds = new Set<string>();
  const eligibleReviewProjects = new Set<string>();

  for (const [projectId, projectDocs] of docsByProject) {
    const project = projectById.get(projectId);
    if (!project || held.has(projectId)) continue;
    const docs = projectDocs.map(toChainDoc);
    const facts = (factsByProject.get(projectId) ?? []).map(toFact);
    const recipients = recipientsOf(project);
    const clientName = clientById.get(project.client_id)?.name ?? '';
    for (const head of chainHeads(docs).values()) {
      if (!REMINDER_DOC_TYPES.includes(head.docType)) continue;
      if (documentStatus(head, docs, facts) !== 'to_sign') continue;
      if (refusedDocs.has(head.id)) continue;
      eligibleDocIds.add(head.id);
      const elapsed = parisElapsedDays(new Date(head.issuedAt), now);
      const label = DOC_LABELS[head.docType];
      const stage = reminderStage(elapsed, STANDARD_REMINDER_CADENCE.client);
      if (stage === 'd3' || stage === 'd7') {
        for (const email of recipients) {
          enqueues.push({
            event: 'document_reminder',
            recipientEmail: email,
            dedupeKey: dedupeKey.documentReminder(head.id, stage, email),
            payload: { documentLabel: label, projectTitle: project.title, revision: head.revision, stage },
            clientId: project.client_id,
            projectId,
          });
        }
      }
      if (
        elapsed >= STANDARD_REMINDER_CADENCE.admin.day &&
        elapsed <= REMINDER_MAX_AGE_DAYS
      ) {
        enqueues.push({
          event: 'document_reminder_admin',
          recipientEmail: ADMIN_NOTIFY_EMAIL,
          dedupeKey: dedupeKey.documentReminderAdmin(head.id),
          payload: {
            documentLabel: label,
            projectTitle: project.title,
            clientName,
            issuedOn: parisDateOf(new Date(head.issuedAt)),
            projectId,
          },
          clientId: project.client_id,
          projectId,
        });
      }
    }
  }

  // Demandes d'avis : PV signé (fait effectif), derrière le drapeau et un lien disponible (D-04, D-09).
  if (opts.reviewEnabled) {
    for (const [projectId, start] of signedReviewProjects(input)) {
      const project = projectById.get(projectId);
      if (!project) continue;
      eligibleReviewProjects.add(projectId);
      const stage = reminderStage(parisElapsedDays(new Date(start), now), REVIEW_REQUEST_CADENCE.client);
      if (stage !== 'd7' && stage !== 'd21') continue;
      const linkId = opts.reviewLink(projectId);
      if (typeof linkId !== 'string' || linkId === '') continue;
      for (const email of recipientsOf(project)) {
        enqueues.push({
          event: 'review_request',
          recipientEmail: email,
          dedupeKey: dedupeKey.reviewRequest(projectId, stage, email),
          payload: { projectTitle: project.title, linkId, stage },
          clientId: project.client_id,
          projectId,
        });
      }
    }
  }

  const staleIds: string[] = [];
  for (const row of input.openReminderRows) {
    if (row.status !== 'pending' && row.status !== 'failed') continue;
    const subject = row.dedupe_key.split(':')[1] ?? '';
    const stillDue =
      row.event_type === 'review_request'
        ? eligibleReviewProjects.has(subject)
        : row.event_type === 'document_reminder' || row.event_type === 'document_reminder_admin'
          ? eligibleDocIds.has(subject)
          : true;
    if (!stillDue) staleIds.push(row.id);
  }

  return { enqueues: enqueues.slice(0, Math.max(0, opts.limit)), staleIds };
}

type Page = { data: unknown[] | null; error: unknown };

/** Lecture complète paginée ; lève sur erreur ou si le garde de pages est dépassé (fail closed). */
export async function readAll<T>(
  buildQuery: (from: number, to: number) => PromiseLike<Page>,
): Promise<T[]> {
  const out: T[] = [];
  for (let page = 0; page < READ_PAGE_GUARD; page += 1) {
    const from = page * PAGE_SIZE;
    const res = await buildQuery(from, from + PAGE_SIZE - 1);
    if (res.error) throw new Error('read_error');
    const rows = (res.data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE_SIZE) return out;
  }
  throw new Error('read_guard_exceeded');
}

function chunks<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

export type SweepRemindersResult = { queued: number; duplicates: number; stale: number; failed: number };

export async function sweepReminders(
  opts: { now?: Date; limit?: number; reviewLink?: ReviewLink } = {},
): Promise<SweepRemindersResult> {
  const result: SweepRemindersResult = { queued: 0, duplicates: 0, stale: 0, failed: 0 };
  const now = opts.now ?? new Date();
  const limit = opts.limit ?? 100;
  const since = new Date(now.getTime() - WINDOW_DAYS * 86_400_000).toISOString();

  let plan: { enqueues: EnqueueInput[]; staleIds: string[] };
  try {
    const admin = createSupabaseAdminClient();

    const [docs, signedFacts] = await Promise.all([
      readAll<SweepDoc>((a, b) =>
        admin
          .from('sv_project_documents')
          .select('id, project_id, doc_type, revision, replaces_document_id, issued_at')
          .in('doc_type', ['quote', 'contract', 'acceptance'])
          .gte('issued_at', since)
          .order('id')
          .range(a, b),
      ),
      readAll<SweepFact>((a, b) =>
        admin
          .from('sv_project_facts')
          .select('id, project_id, type, target_fact_id, actor_kind, created_at')
          .eq('type', 'acceptance_signed')
          .gte('created_at', since)
          .order('id')
          .range(a, b),
      ),
    ]);

    const projectIds = [...new Set([...docs.map((d) => d.project_id), ...signedFacts.map((f) => f.project_id)])];
    const docIds = docs.map((d) => d.id);

    const scoped = async <T>(
      ids: string[],
      build: (chunk: string[], a: number, b: number) => PromiseLike<Page>,
    ): Promise<T[]> => {
      const all: T[] = [];
      for (const c of chunks(ids, IN_CHUNK)) all.push(...(await readAll<T>((a, b) => build(c, a, b))));
      return all;
    };

    const [facts, submissions, holds, projects] = await Promise.all([
      scoped<SweepFact>(projectIds, (c, a, b) =>
        admin
          .from('sv_project_facts')
          .select('id, project_id, type, target_fact_id, actor_kind, created_at')
          .in('project_id', c)
          .in('type', ['quote_accepted', 'contract_signed', 'acceptance_signed', 'fact_revoked'])
          .order('id')
          .range(a, b),
      ),
      scoped<SweepSubmission>(docIds, (c, a, b) =>
        admin
          .from('sv_acceptance_submissions')
          .select('id, document_id, refused_count')
          .in('document_id', c)
          .order('id')
          .range(a, b),
      ),
      scoped<SweepHold>(projectIds, (c, a, b) =>
        admin
          .from('sv_reminder_holds')
          .select('id, project_id, action, created_at')
          .in('project_id', c)
          .order('id')
          .range(a, b),
      ),
      scoped<SweepProject>(projectIds, (c, a, b) =>
        admin.from('sv_projects').select('id, client_id, title').in('id', c).order('id').range(a, b),
      ),
    ]);

    const reviewedRows = await scoped<{ project_id: string }>(projectIds, (c, a, b) =>
      admin.from('sv_reviews').select('project_id').in('project_id', c).order('project_id').range(a, b),
    );
    const reviewedProjectIds = reviewedRows.map((r) => r.project_id);

    const clientIds = [...new Set(projects.map((p) => p.client_id))];
    const [members, clients, openReminderRows] = await Promise.all([
      scoped<SweepMember>(clientIds, (c, a, b) =>
        admin
          .from('sv_client_members')
          .select('client_id, user_id, invited_email')
          .in('client_id', c)
          .order('user_id')
          .range(a, b),
      ),
      scoped<SweepClient>(clientIds, (c, a, b) =>
        admin.from('sv_clients').select('id, name').in('id', c).order('id').range(a, b),
      ),
      readAll<OpenReminderRow>((a, b) =>
        admin
          .from('sv_mail_outbox')
          .select('id, event_type, dedupe_key, project_id, status')
          .in('event_type', [...REMINDER_EVENTS])
          .in('status', ['pending', 'failed'])
          .order('id')
          .range(a, b),
      ),
    ]);

    const flagOn = reviewRequestsEnabled();
    const reviewOn = flagOn && reviewConfigReady();
    if (flagOn && !reviewOn) console.error('[reminders/sweep] review_config_invalid');

    const input: PlanInput = {
      docs, facts, submissions, holds, projects, members, clients, openReminderRows, reviewedProjectIds,
    };
    let reviewLink: ReviewLink = opts.reviewLink ?? (() => null);
    const secret = reviewSecret();
    if (reviewOn && !opts.reviewLink && secret) {
      const linkIds = new Map<string, string>();
      for (const id of reviewCandidates(input, now).slice(0, Math.max(0, limit))) {
        const linkId = await ensureReviewLink(admin, id, secret);
        if (linkId) linkIds.set(id, linkId);
      }
      reviewLink = (id) => linkIds.get(id) ?? null;
    }

    plan = planReminders(input, now, { reviewEnabled: reviewOn, reviewLink, limit });
  } catch {
    console.error('[reminders/sweep] read_failed');
    result.failed += 1;
    return result;
  }

  try {
    for (const input of plan.enqueues) {
      try {
        const r = await enqueueMail(input);
        if (r.inserted) result.queued += 1;
        else result.duplicates += 1;
      } catch {
        console.error('[reminders/sweep] enqueue_failed');
        result.failed += 1;
      }
    }
    if (plan.staleIds.length > 0) {
      const admin = createSupabaseAdminClient();
      for (const c of chunks(plan.staleIds, IN_CHUNK)) {
        const { error } = await admin
          .from('sv_mail_outbox')
          .update({ status: 'skipped', last_error: 'no_longer_due' })
          .in('id', c)
          .in('status', ['pending', 'failed']);
        if (error) {
          console.error('[reminders/sweep] stale_update_failed');
          result.failed += 1;
        } else {
          result.stale += c.length;
        }
      }
    }
  } catch {
    console.error('[reminders/sweep] sweep_failed');
    result.failed += 1;
  }
  return result;
}
