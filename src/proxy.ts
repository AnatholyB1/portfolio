import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';
import { PROTECTED_PREFIXES, isPrivatePath } from '@/lib/privateRoutes';
import { updateSession } from '@/lib/supabase/proxy';
import { parseAttrParams, parseReferrer } from '@/lib/attribution/params';
import {
  CLICK_ID_ENRICH_WINDOW_MS,
  classifyArrival,
  classifyChannel,
  enrichFirstTouchClickIds,
  nextTouches,
  type Touch,
} from '@/lib/attribution/touch';
import {
  ATTR_FT_COOKIE,
  ATTR_LT_COOKIE,
  ATTR_MAX_AGE_SECONDS,
  decodeTouch,
  encodeTouch,
} from '@/lib/attribution/cookie';
import { ATTR_COOKIE_BEFORE_CONSENT, CONSENT_COOKIE } from '@/lib/consent/constants';
import { consentStatus, parseConsentCookie } from '@/lib/consent/state';
import { recordVisit } from '@/lib/leads/visits';

// Branche privée : le proxy rafraîchit uniquement les cookies de session et
// redirige les anonymes. Aucune décision de rôle ici : l'autorisation vit dans le DAL.
// Branche publique : travail sur chaînes uniquement, n'appelle jamais Supabase auth
// (Pitfall 6) ; cookies d'attribution + compteur de visites anonyme.
export async function proxy(request: NextRequest, event: NextFetchEvent) {
  if (isPrivatePath(request.nextUrl.pathname)) return privateBranch(request);
  return attributionBranch(request, event);
}

async function privateBranch(request: NextRequest) {
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

function attributionBranch(request: NextRequest, event: NextFetchEvent) {
  const consent = parseConsentCookie(request.cookies.get(CONSENT_COOKIE)?.value);
  const accepted = consentStatus(consent) === 'accepted';

  const canonicalHost = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sevalys.com').hostname;
  const params = parseAttrParams(request.nextUrl.searchParams, { allowClickIds: accepted });
  const referrer = parseReferrer(request.headers.get('referer'), canonicalHost);
  const hasAuthCookie = request.cookies.getAll().some((c) => c.name.startsWith('sb-'));

  const verdict = classifyArrival({
    method: request.method,
    secFetchDest: request.headers.get('sec-fetch-dest'),
    secFetchMode: request.headers.get('sec-fetch-mode'),
    userAgent: request.headers.get('user-agent'),
    host: request.nextUrl.hostname,
    canonicalHost,
    hasAuthCookie,
    params,
    referrer,
  });
  if (verdict === 'skip') {
    const skipped = NextResponse.next();
    if (request.nextUrl.searchParams.has('_attrdebug')) skipped.headers.set('x-attr-debug', ['skip', request.method, request.headers.get('sec-fetch-dest'), request.headers.get('sec-fetch-mode'), request.headers.get('user-agent')?.slice(0, 30), hasAuthCookie, Object.keys(params).join('+'), request.nextUrl.search, request.url.slice(0, 80)].join('|'));
    return skipped;
  }

  const touch: Touch = {
    params,
    landing: request.nextUrl.pathname.slice(0, 200),
    referrer,
    at: Date.now(),
  };
  const response = NextResponse.next();
  if (request.nextUrl.searchParams.has('_attrdebug')) response.headers.set('x-attr-debug', 'arrival:' + request.nextUrl.hostname);

  if (ATTR_COOKIE_BEFORE_CONSENT || accepted) {
    const existingFt = decodeTouch(request.cookies.get(ATTR_FT_COOKIE)?.value, {
      allowClickIds: accepted,
    });
    const existingLt = decodeTouch(request.cookies.get(ATTR_LT_COOKIE)?.value, {
      allowClickIds: accepted,
    });
    const next = nextTouches({ ft: existingFt, lt: existingLt }, touch);
    let ft = next.ft;
    let ftChanged = next.ftChanged;

    // Pitfall 2 : rechargement de l'URL d'arrivée juste après « Accepter ».
    if (
      !ftChanged &&
      accepted &&
      consent &&
      consent.at >= Date.now() - CLICK_ID_ENRICH_WINDOW_MS
    ) {
      const enriched = enrichFirstTouchClickIds(ft, touch);
      if (enriched) {
        ft = enriched;
        ftChanged = true;
      }
    }

    const opts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: ATTR_MAX_AGE_SECONDS,
    };
    response.cookies.set(ATTR_LT_COOKIE, encodeTouch(next.lt), opts);
    if (ftChanged) response.cookies.set(ATTR_FT_COOKIE, encodeTouch(ft), opts);
  }

  const channel = classifyChannel(touch);
  event.waitUntil(
    recordVisit({
      source: channel.source,
      medium: channel.medium,
      campaign: channel.campaign,
      landing: touch.landing,
    }),
  );
  return response;
}

// Littéral statique exigé par Next. Les entrées privées doivent rester alignées
// sur PRIVATE_PREFIXES (vérifié par src/proxy.test.ts).
export const config = {
  matcher: [
    '/espace-client/:path*',
    '/espace-client',
    '/admin/:path*',
    '/admin',
    '/connexion',
    '/auth/:path*',
    {
      source: '/((?!api|_next|_vercel|\\.well-known|.*\\..*).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
