import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ callRpc: vi.fn(), send: vi.fn(), throttle: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/server/rpc', () => ({ callRpc: (...a: unknown[]) => h.callRpc(...a) }));
vi.mock('@/lib/server/mail/outbox', () => ({ sendOutboxRow: (...a: unknown[]) => h.send(...a) }));
vi.mock('@/lib/throttle', () => ({
  hashKey: (k: string, v: string) => `${k}:${v}`,
  hitThrottle: (...a: unknown[]) => h.throttle(...a),
}));

import { hashReviewToken } from '@/lib/reviews/token';
import { POST } from './route';

const TOKEN = 'abcDEF123_-xyz';
const valid = {
  token: TOKEN,
  rating: 5,
  title: 'Très bien',
  body: 'Un travail sérieux et soigné du début à la fin.',
  displayMode: 'first_company',
  firstName: 'Anne',
  consent: true,
};

function req(body: unknown, ct = 'application/json'): Request {
  return new Request('https://site.test/api/avis', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': ct, 'x-forwarded-for': '1.2.3.4' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  h.throttle.mockResolvedValue(true);
  h.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'published', review_id: 'r', outbox_ids: ['o1', 'o2'] } });
  h.send.mockResolvedValue('sent');
});

describe('POST /api/avis', () => {
  it('valid body -> rpc with hashed token, 200, mails sent', async () => {
    const r = await POST(req(valid));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
    expect(h.callRpc).toHaveBeenCalledWith('reviews/submit', 'sv_submit_review', {
      p_token_hash: hashReviewToken(TOKEN),
      p_rating: 5,
      p_title: 'Très bien',
      p_body: valid.body,
      p_display_mode: 'first_company',
      p_first_name: 'Anne',
      p_last_initial: null,
      p_consent: true,
      p_admin_email: 'contact@sevalys.com',
    });
    expect(h.send).toHaveBeenCalledTimes(2);
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('referrer-policy')).toBe('no-referrer');
  });

  it('absent title -> p_title null', async () => {
    const { title: _t, ...rest } = valid;
    await POST(req(rest));
    expect(h.callRpc.mock.calls[0][2].p_title).toBeNull();
  });

  it('mail failure still 200', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    h.send.mockRejectedValue(new Error('x'));
    expect((await POST(req(valid))).status).toBe(200);
  });

  it('link_invalid outcome -> 410', async () => {
    h.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'link_invalid' } });
    const r = await POST(req(valid));
    expect(r.status).toBe(410);
    expect(await r.json()).toEqual({ error: 'link_invalid' });
  });

  it('malformed token -> 410 without rpc', async () => {
    const r = await POST(req({ ...valid, token: 'bad token!' }));
    expect(r.status).toBe(410);
    expect(h.callRpc).not.toHaveBeenCalled();
  });

  it('consent false -> 400 consent, no rpc', async () => {
    const r = await POST(req({ ...valid, consent: false }));
    expect(r.status).toBe(400);
    const j = await r.json();
    expect(j.error).toBe('invalid_payload');
    expect(j.fields).toContain('consent');
    expect(h.callRpc).not.toHaveBeenCalled();
  });

  it('link in body -> 400 markup_or_link', async () => {
    const r = await POST(req({ ...valid, body: 'Visitez https://spam.example pour plus.' }));
    expect(r.status).toBe(400);
    expect((await r.json()).fields).toContain('markup_or_link');
  });

  it('ratings 1 and 5 with opposite tones are handled identically', async () => {
    await POST(req({ ...valid, rating: 1, body: 'Expérience décevante, résultat très en dessous.' }));
    await POST(req({ ...valid, rating: 5, body: 'Expérience formidable, résultat au-dessus de tout.' }));
    expect(h.callRpc).toHaveBeenCalledTimes(2);
    const a = h.callRpc.mock.calls[0][2];
    const b = h.callRpc.mock.calls[1][2];
    expect(a.p_rating).toBe(1);
    expect(b.p_rating).toBe(5);
    expect(Object.keys(a)).toEqual(Object.keys(b));
  });

  it('throttle denied -> 429 before parsing', async () => {
    h.throttle.mockResolvedValue(false);
    const r = await POST(req('not json'));
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ error: 'rate_limited' });
    expect(h.callRpc).not.toHaveBeenCalled();
  });

  it('non-JSON content-type -> 415', async () => {
    expect((await POST(req('x=1', 'text/plain'))).status).toBe(415);
  });

  it('invalid JSON -> 400', async () => {
    expect((await POST(req('{nope'))).status).toBe(400);
  });

  it('rpc not ok -> 500 retry', async () => {
    h.callRpc.mockResolvedValue({ ok: false, code: 'unknown' });
    const r = await POST(req(valid));
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ error: 'retry' });
  });
});
