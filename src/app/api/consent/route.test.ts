import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeTouch } from '@/lib/attribution/cookie';
import { CONSENT_VERSION } from '@/lib/consent/constants';

const logMock = vi.fn();
vi.mock('@/lib/consent/serverLog', () => ({
  logConsent: (...args: unknown[]) => logMock(...args),
}));

vi.mock('@/lib/leads/ipHash', () => ({
  getClientIp: (h: Headers) => h.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
  hashIp: (ip: string | null) => (ip ? `hash(${ip})` : null),
}));

const hitThrottleMock = vi.fn();
vi.mock('@/lib/throttle', async () => {
  const actual = await vi.importActual<typeof import('@/lib/throttle')>('@/lib/throttle');
  return { hashKey: actual.hashKey, hitThrottle: (...a: unknown[]) => hitThrottleMock(...a) };
});

const flags = vi.hoisted(() => ({ before: true }));
vi.mock('@/lib/consent/constants', async () => {
  const actual = await vi.importActual<typeof import('@/lib/consent/constants')>(
    '@/lib/consent/constants',
  );
  return {
    ...actual,
    get ATTR_COOKIE_BEFORE_CONSENT() {
      return flags.before;
    },
  };
});

const { POST } = await import('./route');

const UUID = '0b8f3c1e-5a4d-4e7a-9c2b-1d3e5f7a9b0c';

function req(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/consent', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}
const ok = { choice: 'accepted', version: CONSENT_VERSION, locale: 'fr' };

beforeEach(() => {
  logMock.mockReset().mockResolvedValue({ ok: true });
  hitThrottleMock.mockReset().mockResolvedValue(true);
  flags.before = true;
});

describe('POST /api/consent', () => {
  it('rejects invalid JSON and schema without cookie or log', async () => {
    for (const b of ['not json', { ...ok, choice: 'maybe' }, { ...ok, locale: 'de' }]) {
      const res = await POST(req(b));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'invalid_payload' });
      expect(res.headers.get('set-cookie')).toBeNull();
    }
    expect(logMock).not.toHaveBeenCalled();
  });

  it('rejects an unknown version', async () => {
    const res = await POST(req({ ...ok, version: 'old' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'unknown_version' });
    expect(logMock).not.toHaveBeenCalled();
  });

  it('rejects a cross-origin request', async () => {
    const res = await POST(req(ok, { origin: 'https://evil.example', host: 'localhost' }));
    expect(res.status).toBe(403);
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(logMock).not.toHaveBeenCalled();
  });

  it('accepts same-origin and returns 429 when throttled', async () => {
    const same = await POST(req(ok, { origin: 'http://localhost', host: 'localhost' }));
    expect(same.status).toBe(200);
    hitThrottleMock.mockResolvedValue(false);
    const res = await POST(req(ok));
    expect(res.status).toBe(429);
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(logMock).toHaveBeenCalledTimes(1);
  });

  it('logs with a new uuid and hashed ip, sets a readable 13 month cookie', async () => {
    const res = await POST(req(ok));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const arg = logMock.mock.calls[0][0];
    expect(arg.anonId).toMatch(/^[0-9a-f-]{36}$/);
    expect(arg.ipHash).toBe('hash(203.0.113.9)');
    expect(Object.keys(arg).sort()).toEqual(['anonId', 'choice', 'ipHash', 'locale', 'version']);
    const sc = res.headers.get('set-cookie') ?? '';
    expect(sc).toContain('sv_consent=');
    expect(sc).not.toContain('HttpOnly');
    expect(sc).toContain('Max-Age=34128000');
    expect(sc).toContain('Path=/');
    expect(sc.toLowerCase()).toContain('samesite=lax');
  });

  it('reuses the anon id from an existing consent cookie', async () => {
    const cookie = `sv_consent=${CONSENT_VERSION}~r~${UUID}~1`;
    await POST(req(ok, { cookie }));
    expect(logMock.mock.calls[0][0].anonId).toBe(UUID);
  });

  it('returns 500 without cookie when logging fails', async () => {
    logMock.mockResolvedValue({ ok: false });
    const res = await POST(req(ok));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'log_failed' });
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  const gclidTouch = () =>
    encodeTouch({ params: { utm_source: 'google', gclid: 'abc' }, landing: '/', referrer: null, at: 1 });

  it('strips click ids from attribution cookies on refusal', async () => {
    const v = gclidTouch();
    const res = await POST(
      req({ ...ok, choice: 'refused' }, { cookie: `sv_attr_ft=${v}; sv_attr_lt=${v}` }),
    );
    const all = res.headers.getSetCookie();
    const ft = all.find((c) => c.startsWith('sv_attr_ft='));
    const lt = all.find((c) => c.startsWith('sv_attr_lt='));
    expect(ft && lt).toBeTruthy();
    expect(ft).not.toContain(v);
    expect(ft).toContain('HttpOnly');
    expect(ft).toContain('Max-Age=2592000');
  });

  it('deletes attribution cookies on refusal when not allowed before consent', async () => {
    flags.before = false;
    const v = gclidTouch();
    const res = await POST(
      req({ ...ok, choice: 'refused' }, { cookie: `sv_attr_ft=${v}; sv_attr_lt=${v}` }),
    );
    const all = res.headers.getSetCookie();
    expect(all.filter((c) => c.startsWith('sv_attr_') && c.includes('Max-Age=0'))).toHaveLength(2);
  });

  it('does not touch attribution cookies on accept', async () => {
    const v = gclidTouch();
    const res = await POST(req(ok, { cookie: `sv_attr_ft=${v}` }));
    expect(res.headers.getSetCookie().some((c) => c.startsWith('sv_attr_'))).toBe(false);
  });
});
