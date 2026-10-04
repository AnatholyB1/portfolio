// Écriture des faits projet (D-08, D-09, D-19). L'étape n'est jamais stockée :
// elle est recalculée avec deriveProjectState avant/après l'écriture.
// PRECONDITION : l'appelant a déjà exécuté requireAdmin() ou requireClient() et vérifié
// l'appartenance du projet avec le client RLS. Ce module écrit en service_role.
import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { callRpc } from '@/lib/server/rpc';
import { enqueueAndSend } from '@/lib/server/mail/outbox';
import { dedupeKey } from '@/lib/server/mail/rules';
import {
  DONE_COPY,
  STEPS,
  deriveProjectState,
  type ActorKind,
  type Fact,
  type FactType,
} from '@/lib/projects/steps';

export type FactPostResult =
  | {
      ok: true;
      changed: boolean;
      factId: number | null;
      stepBefore: number | null;
      stepAfter: number | null;
      done: boolean;
      mail: 'sent' | 'pending' | 'failed' | 'none';
    }
  | { ok: false; code: string };

type FactRow = {
  id: number;
  type: FactType;
  target_fact_id: number | null;
  actor_kind: ActorKind;
  created_at: string;
};

export async function loadProjectFacts(
  projectId: string,
): Promise<{ facts: Fact[]; startedAt: string; clientId: string } | null> {
  try {
    const sb = createSupabaseAdminClient();
    const proj = await sb
      .from('sv_projects')
      .select('client_id, started_at')
      .eq('id', projectId)
      .maybeSingle();
    if (proj.error || !proj.data) return null;
    const rows = await sb
      .from('sv_project_facts')
      .select('id, type, target_fact_id, actor_kind, created_at')
      .eq('project_id', projectId)
      .order('id', { ascending: true });
    if (rows.error || !Array.isArray(rows.data)) return null;
    const facts: Fact[] = (rows.data as FactRow[]).map((r) => ({
      id: Number(r.id),
      type: r.type,
      targetFactId: r.target_fact_id === null ? null : Number(r.target_fact_id),
      actorKind: r.actor_kind,
      createdAt: r.created_at,
    }));
    return {
      facts,
      startedAt: String(proj.data.started_at),
      clientId: String(proj.data.client_id),
    };
  } catch {
    console.error('[projects/facts] load failed');
    return null;
  }
}

async function memberEmails(clientId: string): Promise<string[]> {
  const res = await createSupabaseAdminClient()
    .from('sv_client_members')
    .select('invited_email')
    .eq('client_id', clientId);
  if (res.error || !Array.isArray(res.data)) return [];
  const set = new Set<string>();
  for (const r of res.data as { invited_email: string | null }[]) {
    if (typeof r.invited_email === 'string' && r.invited_email.trim()) {
      set.add(r.invited_email.trim().toLowerCase());
    }
  }
  return [...set];
}

async function notifyStepChange(
  projectId: string,
  clientId: string,
  factId: number,
  stepAfter: number | null,
): Promise<'sent' | 'pending' | 'failed' | 'none'> {
  try {
    const emails = await memberEmails(clientId);
    if (emails.length === 0) return 'none';
    const step = stepAfter === null ? null : STEPS[stepAfter - 1];
    const payload = {
      stepName: step ? step.name : DONE_COPY.name,
      expectedAction: step ? step.expectedAction : DONE_COPY.waitingLine,
    };
    const results = await Promise.all(
      emails.map((email) =>
        enqueueAndSend({
          event: 'step_changed',
          recipientEmail: email,
          dedupeKey: dedupeKey.stepChanged(String(factId), email),
          payload,
          clientId,
          projectId,
        }).catch(() => 'failed' as const),
      ),
    );
    if (results.some((r) => r === 'failed')) return 'failed';
    if (results.every((r) => r === 'sent' || r === 'duplicate')) return 'sent';
    return 'pending';
  } catch {
    console.error('[projects/facts] notify failed');
    return 'failed';
  }
}

/** Après l'écriture d'un fait : recalcule l'étape avant/après et notifie si elle a changé (D-16). Ne lève jamais. */
export async function afterFactPosted(
  projectId: string,
  factId: number,
): Promise<{
  stepBefore: number | null;
  stepAfter: number | null;
  done: boolean;
  mail: 'sent' | 'pending' | 'failed' | 'none';
}> {
  const loaded = await loadProjectFacts(projectId);
  if (!loaded) return { stepBefore: null, stepAfter: null, done: false, mail: 'none' };
  const after = deriveProjectState(loaded.facts, loaded.startedAt);
  const before = deriveProjectState(
    loaded.facts.filter((f) => f.id !== factId),
    loaded.startedAt,
  );
  let mail: 'sent' | 'pending' | 'failed' | 'none' = 'none';
  if (before.currentStep !== after.currentStep) {
    mail = await notifyStepChange(projectId, loaded.clientId, factId, after.currentStep);
  }
  return { stepBefore: before.currentStep, stepAfter: after.currentStep, done: after.done, mail };
}

async function post(a: {
  projectId: string;
  type: FactType;
  actorKind: ActorKind;
  actorId: string | null;
  targetFactId: number | null;
  reason: string | null;
}): Promise<FactPostResult> {
  const res = await callRpc<{ fact_id: number | null; changed: boolean }>(
    'projects/facts',
    'sv_post_project_fact',
    {
      p_project_id: a.projectId,
      p_type: a.type,
      p_actor_kind: a.actorKind,
      p_actor_id: a.actorId,
      p_target_fact_id: a.targetFactId,
      p_reason: a.reason,
    },
  );
  if (!res.ok) return { ok: false, code: res.code };
  const changed = res.data?.changed === true;
  const rawId = res.data?.fact_id;
  const factId = rawId === null || rawId === undefined ? null : Number(rawId);
  if (!changed || factId === null) {
    return { ok: true, changed: false, factId, stepBefore: null, stepAfter: null, done: false, mail: 'none' };
  }

  const after = await afterFactPosted(a.projectId, factId);
  return { ok: true, changed: true, factId, ...after };
}

export function postProjectFact(a: {
  projectId: string;
  type: FactType;
  actorKind: ActorKind;
  actorId: string | null;
  reason?: string | null;
}): Promise<FactPostResult> {
  return post({
    projectId: a.projectId,
    type: a.type,
    actorKind: a.actorKind,
    actorId: a.actorId,
    targetFactId: null,
    reason: a.reason ?? null,
  });
}

export function revokeProjectFact(a: {
  projectId: string;
  factId: number;
  actorId: string;
  reason: string;
}): Promise<FactPostResult> {
  return post({
    projectId: a.projectId,
    type: 'fact_revoked',
    actorKind: 'admin',
    actorId: a.actorId,
    targetFactId: a.factId,
    reason: a.reason,
  });
}
