import 'server-only';
import { convertSchema } from '@/lib/projects/schemas';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isLoginEnabled } from '@/lib/supabase/env';
import { checkInviteeEmail } from '@/lib/server/clients/invite';
import { sendOutboxRow } from '@/lib/server/mail/outbox';
import { callRpc } from '@/lib/server/rpc';
import { syncOnboardingFacts } from '@/lib/server/projects/onboarding';

export type ConvertResult =
  | {
      ok: true;
      clientId: string;
      projectId: string;
      clientReused: boolean;
      email: string;
      mailSent: boolean;
    }
  | {
      ok: false;
      code:
        | 'invalid'
        | 'mail_disabled'
        | 'role_conflict'
        | 'already_member'
        | 'existing_account'
        | 'already_converted'
        | 'not_convertible'
        | 'not_found'
        | 'error';
    };

type RpcPayload = {
  client_id: string;
  project_id: string;
  client_reused: boolean;
  outbox_id: string | null;
};

/**
 * Conversion lead -> client (D-01..D-05, D-19).
 *
 * PRECONDITION : l'appelant a deja execute requireAdmin(). Ce module utilise
 * service_role et ne verifie pas lui-meme l'appelant. Toutes les ecritures
 * metier vivent dans la RPC sv_convert_lead (atomique) ; seul l'utilisateur
 * auth cree juste avant est compense (supprime) si la RPC echoue.
 */
export async function convertLead(
  input: unknown,
  actor: { userId: string },
): Promise<ConvertResult> {
  const parsed = convertSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: 'invalid' };
  const { leadId, name, email, siret, company, companySource, offer, projectTitle } = parsed.data;

  if (!isLoginEnabled()) return { ok: false, code: 'mail_disabled' };

  const admin = createSupabaseAdminClient();

  const check = await checkInviteeEmail(admin, email);
  if (check === 'error') return { ok: false, code: 'error' };
  if (check !== 'ok') return { ok: false, code: check };

  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  const userId = created.data?.user?.id;
  if (created.error || !userId) {
    console.error('[admin/convert] create_user failed');
    return { ok: false, code: 'error' };
  }

  const rpc = await callRpc<RpcPayload>('admin/convert', 'sv_convert_lead', {
    p_lead_id: leadId,
    p_actor: actor.userId,
    p_user_id: userId,
    p_email: email,
    p_name: name,
    p_siret: siret,
    p_company: company,
    p_company_source: companySource,
    p_project_title: projectTitle,
    p_offer: offer,
  });

  if (!rpc.ok) {
    try {
      await admin.auth.admin.deleteUser(userId);
    } catch {
      console.error('[admin/convert] compensation failed');
    }
    switch (rpc.code) {
      case 'sv_lead_already_converted':
        return { ok: false, code: 'already_converted' };
      case 'sv_lead_not_convertible':
        return { ok: false, code: 'not_convertible' };
      case 'sv_role_conflict':
        return { ok: false, code: 'role_conflict' };
      case 'sv_lead_not_found':
      case 'sv_lead_erased':
        return { ok: false, code: 'not_found' };
      default:
        return { ok: false, code: 'error' };
    }
  }

  const row = rpc.data;
  const clientId = row.client_id;

  // Un echec d'envoi n'annule jamais la conversion (D-18, D-19) : le cron reprend.
  let mailSent = false;
  if (row.outbox_id) {
    try {
      mailSent = (await sendOutboxRow(row.outbox_id)) === 'sent';
    } catch {
      console.error('[admin/convert] mail send threw');
    }
  }

  if (row.client_reused) {
    try {
      await syncOnboardingFacts(clientId);
    } catch {
      console.error('[admin/convert] onboarding sync failed');
    }
  }

  return {
    ok: true,
    clientId,
    projectId: row.project_id,
    clientReused: row.client_reused === true,
    email,
    mailSent,
  };
}
