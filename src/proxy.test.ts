import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextRequest, type NextFetchEvent, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PRIVATE_PREFIXES } from '@/lib/privateRoutes';
import { decodeTouch, encodeTouch } from '@/lib/attribution/cookie';
import { CONSENT_VERSION } from '@/lib/consent/constants';

const flags = vi.hoisted(() => ({ beforeConsent: true }));

vi.mock('@/lib/supabase/proxy', () => ({
  updateSession: vi.fn(async (req: NextRequest) => ({
    response: NextResponse.next({ request: req }),
    claims: null,
  })),
}));
vi.mock('@/lib/leads/visits', () => ({ recordVisit: vi.fn(async () => {}) }));
vi.mock('@/lib/consent/constants', async (orig) => {
  const actual = await orig<typeof import('@/lib/consent/constants')>();
  return {
    ...actual,
    get ATTR_COOKIE_BEFORE_CONSENT() {
      return flags.beforeConsent;
    },
  };
});

import { proxy } from './proxy';
import { updateSession } from '@/lib/supabase/proxy';
import { recordVisit } from '@/lib/leads/visits';

const root = process.cwd();
const source = readFileSync(join(root, 'src/proxy.ts'), 'utf8').replace(/\r\n/g, '\n');

function readMatcherBlock(): string {
  const m = source.match(/matcher:\s*\[([\s\S]*?)\n  \],\n\};/);
  expect(m).not.toBeNull();
  return m![1];
}

function privateEntries(): string[] {
  return [...readMatcherBlock().matchAll(/^\s{4}'([^']+)',?$/gm)].map((x) => x[1]);
}

const UUID = '3f2b8c1e-5a4d-4e6f-8a9b-1c2d3e4f5a6b';
const HEADERS = { 'sec-fetch-dest': 'document', 'sec-fetch-mode': 'navigate' };

function consentCookie(at: number, choice: 'a' | 'r' = 'a') {
  return `sv_consent=${CONSENT_VERSION}~${choice}~${UUID}~${at}`;
}

function req(path: string, headers: Record<string, string> = {}, host = 'sevalys.com') {
  return new NextRequest(`https://${host}${path}`, { headers: { ...HEADERS, ...headers } });
}

const event = { waitUntil: vi.fn() } as unknown as NextFetchEvent;

function ftOf(res: Response, name = 'sv_attr_ft') {
  const c = (res as NextResponse).cookies.get(name);
  return c;
}

function setCookies(res: Response): string[] {
  return (res as NextResponse).cookies.getAll().map((c) => c.name);
}

const encoded = encodeTouch;

beforeEach(() => {
  vi.clearAllMocks();
  flags.beforeConsent = true;
});

describe('src/proxy.ts static contract', () => {
  it('keeps the seven private entries verbatim', () => {
    expect(privateEntries()).toEqual([
      '/espace-client/:path*',
      '/espace-client',
      '/admin/:path*',
      '/admin',
      '/connexion',
      '/desinscription',
      '/auth/:path*',
    ]);
  });

  it('leaves /api/resend/webhook and /api/unsubscribe outside every matcher entry', () => {
    const literal = privateEntries();
    const sourceMatch = readMatcherBlock().match(/source:\s*'([^']+)'/);
    expect(sourceMatch).not.toBeNull();
    // Le littéral du source utilise des antislashs doublés dans le fichier.
    const catchAll = new RegExp(`^${sourceMatch![1].replace(/\\\\/g, '\\')}$`);
    for (const path of ['/api/resend/webhook', '/api/unsubscribe']) {
      expect(catchAll.test(path)).toBe(false);
      for (const entry of literal) {
        const prefix = entry.replace('/:path*', '');
        expect(path === prefix || path.startsWith(`${prefix}/`)).toBe(false);
      }
    }
  });

  it('covers every PRIVATE_PREFIXES entry', () => {
    const matcher = privateEntries();
    for (const prefix of PRIVATE_PREFIXES) {
      expect(matcher.some((p) => p === prefix || p === `${prefix}/:path*`)).toBe(true);
    }
  });

  it('has one public object entry excluding api/assets and prefetches, no bare catch-all', () => {
    const block = readMatcherBlock();
    expect(block).toMatch(/api\|_next\|_vercel\|\\\\\.well-known\|\.\*\\\\\..\*/);
    expect(block).toContain('next-router-prefetch');
    expect(block).toContain("'purpose'");
    expect(block).toContain("'prefetch'");
    expect(privateEntries()).not.toContain('/:path*');
    expect((block.match(/source:/g) ?? []).length).toBe(1);
  });

  it('exports proxy, not middleware, and no middleware file exists', () => {
    expect(source).toMatch(/export async function proxy\(/);
    expect(source).not.toMatch(/export (async )?function middleware/);
    expect(existsSync(join(root, 'middleware.ts'))).toBe(false);
    expect(existsSync(join(root, 'src/middleware.ts'))).toBe(false);
  });
});

describe('proxy private branch', () => {
  it('redirects anonymous /admin to /connexion and calls updateSession', async () => {
    const res = await proxy(req('/admin'), event);
    expect(updateSession).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/connexion?next=%2Fadmin');
  });

  it('does not redirect anonymous /desinscription to /connexion', async () => {
    const res = await proxy(req('/desinscription?t=x'), event);
    expect(updateSession).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('never calls updateSession on a public page', async () => {
    await proxy(req('/?utm_source=Google'), event);
    expect(updateSession).not.toHaveBeenCalled();
  });
});

describe('proxy public attribution branch', () => {
  it('sets first and last touch cookies and records the visit', async () => {
    const res = await proxy(req('/?utm_source=Google'), event);
    for (const name of ['sv_attr_ft', 'sv_attr_lt']) {
      const c = ftOf(res, name)!;
      expect(c).toBeDefined();
      expect(c.maxAge).toBe(2592000);
      expect(c.httpOnly).toBe(true);
      expect(c.path).toBe('/');
      expect(c.sameSite).toBe('lax');
    }
    expect(recordVisit).toHaveBeenCalledTimes(1);
    expect(vi.mocked(recordVisit).mock.calls[0][0].source).toBe('google');
    expect(event.waitUntil).toHaveBeenCalledTimes(1);
  });

  it('keeps an existing first touch and refreshes last touch', async () => {
    const ft = encoded({ params: { utm_source: 'g' }, landing: '/', referrer: null, at: 1000 });
    const res = await proxy(req('/?utm_source=bing', { cookie: `sv_attr_ft=${ft}` }), event);
    expect(setCookies(res)).not.toContain('sv_attr_ft');
    expect(setCookies(res)).toContain('sv_attr_lt');
  });

  it('drops click ids without consent and keeps them with accepted consent', async () => {
    const res1 = await proxy(req('/?gclid=abc&utm_source=g'), event);
    const t1 = decodeTouch(ftOf(res1)!.value, { allowClickIds: true })!;
    expect(t1.params.gclid).toBeUndefined();

    const res2 = await proxy(
      req('/?gclid=abc&utm_source=g', { cookie: consentCookie(Date.now() - 3 * 3600_000) }),
      event,
    );
    const t2 = decodeTouch(ftOf(res2)!.value, { allowClickIds: true })!;
    expect(t2.params.gclid).toBe('abc');
  });

  it('ignores direct and internal navigations', async () => {
    const res = await proxy(req('/services', { referer: 'https://sevalys.com/' }), event);
    expect(setCookies(res)).toEqual([]);
    expect(recordVisit).not.toHaveBeenCalled();
  });

  it.each([
    ['non-document fetch', '/?utm_source=g', { 'sec-fetch-dest': 'empty' }, 'sevalys.com'],
    ['bot', '/?utm_source=g', { 'user-agent': 'Googlebot/2.1' }, 'sevalys.com'],
    ['vercel preview', '/?utm_source=g', {}, 'x.vercel.app'],
    ['auth cookie', '/?utm_source=g', { cookie: 'sb-abc-auth-token=xyz' }, 'sevalys.com'],
  ])('skips %s', async (_n, path, headers, host) => {
    const res = await proxy(req(path, headers, host), event);
    expect(setCookies(res)).toEqual([]);
    expect(recordVisit).not.toHaveBeenCalled();
  });

  it('strict switch: no sv_attr_* cookie without consent but the visit is counted', async () => {
    flags.beforeConsent = false;
    const res = await proxy(req('/?utm_source=g'), event);
    expect(setCookies(res)).toEqual([]);
    expect(recordVisit).toHaveBeenCalledTimes(1);
  });
});

describe('proxy first-touch click id enrichment', () => {
  const ft = () =>
    encoded({ params: { utm_source: 'g' }, landing: '/', referrer: null, at: 1234 });

  it('enriches the first touch right after Accept, keeping the original at', async () => {
    const res = await proxy(
      req('/?utm_source=g&gclid=AbC', {
        cookie: `sv_attr_ft=${ft()}; ${consentCookie(Date.now() - 30_000)}`,
      }),
      event,
    );
    const t = decodeTouch(ftOf(res)!.value, { allowClickIds: true })!;
    expect(t.params.gclid).toBe('AbC');
    expect(t.at).toBe(1234);
  });

  it.each([
    ['consent too old', '/?utm_source=g&gclid=AbC', ft, 2 * 3600_000],
    ['different params', '/?utm_source=other&gclid=AbC', ft, 30_000],
    ['different landing', '/services?utm_source=g&gclid=AbC', ft, 30_000],
    [
      'ft already has a click id',
      '/?utm_source=g&gclid=AbC',
      () =>
        encoded({ params: { utm_source: 'g', gclid: 'old' }, landing: '/', referrer: null, at: 1 }),
      30_000,
    ],
  ])('does not enrich: %s', async (_n, path, mkFt, age) => {
    const res = await proxy(
      req(path, { cookie: `sv_attr_ft=${mkFt()}; ${consentCookie(Date.now() - age)}` }),
      event,
    );
    expect(setCookies(res)).not.toContain('sv_attr_ft');
    expect(setCookies(res)).toContain('sv_attr_lt');
  });
});
