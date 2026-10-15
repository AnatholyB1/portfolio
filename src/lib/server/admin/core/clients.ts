import 'server-only';
import { createHash } from 'node:crypto';
import { INVITE_COPY, inviteInvalidMessage } from '@/lib/admin/inviteSchema';
import { hitThrottle } from '@/lib/server/auth/throttle';
import { inviteClient, resendInvitation } from '@/lib/server/clients/invite';
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

export type InviteData = { email: string; clientId?: string; mailSent?: boolean };

// Invitation d'un client : service_role dans inviteClient (précondition : admin vérifié par l'appelant).
// L'input est celui d'inviteClient (validé par inviteSchema) : name, email, siret, company, companySource.
export async function inviteClientCore(
  ctx: AdminCtx,
  input: unknown,
): Promise<CoreResult<InviteData>> {
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
      // Client et compte créés, e-mail non parti : message web inchangé, détail pour les outils.
      return {
        ok: false,
        message: INVITE_COPY.generic,
        data: { email: result.email, clientId: result.clientId, mailSent: false },
      };
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

const RESEND_WINDOW_SECONDS = 600;
const RESEND_CLIENT_MAX = 3;
const RESEND_ADMIN_MAX = 20;

function throttleKey(kind: string, value: string): string {
  return `${kind}:${createHash('sha256').update(value).digest('hex')}`;
}

// Renvoi de l'invitation existante : jamais de nouveau client ni utilisateur.
export async function resendInvitationCore(
  ctx: AdminCtx,
  input: unknown,
): Promise<CoreResult<{ email: string }>> {
  const id = String(rec(input).clientId ?? '');

  const clientOk = await hitThrottle(
    throttleKey('invite-resend-client', id),
    RESEND_WINDOW_SECONDS,
    RESEND_CLIENT_MAX,
  );
  const adminOk = await hitThrottle(
    throttleKey('invite-resend-admin', ctx.user.id),
    RESEND_WINDOW_SECONDS,
    RESEND_ADMIN_MAX,
  );
  if (!clientOk || !adminOk) return { ok: false, message: INVITE_COPY.resendRateLimited };

  const result = await resendInvitation(id);
  if (result.ok) {
    return { ok: true, message: INVITE_COPY.resendSuccess(result.email), data: { email: result.email } };
  }
  if (result.code === 'not_found') return { ok: false, message: INVITE_COPY.resendNotFound };
  if (result.code !== 'invalid') console.error(`[admin/resend] ${result.code}`);
  return { ok: false, message: INVITE_COPY.generic };
}
