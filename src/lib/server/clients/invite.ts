import 'server-only';
import { Resend } from 'resend';
import { inviteSchema } from '@/lib/admin/inviteSchema';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSiteUrl, isLoginEnabled } from '@/lib/supabase/env';
import {
  buildInviteEmail,
  INVITE_EMAIL_FROM,
  INVITE_EMAIL_REPLY_TO,
} from '@/lib/server/mail/inviteEmail';

export type InviteResult =
  | { ok: true; clientId: string; email: string; mailSent: boolean }
  | {
      ok: false;
      code:
        | 'invalid'
        | 'role_conflict'
        | 'already_member'
        | 'existing_account'
        | 'mail_disabled'
        | 'error';
    };

/**
 * Invitation d'un client (D-01, D-03, D-04).
 *
 * PRÉCONDITION : l'appelant (Server Action, plan 10-11) a déjà exécuté
 * requireAdmin() (identité vérifiée via getUser). Ce module utilise la clé
 * service_role et ne vérifie pas lui-même l'appelant.
 *
 * Un compte déjà présent dans auth.users (projet partagé) n'est jamais
 * réutilisé ni supprimé (prise de compte préalable).
 */
export async function inviteClient(
  input: unknown,
  actor: { userId: string },
): Promise<InviteResult> {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: 'invalid' };
  const { name, email, siret, company, companySource } = parsed.data;

  if (!isLoginEnabled()) return { ok: false, code: 'mail_disabled' };

  const admin = createSupabaseAdminClient();

  // 1. Exclusivité des rôles : adresse déjà admin / déjà membre.
  const adminRow = await admin.from('sv_admins').select('user_id').eq('email', email).limit(1);
  if (adminRow.error) return fail('lookup_admin');
  if (adminRow.data && adminRow.data.length > 0) return { ok: false, code: 'role_conflict' };

  const memberRow = await admin
    .from('sv_client_members')
    .select('user_id')
    .eq('invited_email', email)
    .limit(1);
  if (memberRow.error) return fail('lookup_member');
  if (memberRow.data && memberRow.data.length > 0) return { ok: false, code: 'already_member' };

  // 2. Compte existant sur le projet partagé : jamais réutilisé.
  const existing = await admin.rpc('sv_find_auth_user', { p_email: email });
  if (existing.error) return fail('lookup_auth');
  if (Array.isArray(existing.data) ? existing.data.length > 0 : Boolean(existing.data)) {
    return { ok: false, code: 'existing_account' };
  }

  // 3. Création de l'utilisateur : sans mot de passe, e-mail confirmé.
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  const userId = created.data?.user?.id;
  if (created.error || !userId) return fail('create_user');

  let clientId: string | null = null;
  let clientCreated = false;

  const rollback = async () => {
    try {
      await admin.auth.admin.deleteUser(userId);
      if (clientCreated && clientId) {
        await admin.from('sv_clients').delete().eq('id', clientId);
      }
    } catch {
      console.error('[admin/invite] rollback failed');
    }
  };

  // 4. Client (réutilisé si le SIRET existe déjà, D-03) puis membre.
  const found = await admin.from('sv_clients').select('id').eq('siret', siret).maybeSingle();
  if (found.error) {
    await rollback();
    return fail('lookup_client');
  }

  if (found.data?.id) {
    clientId = found.data.id as string;
  } else {
    const inserted = await admin
      .from('sv_clients')
      .insert({
        name,
        siret,
        company,
        company_source: companySource,
        created_by: actor.userId,
      })
      .select('id')
      .single();
    if (inserted.error || !inserted.data?.id) {
      await rollback();
      return fail('insert_client');
    }
    clientId = inserted.data.id as string;
    clientCreated = true;
  }

  const member = await admin
    .from('sv_client_members')
    .insert({ client_id: clientId, user_id: userId, invited_email: email });
  if (member.error) {
    await rollback();
    if (String(member.error.message ?? '').includes('sv_role_conflict')) {
      return { ok: false, code: 'role_conflict' };
    }
    return fail('insert_member');
  }

  // 5. E-mail d'invitation : un échec n'annule pas les lignes créées.
  const mailSent = await sendInvitationEmail(email, name);

  return { ok: true, clientId, email, mailSent };
}

function fail(step: string): { ok: false; code: 'error' } {
  console.error(`[admin/invite] ${step} failed`);
  return { ok: false, code: 'error' };
}

/** Lien de connexion avec l'e-mail prérempli. */
export function buildLoginUrl(email: string): string {
  return `${getSiteUrl()}/connexion?email=${encodeURIComponent(email)}`;
}

async function sendInvitationEmail(email: string, clientName: string): Promise<boolean> {
  try {
    const mail = buildInviteEmail({ clientName, loginUrl: buildLoginUrl(email) });
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: INVITE_EMAIL_FROM,
      to: email,
      replyTo: INVITE_EMAIL_REPLY_TO,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    if (result.error) console.error('[admin/invite] mail send failed');
    return !result.error;
  } catch {
    console.error('[admin/invite] mail send failed');
    return false;
  }
}

export type ResendResult =
  | { ok: true; email: string }
  | { ok: false; code: 'invalid' | 'not_found' | 'mail_disabled' | 'mail_failed' | 'error' };

/**
 * Renvoi de l'invitation existante. PRÉCONDITION : requireAdmin() déjà exécuté.
 * Ne crée jamais de client ni d'utilisateur : lecture seule puis envoi.
 */
export async function resendInvitation(clientId: unknown): Promise<ResendResult> {
  if (typeof clientId !== 'string' || !/^[0-9a-f-]{36}$/i.test(clientId)) {
    return { ok: false, code: 'invalid' };
  }
  if (!isLoginEnabled()) return { ok: false, code: 'mail_disabled' };

  const admin = createSupabaseAdminClient();
  const member = await admin
    .from('sv_client_members')
    .select('invited_email')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })
    .limit(1);
  if (member.error) return fail('resend_member');
  const email = (member.data?.[0] as { invited_email?: string | null } | undefined)?.invited_email;
  if (!email) return { ok: false, code: 'not_found' };

  const client = await admin.from('sv_clients').select('name').eq('id', clientId).maybeSingle();
  if (client.error) return fail('resend_client');
  const name = (client.data as { name?: string } | null)?.name;
  if (!name) return { ok: false, code: 'not_found' };

  const sent = await sendInvitationEmail(email, name);
  return sent ? { ok: true, email } : { ok: false, code: 'mail_failed' };
}
