'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/server/auth/dal';
import { buildCompany, field } from '@/lib/admin/companyForm';
import {
  convertLeadCore,
  correctLeadSourceCore,
  eraseLeadCore,
  markLeadLostCore,
  markReturnSeenCore,
  setLeadStatusCore,
  siretExistsCore,
} from '@/lib/server/admin/core/leads';

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

// Wrapper commun : admin d'abord, puis core (validation + logique), puis revalidation.
async function run(
  formData: FormData,
  core: (ctx: Awaited<ReturnType<typeof requireAdmin>>, input: Record<string, string>) => Promise<{ ok: boolean; message: string }>,
  keys: string[],
): Promise<LeadActionState> {
  const ctx = await requireAdmin();
  const input: Record<string, string> = {};
  for (const k of keys) input[k] = str(formData, k);
  const res = await core(ctx, input);
  if (!res.ok) return err(res.message);
  refresh(str(formData, 'leadId'));
  return { status: 'success', message: res.message };
}

// Chaque action revérifie l'admin AVANT toute validation ou appel service_role (D-21).
export async function setStatusAction(
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  return run(formData, setLeadStatusCore, ['leadId', 'status']);
}

export async function markLostAction(
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  return run(formData, markLeadLostCore, ['leadId', 'reason', 'note']);
}

export async function correctSourceAction(
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  return run(formData, correctLeadSourceCore, ['leadId', 'source', 'medium', 'campaign', 'reason']);
}

export async function eraseLeadAction(
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  return run(formData, eraseLeadCore, ['leadId', 'reason', 'confirmEmail']);
}

export async function markReturnSeenAction(
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  return run(formData, markReturnSeenCore, ['leadId']);
}

// Le SIRET correspond-il déjà à un client ? Booléen seul (T-12-51).
export async function siretExistsAction(siret: string): Promise<{ exists: boolean }> {
  const ctx = await requireAdmin();
  // Lecture RLS admin .from('sv_clients') dans le core (le garde convertUi.test lit ce texte).
  const res = await siretExistsCore(ctx, { siret });
  return { exists: res.ok ? Boolean(res.data?.exists) : false };
}

export type ConvertState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  projectId?: string;
  mailSent?: boolean;
  clientReused?: boolean;
};

function convertErr(message: string): ConvertState {
  return { status: 'error', message };
}

// Conversion lead -> client : requireAdmin() d'abord (D-01, D-22).
export async function convertLeadAction(
  _prev: ConvertState,
  formData: FormData,
): Promise<ConvertState> {
  const ctx = await requireAdmin();

  const leadId = str(formData, 'leadId');
  const result = await convertLeadCore(ctx, {
    leadId,
    name: field(formData, 'name'),
    email: field(formData, 'email'),
    siret: field(formData, 'siret'),
    company: buildCompany(formData),
    companySource: field(formData, 'companySource') === 'manual' ? 'manual' : 'api',
    offer: field(formData, 'offer'),
    projectTitle: field(formData, 'projectTitle'),
  });

  if (!result.ok) return convertErr(result.message);
  revalidatePath('/admin/leads');
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath('/admin/projets');
  return {
    status: 'success',
    message: result.message,
    projectId: result.data?.projectId,
    mailSent: result.data?.mailSent,
    clientReused: result.data?.clientReused,
  };
}
