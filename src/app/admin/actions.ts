'use server';

import { revalidatePath } from 'next/cache';
import { INVITE_COPY } from '@/lib/admin/inviteSchema';
import { requireAdmin } from '@/lib/server/auth/dal';
import { createHash } from 'node:crypto';
import { hitThrottle } from '@/lib/server/auth/throttle';
import { resendInvitation } from '@/lib/server/clients/invite';
import { buildCompany, field } from '@/lib/admin/companyForm';
import type { SiretLookupResult } from '@/lib/server/clients/siret';
import { inviteClientCore, lookupSiretCore } from '@/lib/server/admin/core/clients';

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

const RESEND_WINDOW_SECONDS = 600;
const RESEND_CLIENT_MAX = 3;
const RESEND_ADMIN_MAX = 20;

function throttleKey(kind: string, value: string): string {
  return `${kind}:${createHash('sha256').update(value).digest('hex')}`;
}

// Renvoi de l'invitation existante : jamais de nouveau client ni utilisateur.
export async function resendInvitationAction(clientId: string): Promise<InviteState> {
  const { user } = await requireAdmin();
  const id = String(clientId ?? '');

  const clientOk = await hitThrottle(
    throttleKey('invite-resend-client', id),
    RESEND_WINDOW_SECONDS,
    RESEND_CLIENT_MAX,
  );
  const adminOk = await hitThrottle(
    throttleKey('invite-resend-admin', user.id),
    RESEND_WINDOW_SECONDS,
    RESEND_ADMIN_MAX,
  );
  if (!clientOk || !adminOk) return { status: 'error', message: INVITE_COPY.resendRateLimited };

  const result = await resendInvitation(id);
  if (result.ok) return { status: 'success', message: INVITE_COPY.resendSuccess(result.email) };
  if (result.code === 'not_found') return { status: 'error', message: INVITE_COPY.resendNotFound };
  if (result.code !== 'invalid') console.error(`[admin/resend] ${result.code}`);
  return { status: 'error', message: INVITE_COPY.generic };
}
