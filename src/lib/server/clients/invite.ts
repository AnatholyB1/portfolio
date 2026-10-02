import 'server-only';
import { inviteSchema } from '@/lib/admin/inviteSchema';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isLoginEnabled } from '@/lib/supabase/env';
import { enqueueAndSend } from '@/lib/server/mail/outbox';
import { dedupeKey } from '@/lib/server/mail/rules';

export { buildLoginUrl } from '@/lib/server/mail/urls';

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

  // 1-2. Exclusivité des rôles et compte partagé existant (D-02).
  const check = await checkInviteeEmail(admin, email);
  if (check === 'error') return { ok: false, code: 'error' };
  if (check !== 'ok') return { ok: false, code: check };

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
  const mailSent =
    (await enqueueAndSend({
      event: 'client_invited',
      recipientEmail: email,
      dedupeKey: dedupeKey.clientInvited(clientId, email),
      payload: { clientName: name },
      clientId,
    })) === 'sent';

  return { ok: true, clientId, email, mailSent };
}

function fail(step: string): { ok: false; code: 'error' } {
  console.error(`[admin/invite] ${step} failed`);
  return { ok: false, code: 'error' };
}

export type InviteeCheck = 'ok' | 'role_conflict' | 'already_member' | 'existing_account' | 'error';

/** Contrôles d'adresse partagés avec la conversion (D-02). */
export async function checkInviteeEmail(
  admin: SupabaseClient,
  email: string,
): Promise<InviteeCheck> {
  const adminRow = await admin.from('sv_admins').select('user_id').eq('email', email).limit(1);
  if (adminRow.error) {
    fail('lookup_admin');
    return 'error';
  }
  if (adminRow.data && adminRow.data.length > 0) return 'role_conflict';

  const memberRow = await admin
    .from('sv_client_members')
    .select('user_id')
    .eq('invited_email', email)
    .limit(1);
  if (memberRow.error) {
    fail('lookup_member');
    return 'error';
  }
  if (memberRow.data && memberRow.data.length > 0) return 'already_member';

  const existing = await admin.rpc('sv_find_auth_user', { p_email: email });
  if (existing.error) {
    fail('lookup_auth');
    return 'error';
  }
  if (Array.isArray(existing.data) ? existing.data.length > 0 : Boolean(existing.data)) {
    return 'existing_account';
  }
  return 'ok';
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

  const prefix = dedupeKey.clientInvited(clientId, email);
  const prior = await admin
    .from('sv_mail_outbox')
    .select('id', { count: 'exact', head: true })
    .like('dedupe_key', `${prefix}%`);
  if (prior.error) return fail('resend_count');

  const outcome = await enqueueAndSend({
    event: 'client_invited',
    recipientEmail: email,
    dedupeKey: dedupeKey.clientInvited(clientId, email, prior.count ?? 0),
    payload: { clientName: name },
    clientId,
  });
  return outcome === 'sent' ? { ok: true, email } : { ok: false, code: 'mail_failed' };
}
