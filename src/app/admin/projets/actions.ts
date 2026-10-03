'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/server/auth/dal';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { linkSchema, postFactSchema, revokeFactSchema, uploadRequestSchema } from '@/lib/projects/schemas';
import { DONE_COPY, STEPS } from '@/lib/projects/steps';
import { getAccessibleProject } from '@/lib/server/projects/access';
import { addProjectLink } from '@/lib/server/projects/content';
import {
  postProjectFact,
  revokeProjectFact,
  type FactPostResult,
} from '@/lib/server/projects/facts';
import { confirmUpload, createDownloadUrl, requestUpload } from '@/lib/server/projects/files';
import type {
  DownloadResult,
  SimpleResult,
  UploadRequestResult,
} from '@/components/portal/project/types';

export type ProjectActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  mailLine?: string;
};

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
}

function err(message: string): ProjectActionState {
  return { status: 'error', message };
}

function refresh(projectId: string) {
  revalidatePath('/admin/projets');
  revalidatePath(`/admin/projets/${projectId}`);
  revalidatePath('/espace-client');
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

function factOutcome(res: FactPostResult, projectId: string): ProjectActionState {
  if (!res.ok) return err(PROJECT_COPY.errors.generic);
  if (!res.changed) return err(PROJECT_COPY.facts.alreadyRecorded);
  refresh(projectId);
  const stepName =
    res.done || res.stepAfter === null ? DONE_COPY.name : (STEPS[res.stepAfter - 1]?.name ?? DONE_COPY.name);
  return {
    status: 'success',
    message: PROJECT_COPY.facts.recorded(stepName),
    mailLine: mailLine(res.mail),
  };
}

// Chaque action revérifie l'admin AVANT toute validation ou appel service_role (D-22).
export async function postFactAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const { user, supabase } = await requireAdmin();
  const note = str(formData, 'note').trim();
  const parsed = postFactSchema.safeParse({
    projectId: str(formData, 'projectId'),
    type: str(formData, 'type'),
    note: note || undefined,
  });
  if (!parsed.success) return err(PROJECT_COPY.errors.generic);
  if (!(await getAccessibleProject(supabase, parsed.data.projectId))) {
    return err(PROJECT_COPY.errors.generic);
  }
  const res = await postProjectFact({
    projectId: parsed.data.projectId,
    type: parsed.data.type,
    actorKind: 'admin',
    actorId: user.id,
    reason: parsed.data.note ?? null,
  });
  return factOutcome(res, parsed.data.projectId);
}

export async function revokeFactAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const { user, supabase } = await requireAdmin();
  const parsed = revokeFactSchema.safeParse({
    projectId: str(formData, 'projectId'),
    factId: str(formData, 'factId'),
    reason: str(formData, 'reason'),
  });
  if (!parsed.success) return err(PROJECT_COPY.errors.generic);
  if (!(await getAccessibleProject(supabase, parsed.data.projectId))) {
    return err(PROJECT_COPY.errors.generic);
  }
  const res = await revokeProjectFact({
    projectId: parsed.data.projectId,
    factId: parsed.data.factId,
    actorId: user.id,
    reason: parsed.data.reason,
  });
  return factOutcome(res, parsed.data.projectId);
}

export async function addLinkAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const { user, supabase } = await requireAdmin();
  const parsed = linkSchema.safeParse({
    projectId: str(formData, 'projectId'),
    title: str(formData, 'title'),
    url: str(formData, 'url').trim(),
  });
  if (!parsed.success) {
    const urlBad = parsed.error.issues.some((i) => i.path[0] === 'url');
    return err(urlBad ? PROJECT_COPY.errors.url : PROJECT_COPY.errors.generic);
  }
  const res = await addProjectLink(supabase, { ...parsed.data, actorId: user.id });
  if (!res.ok) return err(PROJECT_COPY.errors.generic);
  refresh(parsed.data.projectId);
  return { status: 'success', message: PROJECT_COPY.links.add };
}

export async function adminRequestUploadAction(input: {
  projectId: string;
  filename: string;
  size: number;
  mime: string;
}): Promise<UploadRequestResult> {
  const { user, supabase } = await requireAdmin();
  const parsed = uploadRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: PROJECT_COPY.errors.generic };
  const res = await requestUpload(supabase, {
    ...parsed.data,
    uploaderKind: 'admin',
    uploaderId: user.id,
  });
  if (res.ok) return { ok: true, fileId: res.fileId, signedUrl: res.signedUrl };
  if (res.code === 'too_large') return { ok: false, message: PROJECT_COPY.errors.fileTooLarge };
  if (res.code === 'bad_type') return { ok: false, message: PROJECT_COPY.errors.fileType };
  return { ok: false, message: PROJECT_COPY.errors.generic };
}

export async function adminConfirmUploadAction(fileId: string): Promise<SimpleResult> {
  const { supabase } = await requireAdmin();
  if (typeof fileId !== 'string' || fileId.length === 0) {
    return { ok: false, message: PROJECT_COPY.errors.generic };
  }
  const res = await confirmUpload(supabase, fileId);
  if (!res.ok) return { ok: false, message: PROJECT_COPY.errors.generic };
  revalidatePath('/admin/projets');
  revalidatePath('/espace-client');
  return { ok: true };
}

export async function adminDownloadAction(fileId: string): Promise<DownloadResult> {
  const { supabase } = await requireAdmin();
  if (typeof fileId !== 'string' || fileId.length === 0) {
    return { ok: false, message: PROJECT_COPY.errors.downloadFailed };
  }
  const res = await createDownloadUrl(supabase, fileId);
  if (!res.ok) return { ok: false, message: PROJECT_COPY.errors.downloadFailed };
  return { ok: true, url: res.url };
}
