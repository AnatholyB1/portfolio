import 'server-only';
import { INVITE_COPY, inviteInvalidMessage } from '@/lib/admin/inviteSchema';
import { inviteClient } from '@/lib/server/clients/invite';
import { lookupSiret, type SiretLookupResult } from '@/lib/server/clients/siret';
// Type seul (effacé à la compilation) : aucun import runtime de mcp/session.
import type { AdminCtx } from '@/lib/server/mcp/session';
import type { CoreResult } from './result';

function rec(input: unknown): Record<string, unknown> {
  return input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
}

function text(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

// Recherche Sirene (API publique, aucune donnée de dirigeant). Le résultat est renvoyé tel quel :
// c'est la forme que consomme le formulaire d'invitation.
export async function lookupSiretCore(_ctx: AdminCtx, input: unknown): Promise<SiretLookupResult> {
  return lookupSiret(String(rec(input).siret ?? ''));
}

// Invitation d'un client : service_role dans inviteClient (précondition : admin vérifié par l'appelant).
// L'input est celui d'inviteClient (validé par inviteSchema) : name, email, siret, company, companySource.
export async function inviteClientCore(
  ctx: AdminCtx,
  input: unknown,
): Promise<CoreResult<{ email: string }>> {
  const i = rec(input);
  const result = await inviteClient(
    {
      name: i.name,
      email: i.email,
      siret: i.siret,
      company: i.company,
      companySource: i.companySource,
    },
    { userId: ctx.user.id },
  );

  if (result.ok) {
    if (!result.mailSent) {
      console.error('[admin/invite] mail_not_sent');
      return { ok: false, message: INVITE_COPY.generic };
    }
    return { ok: true, message: INVITE_COPY.success(result.email), data: { email: result.email } };
  }

  switch (result.code) {
    case 'role_conflict':
      return { ok: false, message: INVITE_COPY.roleConflict };
    case 'already_member':
      return { ok: false, message: INVITE_COPY.alreadyMember };
    case 'existing_account':
      return { ok: false, message: INVITE_COPY.existingAccount };
    case 'invalid':
      return {
        ok: false,
        message: inviteInvalidMessage({ name: text(i.name), email: text(i.email), siret: text(i.siret) }),
      };
    default:
      console.error(`[admin/invite] ${result.code}`);
      return { ok: false, message: INVITE_COPY.generic };
  }
}
