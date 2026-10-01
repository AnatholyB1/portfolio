import 'server-only';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getSupabasePublicKey, getSupabaseUrl } from './env';

// Client Supabase lié à la session par cookies (@supabase/ssr), clé publique.
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(getSupabaseUrl(), getSupabasePublicKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Les Server Components ne peuvent pas écrire de cookies :
          // le proxy rafraîchit la session (Pitfall 6).
        }
      },
    },
  }) as unknown as SupabaseClient;
}
