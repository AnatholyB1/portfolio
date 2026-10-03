'use server';

import { revalidatePath } from 'next/cache';
import { requireClient } from '@/lib/server/auth/dal';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { confirmCompany, saveOnboardingBlock } from '@/lib/server/projects/onboarding';
import { setPresentationConsent } from '@/lib/server/projects/content';
import { confirmUpload, createDownloadUrl, requestUpload } from '@/lib/server/projects/files';
import { createDocumentDownloadUrl } from '@/lib/server/documents/download';
import type {
  DownloadResult,
  SimpleResult,
  UploadRequestResult,
} from '@/components/portal/project/types';

export type PortalActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  savedAt?: string;
  fieldErrors?: Record<string, string>;
  complete?: boolean;
};

const PORTAL_PATH = '/espace-client';

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
}

function optional(fd: FormData, key: string): string | undefined {
  const v = str(fd, key).trim();
  return v === '' ? undefined : v;
}

function errState(message: string, fieldErrors?: Record<string, string>): PortalActionState {
  return { status: 'error', message, ...(fieldErrors ? { fieldErrors } : {}) };
}

function parisTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  });
}

function parisDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  });
}

function copyForError(key: string): string {
  const errors = PROJECT_COPY.errors as Record<string, unknown>;
  const v = errors[key];
  return typeof v === 'string' ? v : PROJECT_COPY.errors.generic;
}

// Construit l'entrée d'un bloc à partir du formulaire. Aucun client_id n'est lu ici (D-22).
function buildBlockInput(fd: FormData): unknown {
  const block = str(fd, 'block');
  switch (block) {
    case 'signataire':
      return {
        block,
        data: { signatoryName: str(fd, 'signatoryName'), signatoryRole: str(fd, 'signatoryRole') },
      };
    case 'contact':
      return {
        block,
        data: {
          projectContactName: str(fd, 'projectContactName'),
          projectContactEmail: optional(fd, 'projectContactEmail'),
          projectContactPhone: optional(fd, 'projectContactPhone'),
        },
      };
    case 'facturation': {
      const same = str(fd, 'billingSameAsCompany');
      const billingSameAsCompany = same === 'on' || same === 'true';
      return {
        block,
        data: {
          billingSameAsCompany,
          billingAddress: billingSameAsCompany
            ? null
            : {
                adresse: str(fd, 'billingAdresse').trim(),
                code_postal: str(fd, 'billingCodePostal').trim(),
                commune: str(fd, 'billingCommune').trim(),
              },
          vatStatus: optional(fd, 'vatStatus'),
          vatNumber: optional(fd, 'vatNumber') ?? null,
        },
      };
    }
    case 'projet':
      return {
        block,
        data: {
          existingSiteUrl: optional(fd, 'existingSiteUrl'),
          socialLinks: fd
            .getAll('socialLinks')
            .filter((v): v is string => typeof v === 'string')
            .map((v) => v.trim())
            .filter((v) => v !== ''),
          projectGoal: str(fd, 'projectGoal'),
        },
      };
    case 'societe':
      return { block, confirmed: true };
    default:
      return { block };
  }
}

export async function saveOnboardingAction(
  _prev: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  const ctx = await requireClient();
  if (ctx.status !== 'ok') return errState(PROJECT_COPY.errors.generic);

  const res = await saveOnboardingBlock(ctx.client.id, ctx.user.id, buildBlockInput(formData));
  if (!res.ok) {
    if (res.code === 'invalid') {
      const fieldErrors: Record<string, string> = {};
      for (const [k, v] of Object.entries(res.fieldErrors ?? {})) fieldErrors[k] = copyForError(v);
      return errState(PROJECT_COPY.errors.generic, fieldErrors);
    }
    return errState(PROJECT_COPY.errors.generic);
  }
  revalidatePath(PORTAL_PATH);
  return {
    status: 'success',
    message: PROJECT_COPY.onboarding.savedAt(parisTime(res.savedAt)),
    savedAt: res.savedAt,
    complete: res.complete,
  };
}

export async function confirmCompanyAction(
  _prev: PortalActionState,
  _formData: FormData,
): Promise<PortalActionState> {
  const ctx = await requireClient();
  if (ctx.status !== 'ok') return errState(PROJECT_COPY.errors.generic);

  const res = await confirmCompany(ctx.client.id, ctx.user.id);
  if (!res.ok) return errState(PROJECT_COPY.errors.generic);
  revalidatePath(PORTAL_PATH);
  return {
    status: 'success',
    message: PROJECT_COPY.onboarding.confirmedOn(parisDate(res.savedAt)),
    savedAt: res.savedAt,
    complete: res.complete,
  };
}

export async function setConsentAction(
  _prev: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  const ctx = await requireClient();
  if (ctx.status !== 'ok') return errState(PROJECT_COPY.errors.generic);

  const granted = str(formData, 'granted') === 'true';
  const res = await setPresentationConsent(ctx.supabase, {
    projectId: str(formData, 'projectId'),
    granted,
    version: str(formData, 'version'),
    actorId: ctx.user.id,
  });
  if (!res.ok) {
    return errState(
      res.code === 'stale_version' ? PROJECT_COPY.errors.consentStale : PROJECT_COPY.errors.generic,
    );
  }
  revalidatePath(PORTAL_PATH);
  const date = parisDate(res.createdAt);
  return {
    status: 'success',
    savedAt: res.createdAt,
    message: granted ? PROJECT_COPY.consent.granted(date) : PROJECT_COPY.consent.withdrawn(date),
  };
}

export async function requestUploadAction(input: {
  projectId: string;
  filename: string;
  size: number;
  mime: string;
}): Promise<UploadRequestResult> {
  const ctx = await requireClient();
  const filename = typeof input?.filename === 'string' ? input.filename : '';
  if (ctx.status !== 'ok') {
    return { ok: false, message: PROJECT_COPY.errors.uploadFailed(filename) };
  }
  const res = await requestUpload(ctx.supabase, {
    projectId: String(input.projectId),
    uploaderKind: 'client',
    uploaderId: ctx.user.id,
    filename,
    size: Number(input.size),
    mime: String(input.mime),
  });
  if (res.ok) {
    revalidatePath(PORTAL_PATH);
    return { ok: true, fileId: res.fileId, signedUrl: res.signedUrl };
  }
  if (res.code === 'too_large') return { ok: false, message: PROJECT_COPY.errors.fileTooLarge };
  if (res.code === 'bad_type') return { ok: false, message: PROJECT_COPY.errors.fileType };
  return { ok: false, message: PROJECT_COPY.errors.uploadFailed(filename) };
}

export async function confirmUploadAction(fileId: string): Promise<SimpleResult> {
  const ctx = await requireClient();
  if (ctx.status !== 'ok') return { ok: false, message: PROJECT_COPY.errors.generic };
  const res = await confirmUpload(ctx.supabase, String(fileId));
  if (!res.ok) return { ok: false, message: PROJECT_COPY.errors.generic };
  revalidatePath(PORTAL_PATH);
  return { ok: true };
}

export async function downloadAction(fileId: string): Promise<DownloadResult> {
  const ctx = await requireClient();
  if (ctx.status !== 'ok') return { ok: false, message: PROJECT_COPY.errors.downloadFailed };
  const res = await createDownloadUrl(ctx.supabase, String(fileId));
  if (!res.ok) return { ok: false, message: PROJECT_COPY.errors.downloadFailed };
  return { ok: true, url: res.url };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Lien signé court (D-15) : autorisation par lecture RLS de la ligne, le lien n'est jamais stocké.
export async function documentDownloadAction(documentId: string): Promise<DownloadResult> {
  const failure = { ok: false as const, message: PROJECT_COPY.documents.portal.downloadFailed };
  const ctx = await requireClient();
  if (ctx.status !== 'ok') return failure;
  if (typeof documentId !== 'string' || !UUID_RE.test(documentId)) return failure;
  const res = await createDocumentDownloadUrl(ctx.supabase, documentId);
  if (!res.ok) return failure;
  return { ok: true, url: res.url };
}
