'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/server/auth/dal';
import { buildCompany, field } from '@/lib/admin/companyForm';
import type { SiretLookupResult } from '@/lib/server/clients/siret';
import { inviteClientCore, lookupSiretCore, resendInvitationCore } from '@/lib/server/admin/core/clients';

export type InviteState = { status: 'idle' | 'success' | 'error'; message?: string };

// Chaque action revérifie l'admin AVANT toute logique service_role (T-10-46).
export async function lookupSiretAction(siret: string): Promise<SiretLookupResult> {
  const ctx = await requireAdmin();
  return lookupSiretCore(ctx, { siret });
}

export async function inviteClientAction(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const ctx = await requireAdmin();

  const result = await inviteClientCore(ctx, {
    name: field(formData, 'name'),
    email: field(formData, 'email'),
    siret: field(formData, 'siret'),
    company: buildCompany(formData),
    companySource: field(formData, 'company_source') === 'manual' ? 'manual' : 'api',
  });

  if (!result.ok) return { status: 'error', message: result.message };
  revalidatePath('/admin');
  return { status: 'success', message: result.message };
}

// Renvoi de l'invitation existante : jamais de nouveau client ni utilisateur.
export async function resendInvitationAction(clientId: string): Promise<InviteState> {
  const ctx = await requireAdmin();
  const result = await resendInvitationCore(ctx, { clientId });
  return { status: result.ok ? 'success' : 'error', message: result.message };
}
