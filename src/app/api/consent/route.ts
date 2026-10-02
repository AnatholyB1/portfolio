import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  ATTR_FT_COOKIE,
  ATTR_LT_COOKIE,
  ATTR_MAX_AGE_SECONDS,
  decodeTouch,
  encodeTouch,
  stripClickIds,
} from '@/lib/attribution/cookie';
import {
  ATTR_COOKIE_BEFORE_CONSENT,
  CONSENT_COOKIE,
  CONSENT_LOCALES,
  CONSENT_MAX_AGE_DAYS,
  CONSENT_VERSION,
} from '@/lib/consent/constants';
import { logConsent } from '@/lib/consent/serverLog';
import { readConsentFromCookieHeader, serialiseConsentCookie } from '@/lib/consent/state';
import { getClientIp, hashIp } from '@/lib/leads/ipHash';
import { hashKey, hitThrottle } from '@/lib/throttle';

const bodySchema = z.object({
  choice: z.enum(['accepted', 'refused']),
  version: z.string().min(1).max(40),
  locale: z.enum(CONSENT_LOCALES),
});

function hostOf(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

function originAllowed(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const originHost = hostOf(origin);
  if (!originHost) return false;
  const requestHost = request.headers.get('host') ?? hostOf(request.url);
  if (originHost === requestHost) return true;
  return originHost === hostOf(process.env.NEXT_PUBLIC_SITE_URL);
}

function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const p = part.trim();
    if (p.startsWith(`${name}=`)) return p.slice(name.length + 1);
  }
  return undefined;
}

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }
  const { choice, version, locale } = parsed.data;

  if (version !== CONSENT_VERSION) {
    return NextResponse.json({ error: 'unknown_version' }, { status: 400 });
  }
  if (!originAllowed(request)) {
    return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
  }

  const ip = getClientIp(request.headers);
  const allowed = await hitThrottle(hashKey('consent-ip', ip ?? 'unknown'), 60, 20);
  if (!allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const cookieHeader = request.headers.get('cookie');
  const existing = readConsentFromCookieHeader(cookieHeader);
  const anonId = existing?.id ?? randomUUID();

  // D-04 : le journal est écrit avant que le navigateur ne mémorise le choix.
  const logged = await logConsent({ anonId, choice, version, locale, ipHash: hashIp(ip) });
  if (!logged.ok) {
    return NextResponse.json({ error: 'log_failed' }, { status: 500 });
  }

  const secure = process.env.NODE_ENV === 'production';
  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    CONSENT_COOKIE,
    serialiseConsentCookie({ version, choice, id: anonId, at: Date.now() }),
    {
      httpOnly: false,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: CONSENT_MAX_AGE_DAYS * 86400,
    },
  );

  if (choice === 'refused') {
    const attrOpts = {
      httpOnly: true,
      secure,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: ATTR_MAX_AGE_SECONDS,
    };
    for (const name of [ATTR_FT_COOKIE, ATTR_LT_COOKIE]) {
      const value = readCookie(cookieHeader, name);
      if (!value) continue;
      const touch = ATTR_COOKIE_BEFORE_CONSENT ? decodeTouch(value, { allowClickIds: true }) : null;
      if (!touch) {
        response.cookies.set(name, '', { ...attrOpts, maxAge: 0 });
        continue;
      }
      response.cookies.set(name, encodeTouch(stripClickIds(touch)), attrOpts);
    }
  }

  return response;
}
