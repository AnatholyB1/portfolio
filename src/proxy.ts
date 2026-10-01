import { NextResponse, type NextRequest } from 'next/server';
import { PROTECTED_PREFIXES } from '@/lib/privateRoutes';
import { updateSession } from '@/lib/supabase/proxy';

// Le proxy rafraîchit uniquement les cookies de session et redirige les
// anonymes. Aucune décision de rôle ici : l'autorisation vit dans le DAL.
export async function proxy(request: NextRequest) {
  const { response, claims } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!claims && isProtected) {
    const redirect = NextResponse.redirect(
      new URL('/connexion?next=' + encodeURIComponent(pathname), request.url),
    );
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }
  return response;
}

// Littéral statique exigé par Next. Doit rester aligné sur PRIVATE_PREFIXES
// (vérifié par src/proxy.test.ts).
export const config = {
  matcher: [
    '/espace-client/:path*',
    '/espace-client',
    '/admin/:path*',
    '/admin',
    '/connexion',
    '/auth/:path*',
  ],
};
