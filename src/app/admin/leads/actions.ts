'use server';

import { revalidatePath } from 'next/cache';
import { ADMIN_COPY, STATUS_LABELS, type LeadStatus } from '@/lib/admin/leadLabels';
import { correctionSchema, eraseSchema, lostSchema, statusSchema } from '@/lib/admin/leadSchemas';
import { requireAdmin } from '@/lib/server/auth/dal';
import {
  correctLeadSource,
  eraseLead,
  markReturnSeen,
  setLeadStatus,
} from '@/lib/server/leads/admin';

export type LeadActionState = { status: 'idle' | 'success' | 'error'; message?: string };

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
}

function err(message: string): LeadActionState {
  return { status: 'error', message };
}

function refresh(leadId: string) {
  revalidatePath('/admin/leads');
  revalidatePath(`/admin/leads/${leadId}`);
}

// Chaque action revérifie l'admin AVANT toute validation ou appel service_role (D-21).
export async function setStatusAction(
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const { user } = await requireAdmin();
  const parsed = statusSchema.safeParse({
    leadId: str(formData, 'leadId'),
    status: str(formData, 'status'),
  });
  if (!parsed.success) return err(ADMIN_COPY.statusError);
  // « Perdu » passe obligatoirement par markLostAction (motif requis).
  if (parsed.data.status === 'lost') return err(ADMIN_COPY.lostReasonRequired);

  const res = await setLeadStatus({
    leadId: parsed.data.leadId,
    status: parsed.data.status,
    actor: user.id,
  });
  if (!res.ok) return err(ADMIN_COPY.statusError);
  refresh(parsed.data.leadId);
  return {
    status: 'success',
    message: ADMIN_COPY.statusSuccess(STATUS_LABELS[parsed.data.status as LeadStatus]),
  };
}

export async function markLostAction(
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const { user } = await requireAdmin();
  const note = str(formData, 'note').trim();
  const parsed = lostSchema.safeParse({
    leadId: str(formData, 'leadId'),
    reason: str(formData, 'reason'),
    note: note || undefined,
  });
  if (!parsed.success) {
    const reasonMissing = parsed.error.issues.some((i) => i.path[0] === 'reason');
    return err(reasonMissing ? ADMIN_COPY.lostReasonRequired : ADMIN_COPY.statusError);
  }

  const res = await setLeadStatus({
    leadId: parsed.data.leadId,
    status: 'lost',
    actor: user.id,
    lostReason: parsed.data.reason,
    note: parsed.data.note ?? null,
  });
  if (!res.ok) return err(ADMIN_COPY.statusError);
  refresh(parsed.data.leadId);
  return { status: 'success', message: ADMIN_COPY.statusSuccess(STATUS_LABELS.lost) };
}

export async function correctSourceAction(
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const { user } = await requireAdmin();
  const parsed = correctionSchema.safeParse({
    leadId: str(formData, 'leadId'),
    source: str(formData, 'source'),
    medium: str(formData, 'medium'),
    campaign: str(formData, 'campaign'),
    reason: str(formData, 'reason'),
  });
  if (!parsed.success) {
    const reasonBad = parsed.error.issues.some((i) => i.path[0] === 'reason');
    return err(reasonBad ? ADMIN_COPY.correctionReasonRequired : ADMIN_COPY.genericError);
  }

  const res = await correctLeadSource({ ...parsed.data, actor: user.id });
  if (!res.ok) return err(ADMIN_COPY.genericError);
  refresh(parsed.data.leadId);
  return { status: 'success', message: ADMIN_COPY.correctionSuccess };
}

export async function eraseLeadAction(
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const { user, supabase } = await requireAdmin();
  const parsed = eraseSchema.safeParse({
    leadId: str(formData, 'leadId'),
    reason: str(formData, 'reason'),
    confirmEmail: str(formData, 'confirmEmail'),
  });
  if (!parsed.success) return err(ADMIN_COPY.genericError);

  // E-mail courant lu via le client RLS (jamais service_role).
  const { data } = await supabase
    .from('sv_leads_admin_v')
    .select('contact_email')
    .eq('id', parsed.data.leadId)
    .maybeSingle();
  const email = typeof data?.contact_email === 'string' ? data.contact_email : '';
  if (!email || email.trim().toLowerCase() !== parsed.data.confirmEmail.toLowerCase()) {
    return err(ADMIN_COPY.eraseConfirmMismatch);
  }

  const res = await eraseLead(parsed.data.leadId, user.id, parsed.data.reason);
  if (!res.ok) return err(ADMIN_COPY.genericError);
  refresh(parsed.data.leadId);
  return { status: 'success', message: ADMIN_COPY.eraseSuccess };
}

export async function markReturnSeenAction(
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const { user } = await requireAdmin();
  const parsed = statusSchema.shape.leadId.safeParse(str(formData, 'leadId'));
  if (!parsed.success) return err(ADMIN_COPY.genericError);

  const res = await markReturnSeen(parsed.data, user.id);
  if (!res.ok) return err(ADMIN_COPY.genericError);
  refresh(parsed.data);
  return { status: 'success', message: ADMIN_COPY.returnSeenSuccess };
}
