'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { DOC_LABELS } from '@/lib/documents/types';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { acceptanceAnswersSchema } from '@/lib/signature/acceptance';
import { CONSENT_VERSION } from '@/lib/signature/consentText';
import { requireClient } from '@/lib/server/auth/dal';
import { recordConsent, submitAcceptance } from '@/lib/server/signature/chain';
import { requestIp } from '@/lib/server/signature/clientIp';
import { requestSignatureCode, verifySignatureCode } from '@/lib/server/signature/codes';
import { createPreviewUrl } from '@/lib/server/signature/links';
import { finalizeSignature } from '@/lib/server/signature/seal';
import { loadSigningContext } from '@/lib/server/signature/signingContext';

// PREVIEW_MODE (spike 14-05) : signed_url. L'aperçu passe par un lien signé court ; aucune route /apercu.
const DOCUMENTS_PATH = '/espace-client/documents';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIG = PROJECT_COPY.signature;

type Fail = { ok: false; message: string };
type ReadyContext = Extract<Awaited<ReturnType<typeof loadSigningContext>>, { status: 'ready' }>;

export type PreviewLinkResult = { ok: true; url: string } | Fail;
export type SubmitAcceptanceResult =
  | { ok: true; outcome: 'refused' }
  | { ok: true; outcome: 'accepted'; reserved: number }
  | Fail;
export type SendCodeResult =
  | { ok: true; maskedEmail: string; expiresAt: string; cooldownS: number; sendsLeft: number }
  | (Fail & { retryAfterS?: number });
export type VerifyCodeActionResult =
  | { ok: true; outcome: 'signed'; signedAt: string; sealSha256: string | null }
  | (Fail & { remaining?: number; needNewCode?: boolean; finalizePending?: boolean });
export type ResumeResult =
  | { ok: true; outcome: 'signed'; signedAt: string; sealSha256: string | null }
  | (Fail & { finalizePending?: boolean });

const fail = (message: string): Fail => ({ ok: false, message });

async function clientIp(): Promise<string | null> {
  return requestIp(await headers());
}

type ClientCtx = Awaited<ReturnType<typeof requireClient>>;

async function loadReady(
  ctx: ClientCtx,
  documentId: string,
): Promise<{ ok: true; ctx: Extract<ClientCtx, { status: 'ok' }>; sctx: ReadyContext } | Fail> {
  if (ctx.status !== 'ok') return fail(PROJECT_COPY.errors.generic);
  if (typeof documentId !== 'string' || !UUID_RE.test(documentId)) return fail(PROJECT_COPY.errors.generic);
  if (!ctx.user.email) return fail(PROJECT_COPY.errors.generic);
  const sctx = await loadSigningContext({
    rls: ctx.supabase,
    userId: ctx.user.id,
    email: ctx.user.email,
    documentId,
  });
  if (sctx.status !== 'ready') return fail(SIG.states.notSignable);
  return { ok: true, ctx, sctx };
}

function notSignableMessage(sctx: ReadyContext): string {
  const s = sctx.signable;
  if (s.ok) return SIG.states.notSignable;
  if (s.code === 'replaced') {
    return sctx.replacedBy ? SIG.states.replaced(sctx.replacedBy.revision) : SIG.states.notSignable;
  }
  if (s.code === 'already_signed') return SIG.success.heading;
  return SIG.states.notSignable;
}

function mismatchMessage(sctx: ReadyContext): string {
  return sctx.signer.name ? SIG.mismatch.body(sctx.signer.name) : SIG.mismatch.title;
}

export async function previewLinkAction(documentId: string): Promise<PreviewLinkResult> {
  const ctx = await requireClient();
  if (ctx.status !== 'ok') return fail(PROJECT_COPY.errors.generic);
  if (typeof documentId !== 'string' || !UUID_RE.test(documentId)) return fail(PROJECT_COPY.errors.generic);
  const res = await createPreviewUrl(ctx.supabase, documentId, {
    kind: 'client',
    id: ctx.user.id,
    ip: await clientIp(),
  });
  if (!res.ok) return fail(SIG.read.viewerError);
  return { ok: true, url: res.url };
}

export async function submitAcceptanceAction(documentId: string, answers: unknown): Promise<SubmitAcceptanceResult> {
  const loaded = await loadReady(await requireClient(), documentId);
  if (!loaded.ok) return loaded;
  const { ctx, sctx } = loaded;
  if (!sctx.signable.ok) return fail(notSignableMessage(sctx));
  if (!sctx.signer.matches) return fail(mismatchMessage(sctx));
  if (!sctx.criteria || sctx.criteria.length === 0) return fail(SIG.states.notSignable);

  const parsed = acceptanceAnswersSchema(sctx.criteria.length).safeParse(answers);
  if (!parsed.success) return fail(SIG.checklist.feedbackFailed);

  const res = await submitAcceptance({
    documentId,
    userId: ctx.user.id,
    ip: await clientIp(),
    answers: parsed.data,
  });
  if (!res.ok) {
    return fail(res.code === 'document_superseded' ? notSignableMessage(sctx) : SIG.checklist.feedbackFailed);
  }
  if (res.refusedCount > 0) {
    revalidatePath(DOCUMENTS_PATH);
    return { ok: true, outcome: 'refused' };
  }
  return { ok: true, outcome: 'accepted', reserved: res.reservedCount };
}

const consentSchema = z.object({ esign: z.literal(true), evidence: z.literal(true) });

export async function sendCodeAction(
  documentId: string,
  consent: { esign: boolean; evidence: boolean },
): Promise<SendCodeResult> {
  const parsedConsent = consentSchema.safeParse(consent);
  const loaded = await loadReady(await requireClient(), documentId);
  if (!loaded.ok) return loaded;
  const { ctx, sctx } = loaded;

  // Défense en profondeur : assert_signable_head (SQL) ignore la garde d'étape du projet.
  // On revérifie donc la signabilité sur un contexte fraîchement chargé avant tout RPC.
  if (!sctx.signable.ok) return fail(notSignableMessage(sctx));
  if (!sctx.signer.matches) return fail(mismatchMessage(sctx));
  if (!parsedConsent.success) return fail(SIG.consent.helper);
  if (sctx.criteria !== null) {
    // PV : le code reste inatteignable sans réponses complètes et sans refus (D-15).
    if (!sctx.latestSubmission) return fail(SIG.checklist.intro);
    if (sctx.latestSubmission.refused) return fail(SIG.checklist.refusedHelper);
  }

  const ip = await clientIp();
  if (!sctx.consentRecorded) {
    const rec = await recordConsent({ documentId, userId: ctx.user.id, ip, version: CONSENT_VERSION });
    if (!rec.ok) return fail(SIG.code.sendFailed);
  }

  const res = await requestSignatureCode({
    documentId,
    userId: ctx.user.id,
    email: ctx.user.email as string,
    ip,
    consentVersion: CONSENT_VERSION,
    documentLabel: DOC_LABELS[sctx.document.docType],
  });
  if (!res.ok) {
    switch (res.code) {
      case 'too_soon': {
        const retry = (res as { retryAfterS?: number }).retryAfterS ?? 60;
        return { ok: false, message: SIG.code.tooSoon(retry), retryAfterS: retry };
      }
      case 'hourly_cap':
        return fail(SIG.code.hourlyCap);
      case 'acceptance_refused':
        return fail(SIG.checklist.refusedHelper);
      case 'acceptance_missing':
        return fail(SIG.checklist.intro);
      case 'not_member':
      case 'signatory_incomplete':
        return fail(mismatchMessage(sctx));
      case 'superseded':
      case 'already_signed':
      case 'not_signable':
        return fail(notSignableMessage(sctx));
      default:
        // send_failed, not_configured, consent_missing, unknown
        return fail(SIG.code.sendFailed);
    }
  }
  return {
    ok: true,
    maskedEmail: sctx.signer.maskedEmail,
    expiresAt: res.expiresAt,
    cooldownS: 60,
    sendsLeft: res.sendsLeft,
  };
}

async function finalize(
  documentId: string,
  signedAt: string,
): Promise<
  | { ok: true; outcome: 'signed'; signedAt: string; sealSha256: string | null }
  | (Fail & { finalizePending: true })
> {
  const fin = await finalizeSignature(documentId);
  if (!fin.ok) return { ok: false, finalizePending: true, message: SIG.code.finalizePending };
  revalidatePath(DOCUMENTS_PATH);
  return {
    ok: true,
    outcome: 'signed',
    signedAt,
    sealSha256: fin.outcome === 'sealed' ? fin.sealSha256 : null,
  };
}

const codeSchema = z.string().transform((s) => s.replace(/\D/g, '')).pipe(z.string().regex(/^[0-9]{6}$/));

export async function verifyCodeAction(documentId: string, code: string): Promise<VerifyCodeActionResult> {
  const parsedCode = codeSchema.safeParse(code);
  const loaded = await loadReady(await requireClient(), documentId);
  if (!loaded.ok) return loaded;
  const { ctx, sctx } = loaded;

  // Défense en profondeur : même revérification que sendCodeAction avant le RPC de vérification.
  if (!sctx.signable.ok) {
    if (
      sctx.signable.code === 'already_signed' &&
      sctx.signature &&
      sctx.signature.signerUserId === ctx.user.id
    ) {
      if (sctx.state === 'pending_finalization') return finalize(documentId, sctx.signature.signedAt);
      if (sctx.state === 'signed') {
        return { ok: true, outcome: 'signed', signedAt: sctx.signature.signedAt, sealSha256: sctx.seal?.sha256 ?? null };
      }
    }
    return fail(notSignableMessage(sctx));
  }
  if (!sctx.signer.matches) return fail(mismatchMessage(sctx));
  if (!parsedCode.success) return fail(PROJECT_COPY.errors.generic);

  const res = await verifySignatureCode({
    documentId,
    userId: ctx.user.id,
    ip: await clientIp(),
    code: parsedCode.data,
  });
  if (!res.ok) {
    switch (res.code) {
      case 'invalid':
        return {
          ok: false,
          message: SIG.code.wrong(res.remaining ?? 0),
          remaining: res.remaining ?? 0,
        };
      case 'locked':
        return { ok: false, message: SIG.code.tooMany, needNewCode: true };
      case 'expired':
      case 'no_code':
        return { ok: false, message: SIG.code.expired, needNewCode: true };
      case 'superseded':
      case 'already_signed':
      case 'not_signable':
        return fail(notSignableMessage(sctx));
      case 'not_member':
      case 'signatory_incomplete':
        return fail(mismatchMessage(sctx));
      default:
        return fail(SIG.code.signFailed);
    }
  }
  revalidatePath(DOCUMENTS_PATH);
  return finalize(documentId, res.signedAtUtc ?? new Date().toISOString());
}

export async function resumeFinalizationAction(documentId: string): Promise<ResumeResult> {
  const loaded = await loadReady(await requireClient(), documentId);
  if (!loaded.ok) return loaded;
  const { ctx, sctx } = loaded;
  if (!sctx.signature || sctx.signature.signerUserId !== ctx.user.id) return fail(SIG.states.notSignable);
  if (sctx.state === 'signed') {
    return { ok: true, outcome: 'signed', signedAt: sctx.signature.signedAt, sealSha256: sctx.seal?.sha256 ?? null };
  }
  return finalize(documentId, sctx.signature.signedAt);
}
