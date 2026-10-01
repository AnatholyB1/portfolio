import 'server-only';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSessionFresh } from './session-age';

export type Destination = '/admin' | '/espace-client';

// Le rôle vient TOUJOURS des tables (sv_admins / sv_client_members) lues via le
// client RLS, jamais des métadonnées de l'utilisateur (D-06, FOUND-03).
export async function getRoleDestination(
  supabase: SupabaseClient,
  userId: string,
): Promise<Destination | null> {
  const { data: admin } = await supabase
    .from('sv_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (admin) return '/admin';

  const { data: member } = await supabase
    .from('sv_client_members')
    .select('client_id')
    .eq('user_id', userId)
    .maybeSingle();
  return member ? '/espace-client' : null;
}

async function readIdentity(): Promise<{
  supabase: SupabaseClient;
  user: User;
  fresh: boolean;
} | null> {
  const supabase = await createSupabaseServerClient();
  // getUser() est vérifié côté serveur Auth ; getSession() est interdit.
  const { data } = await supabase.auth.getUser();
  const user = data?.user ?? null;
  if (!user) return null;

  // getClaims() ne sert qu'à lire le session_id (stable après refresh, spike A2).
  const { data: claimsData } = await supabase.auth.getClaims();
  const sessionId = (claimsData?.claims as { session_id?: string } | undefined)?.session_id;
  const fresh = await isSessionFresh(sessionId);
  return { supabase, user, fresh };
}

// Pour les pages et actions GARDÉES uniquement. Session périmée : déconnexion
// puis redirection. Ne jamais appeler depuis /connexion (voir probeSession).
export async function getVerifiedSession(): Promise<{ supabase: SupabaseClient; user: User } | null> {
  const identity = await readIdentity();
  if (!identity) return null;
  if (!identity.fresh) {
    await identity.supabase.auth.signOut({ scope: 'local' });
    redirect('/connexion?expired=1');
  }
  return { supabase: identity.supabase, user: identity.user };
}

// Sonde pour /connexion : ne redirige JAMAIS et ne déconnecte JAMAIS. Un Server
// Component ne peut pas effacer les cookies, donc un signOut ici laisserait la
// session intacte et créerait une boucle /connexion <-> page gardée.
export async function probeSession(): Promise<{
  supabase: SupabaseClient;
  user: User;
  fresh: boolean;
} | null> {
  return readIdentity();
}

export async function requireAdmin(): Promise<{ supabase: SupabaseClient; user: User }> {
  const session = await getVerifiedSession();
  if (!session) redirect('/connexion?next=/admin');
  const { data: admin } = await session.supabase
    .from('sv_admins')
    .select('user_id')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (!admin) notFound();
  return session;
}

export type ClientContext =
  | {
      status: 'ok';
      supabase: SupabaseClient;
      user: User;
      client: { id: string; name: string };
    }
  | { status: 'no_access'; user: User };

export async function requireClient(): Promise<ClientContext> {
  const session = await getVerifiedSession();
  if (!session) redirect('/connexion?next=/espace-client');

  const { data: admin } = await session.supabase
    .from('sv_admins')
    .select('user_id')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (admin) redirect('/admin');

  const { data: member } = await session.supabase
    .from('sv_client_members')
    .select('client_id, sv_clients(id, name)')
    .eq('user_id', session.user.id)
    .maybeSingle();

  const joined = (member as { sv_clients?: unknown } | null)?.sv_clients;
  const client = (Array.isArray(joined) ? joined[0] : joined) as
    | { id: string; name: string }
    | null
    | undefined;
  if (!member || !client) return { status: 'no_access', user: session.user };

  return {
    status: 'ok',
    supabase: session.supabase,
    user: session.user,
    client: { id: client.id, name: client.name },
  };
}
