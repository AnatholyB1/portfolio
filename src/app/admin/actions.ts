'use server';

import { revalidatePath } from 'next/cache';
import { INVITE_COPY } from '@/lib/admin/inviteSchema';
import { requireAdmin } from '@/lib/server/auth/dal';
import { createHash } from 'node:crypto';
import { hitThrottle } from '@/lib/server/auth/throttle';
import { inviteClient, resendInvitation } from '@/lib/server/clients/invite';
import { buildCompany, field } from '@/lib/admin/companyForm';
import { lookupSiret, type SiretLookupResult } from '@/lib/server/clients/siret';

export type InviteState = { status: 'idle' | 'success' | 'error'; message?: string };

// Chaque action revérifie l'admin AVANT toute logique service_role (T-10-46).
export async function lookupSiretAction(siret: string): Promise<SiretLookupResult> {
  await requireAdmin();
  return lookupSiret(String(siret ?? ''));
}

export async function inviteClientAction(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const { user } = await requireAdmin();

  const siretRaw = field(formData, 'siret');
  const result = await inviteClient(
    {
      name: field(formData, 'name'),
      email: field(formData, 'email'),
      siret: siretRaw,
      company: buildCompany(formData),
      companySource: field(formData, 'company_source') === 'manual' ? 'manual' : 'api',
    },
    { userId: user.id },
  );

  if (result.ok) {
    if (!result.mailSent) {
      console.error('[admin/invite] mail_not_sent');
      return { status: 'error', message: INVITE_COPY.generic };
    }
    revalidatePath('/admin');
    return { status: 'success', message: INVITE_COPY.success(result.email) };
  }

  switch (result.code) {
    case 'role_conflict':
      return { status: 'error', message: INVITE_COPY.roleConflict };
    case 'already_member':
      return { status: 'error', message: INVITE_COPY.alreadyMember };
    case 'existing_account':
      return { status: 'error', message: INVITE_COPY.existingAccount };
    case 'invalid':
      return {
        status: 'error',
        message: /^\d{14}$/.test(siretRaw.replace(/\s/g, ''))
          ? INVITE_COPY.generic
          : INVITE_COPY.siretInvalid,
      };
    default:
      console.error(`[admin/invite] ${result.code}`);
      return { status: 'error', message: INVITE_COPY.generic };
  }
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
