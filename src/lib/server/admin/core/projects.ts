import 'server-only';
import { z } from 'zod';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { linkSchema, postFactSchema, revokeFactSchema, uploadRequestSchema } from '@/lib/projects/schemas';
import { DONE_COPY, STEPS } from '@/lib/projects/steps';
import { getAccessibleProject } from '@/lib/server/projects/access';
import { addProjectLink } from '@/lib/server/projects/content';
import { postProjectFact, revokeProjectFact, type FactPostResult } from '@/lib/server/projects/facts';
import { confirmUpload, createDownloadUrl, requestUpload } from '@/lib/server/projects/files';
import { callRpc } from '@/lib/server/rpc';
// Type seul (effacé à la compilation) : aucun import runtime de mcp/session.
import type { AdminCtx } from '@/lib/server/mcp/session';
import type { CoreResult } from './result';
import { rec, str } from './shared';

const GENERIC = PROJECT_COPY.errors.generic;
const HOLD_GENERIC = 'Le changement a échoué. Réessayez dans un instant.';

function fail(message: string): CoreResult<never> {
  return { ok: false, message };
}

function mailLine(mail: 'sent' | 'pending' | 'failed' | 'none'): string | undefined {
  switch (mail) {
    case 'sent':
      return PROJECT_COPY.facts.mailSent;
    case 'pending':
      return PROJECT_COPY.facts.mailPending;
    case 'failed':
      return PROJECT_COPY.facts.mailFailed;
    default:
      return undefined;
  }
}

export type FactData = { mailLine?: string };

function factOutcome(res: FactPostResult): CoreResult<FactData> {
  if (!res.ok) return fail(GENERIC);
  if (!res.changed) return fail(PROJECT_COPY.facts.alreadyRecorded);
  const stepName =
    res.done || res.stepAfter === null ? DONE_COPY.name : (STEPS[res.stepAfter - 1]?.name ?? DONE_COPY.name);
  return { ok: true, message: PROJECT_COPY.facts.recorded(stepName), data: { mailLine: mailLine(res.mail) } };
}

export async function postProjectFactCore(ctx: AdminCtx, input: unknown): Promise<CoreResult<FactData>> {
  const i = rec(input);
  const note = str(i.note).trim();
  const parsed = postFactSchema.safeParse({
    projectId: str(i.projectId),
    type: str(i.type),
    note: note || undefined,
  });
  if (!parsed.success) return fail(GENERIC);
  if (!(await getAccessibleProject(ctx.supabase, parsed.data.projectId))) return fail(GENERIC);
  const res = await postProjectFact({
    projectId: parsed.data.projectId,
    type: parsed.data.type,
    actorKind: 'admin',
    actorId: ctx.user.id,
    reason: parsed.data.note ?? null,
  });
  return factOutcome(res);
}

export async function revokeProjectFactCore(ctx: AdminCtx, input: unknown): Promise<CoreResult<FactData>> {
  const i = rec(input);
  const parsed = revokeFactSchema.safeParse({
    projectId: str(i.projectId),
    factId: typeof i.factId === 'number' ? i.factId : str(i.factId),
    reason: str(i.reason),
  });
  if (!parsed.success) return fail(GENERIC);
  if (!(await getAccessibleProject(ctx.supabase, parsed.data.projectId))) return fail(GENERIC);
  const res = await revokeProjectFact({
    projectId: parsed.data.projectId,
    factId: parsed.data.factId,
    actorId: ctx.user.id,
    reason: parsed.data.reason,
  });
  return factOutcome(res);
}

export async function addProjectLinkCore(ctx: AdminCtx, input: unknown): Promise<CoreResult> {
  const i = rec(input);
  const parsed = linkSchema.safeParse({
    projectId: str(i.projectId),
    title: str(i.title),
    url: str(i.url).trim(),
  });
  if (!parsed.success) {
    const urlBad = parsed.error.issues.some((x) => x.path[0] === 'url');
    return fail(urlBad ? PROJECT_COPY.errors.url : GENERIC);
  }
  const res = await addProjectLink(ctx.supabase, { ...parsed.data, actorId: ctx.user.id });
  if (!res.ok) return fail(GENERIC);
  return { ok: true, message: PROJECT_COPY.links.add };
}

// Étape 1 du dépôt : crée la ligne « pending » et renvoie l'URL signée de dépôt (le fichier n'est jamais lu ici).
export async function requestProjectUploadCore(
  ctx: AdminCtx,
  input: unknown,
): Promise<CoreResult<{ fileId: string; signedUrl: string }>> {
  const parsed = uploadRequestSchema.safeParse(input);
  if (!parsed.success) return fail(GENERIC);
  const res = await requestUpload(ctx.supabase, {
    ...parsed.data,
    uploaderKind: 'admin',
    uploaderId: ctx.user.id,
  });
  if (res.ok) return { ok: true, message: '', data: { fileId: res.fileId, signedUrl: res.signedUrl } };
  if (res.code === 'too_large') return fail(PROJECT_COPY.errors.fileTooLarge);
  if (res.code === 'bad_type') return fail(PROJECT_COPY.errors.fileType);
  return fail(GENERIC);
}

// Étape 2 : vérifie que le fichier est bien dans le stockage et le passe à « ready ».
export async function confirmProjectUploadCore(ctx: AdminCtx, input: unknown): Promise<CoreResult> {
  const fileId = rec(input).fileId;
  if (typeof fileId !== 'string' || fileId.length === 0) return fail(GENERIC);
  const res = await confirmUpload(ctx.supabase, fileId);
  if (!res.ok) return fail(GENERIC);
  return { ok: true, message: '' };
}

// URL signée de téléchargement (courte durée) : jamais le contenu du fichier.
export async function downloadProjectFileCore(
  ctx: AdminCtx,
  input: unknown,
): Promise<CoreResult<{ url: string }>> {
  const fileId = rec(input).fileId;
  if (typeof fileId !== 'string' || fileId.length === 0) return fail(PROJECT_COPY.errors.downloadFailed);
  const res = await createDownloadUrl(ctx.supabase, fileId);
  if (!res.ok) return fail(PROJECT_COPY.errors.downloadFailed);
  return { ok: true, message: '', data: { url: res.url } };
}

const holdSchema = z.object({
  projectId: z.string().uuid(),
  action: z.enum(['suspend', 'resume']),
});

export async function setReminderHoldCore(ctx: AdminCtx, input: unknown): Promise<CoreResult> {
  const i = rec(input);
  const parsed = holdSchema.safeParse({ projectId: str(i.projectId), action: str(i.action) });
  if (!parsed.success) return fail(HOLD_GENERIC);

  const res = await callRpc<{ outcome?: string }>('admin/projets', 'sv_set_reminder_hold', {
    p_project_id: parsed.data.projectId,
    p_action: parsed.data.action,
    p_actor_id: ctx.user.id,
  });
  if (!res.ok) return fail(HOLD_GENERIC);

  const outcome = res.data?.outcome;
  if (outcome === 'suspended') return { ok: true, message: 'Relances suspendues.' };
  if (outcome === 'resumed') return { ok: true, message: 'Relances reprises.' };
  if (outcome === 'unchanged') return { ok: true, message: 'Aucun changement.' };
  return fail(HOLD_GENERIC);
}
