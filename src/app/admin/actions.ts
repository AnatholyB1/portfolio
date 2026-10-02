'use server';

import { revalidatePath } from 'next/cache';
import { INVITE_COPY } from '@/lib/admin/inviteSchema';
import { requireAdmin } from '@/lib/server/auth/dal';
import { inviteClient } from '@/lib/server/clients/invite';
import { lookupSiret, type SiretLookupResult } from '@/lib/server/clients/siret';

export type InviteState = { status: 'idle' | 'success' | 'error'; message?: string };

// Chaque action revérifie l'admin AVANT toute logique service_role (T-10-46).
export async function lookupSiretAction(siret: string): Promise<SiretLookupResult> {
  await requireAdmin();
  return lookupSiret(String(siret ?? ''));
}

const COMPANY_FIELDS = [
  'nom',
  'adresse',
  'code_postal',
  'commune',
  'naf',
  'siren',
  'forme_juridique_code',
  'etat_administratif',
  'categorie_entreprise',
  'date_creation',
  'tva_intracom',
] as const;

function field(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v.trim() : '';
}

function buildCompany(fd: FormData): Record<string, string> | null {
  const company: Record<string, string> = {};
  for (const key of COMPANY_FIELDS) {
    const v = field(fd, `company_${key}`);
    if (v) company[key] = v;
  }
  return company.nom ? company : null;
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
