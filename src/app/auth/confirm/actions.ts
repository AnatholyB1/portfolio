'use server';

import { redirect } from 'next/navigation';
import { LOGIN_COPY } from '@/lib/auth/schemas';
import { safeNext } from '@/lib/auth/safeNext';
import { getRoleDestination } from '@/lib/server/auth/dal';
import { LOGIN_VERIFY_TYPES } from '@/lib/server/auth/login';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const TOKEN_HASH_MAX = 200;

// Le type de vérification vient de LOGIN_VERIFY_TYPES.link, jamais du client ni de l'URL.
export async function confirmLinkAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const raw = formData.get('token_hash');
  const tokenHash = typeof raw === 'string' ? raw.trim() : '';
  if (!tokenHash || tokenHash.length > TOKEN_HASH_MAX) return { error: LOGIN_COPY.wrongCode };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: LOGIN_VERIFY_TYPES.link,
  });
  if (error || !data?.user) return { error: LOGIN_COPY.wrongCode };

  const destination = await getRoleDestination(supabase, data.user.id);
  if (!destination) {
    await supabase.auth.signOut({ scope: 'local' });
    return { error: LOGIN_COPY.generic };
  }
  const next = formData.get('next');
  redirect(safeNext(typeof next === 'string' ? next : null, destination));
}
