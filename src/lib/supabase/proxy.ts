import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabasePublicKey, getSupabaseUrl } from './env';

// Rafraîchit la session Supabase pour src/proxy.ts. Aucune décision
// d'autorisation ici : on renvoie la réponse (cookies à jour) et les claims.
export async function updateSession(
  request: NextRequest,
): Promise<{ response: NextResponse; claims: Record<string, unknown> | null }> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabasePublicKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const claims = (data?.claims ?? null) as Record<string, unknown> | null;
  return { response, claims };
}
