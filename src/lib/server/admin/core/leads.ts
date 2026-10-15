import 'server-only';
import { ADMIN_COPY, STATUS_LABELS, type LeadStatus } from '@/lib/admin/leadLabels';
import { correctionSchema, eraseSchema, lostSchema, statusSchema } from '@/lib/admin/leadSchemas';
import { INVITE_COPY } from '@/lib/admin/inviteSchema';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { convertLead } from '@/lib/server/projects/convert';
import {
  correctLeadSource,
  eraseLead,
  markReturnSeen,
  setLeadStatus,
} from '@/lib/server/leads/admin';
// Type seul (effacé à la compilation) : aucun import runtime de mcp/session.
import type { AdminCtx } from '@/lib/server/mcp/session';
import type { CoreResult } from './result';
import { rec } from './shared';

export type { CoreResult } from './result';

function fail(message: string): CoreResult {
  return { ok: false, message };
}

export async function setLeadStatusCore(ctx: AdminCtx, input: unknown): Promise<CoreResult> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return fail(ADMIN_COPY.statusError);
  // « Perdu » passe obligatoirement par markLeadLostCore (motif requis).
  if (parsed.data.status === 'lost') return fail(ADMIN_COPY.lostReasonRequired);

  const res = await setLeadStatus({
    leadId: parsed.data.leadId,
    status: parsed.data.status,
    actor: ctx.user.id,
  });
  if (!res.ok) return fail(ADMIN_COPY.statusError);
  return {
    ok: true,
    message: ADMIN_COPY.statusSuccess(STATUS_LABELS[parsed.data.status as LeadStatus]),
  };
}

export async function markLeadLostCore(ctx: AdminCtx, input: unknown): Promise<CoreResult> {
  const i = rec(input);
  const note = typeof i.note === 'string' ? i.note.trim() : '';
  const parsed = lostSchema.safeParse({
    leadId: i.leadId,
    reason: i.reason,
    note: note || undefined,
  });
  if (!parsed.success) {
    const reasonMissing = parsed.error.issues.some((x) => x.path[0] === 'reason');
    return fail(reasonMissing ? ADMIN_COPY.lostReasonRequired : ADMIN_COPY.statusError);
  }

  const res = await setLeadStatus({
    leadId: parsed.data.leadId,
    status: 'lost',
    actor: ctx.user.id,
    lostReason: parsed.data.reason,
    note: parsed.data.note ?? null,
  });
  if (!res.ok) return fail(ADMIN_COPY.statusError);
  return { ok: true, message: ADMIN_COPY.statusSuccess(STATUS_LABELS.lost) };
}

export async function correctLeadSourceCore(ctx: AdminCtx, input: unknown): Promise<CoreResult> {
  const parsed = correctionSchema.safeParse(input);
  if (!parsed.success) {
    const reasonBad = parsed.error.issues.some((x) => x.path[0] === 'reason');
    return fail(reasonBad ? ADMIN_COPY.correctionReasonRequired : ADMIN_COPY.genericError);
  }

  const res = await correctLeadSource({ ...parsed.data, actor: ctx.user.id });
  if (!res.ok) return fail(ADMIN_COPY.genericError);
  return { ok: true, message: ADMIN_COPY.correctionSuccess };
}

export async function eraseLeadCore(ctx: AdminCtx, input: unknown): Promise<CoreResult> {
  const parsed = eraseSchema.safeParse(input);
  if (!parsed.success) return fail(ADMIN_COPY.genericError);

  // E-mail courant lu via le client RLS (jamais service_role).
  const { data } = await ctx.supabase
    .from('sv_leads_admin_v')
    .select('contact_email')
    .eq('id', parsed.data.leadId)
    .maybeSingle();
  const email = typeof data?.contact_email === 'string' ? data.contact_email : '';
  if (!email || email.trim().toLowerCase() !== parsed.data.confirmEmail.toLowerCase()) {
    return fail(ADMIN_COPY.eraseConfirmMismatch);
  }

  const res = await eraseLead(parsed.data.leadId, ctx.user.id, parsed.data.reason);
  if (!res.ok) return fail(ADMIN_COPY.genericError);
  return { ok: true, message: ADMIN_COPY.eraseSuccess };
}

export async function markReturnSeenCore(ctx: AdminCtx, input: unknown): Promise<CoreResult> {
  const parsed = statusSchema.shape.leadId.safeParse(rec(input).leadId);
  if (!parsed.success) return fail(ADMIN_COPY.genericError);

  const res = await markReturnSeen(parsed.data, ctx.user.id);
  if (!res.ok) return fail(ADMIN_COPY.genericError);
  return { ok: true, message: ADMIN_COPY.returnSeenSuccess };
}

// Le SIRET correspond-il déjà à un client ? Booléen seul, lecture RLS admin (T-12-51).
export async function siretExistsCore(
  ctx: AdminCtx,
  input: unknown,
): Promise<CoreResult<{ exists: boolean }>> {
  const siret = rec(input).siret;
  const digits = typeof siret === 'string' ? siret.replace(/\s/g, '') : '';
  if (!/^\d{14}$/.test(digits)) return { ok: true, message: '', data: { exists: false } };
  const { data } = await ctx.supabase.from('sv_clients').select('id').eq('siret', digits).maybeSingle();
  return { ok: true, message: '', data: { exists: Boolean(data) } };
}

export type ConvertData = { projectId: string; mailSent: boolean; clientReused: boolean };

// L'input est celui de convertLead (validé par convertSchema) : le core ne le re-parse pas.
export async function convertLeadCore(ctx: AdminCtx, input: unknown): Promise<CoreResult<ConvertData>> {
  const siretRaw = rec(input).siret;
  const result = await convertLead(input, { userId: ctx.user.id });

  if (result.ok) {
    return {
      ok: true,
      message: result.mailSent
        ? PROJECT_COPY.conversion.success(result.email)
        : PROJECT_COPY.conversion.mailFailed,
      data: {
        projectId: result.projectId,
        mailSent: result.mailSent,
        clientReused: result.clientReused,
      },
    };
  }

  switch (result.code) {
    case 'role_conflict':
    case 'already_member':
    case 'existing_account':
      return fail(PROJECT_COPY.conversion.emailTaken);
    case 'already_converted':
      return fail(PROJECT_COPY.conversion.alreadyConverted);
    case 'not_convertible':
      return fail(PROJECT_COPY.conversion.statusNotAllowed);
    case 'invalid':
      return fail(
        /^\d{14}$/.test((typeof siretRaw === 'string' ? siretRaw : '').replace(/\s/g, ''))
          ? INVITE_COPY.generic
          : INVITE_COPY.siretInvalid,
      );
    default:
      console.error(`[admin/convert] ${result.code}`);
      return fail(INVITE_COPY.generic);
  }
}
