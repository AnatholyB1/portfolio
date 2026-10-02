import { beforeEach, describe, expect, it, vi } from 'vitest';

const ingestMock = vi.fn();
vi.mock('@/lib/leads/ingest', () => ({
  ingestLead: (...args: unknown[]) => ingestMock(...args),
}));

vi.mock('@/lib/leads/ipHash', () => ({
  getClientIp: (h: Headers) => h.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
  hashIp: (ip: string | null) => (ip ? `hash(${ip})` : null),
}));

const hitThrottleMock = vi.fn();
vi.mock('@/lib/throttle', async () => {
  const actual = await vi.importActual<typeof import('@/lib/throttle')>('@/lib/throttle');
  return {
    hashKey: actual.hashKey,
    hitThrottle: (...args: unknown[]) => hitThrottleMock(...args),
  };
});

const sendMock = vi.fn<
  (payload: { to: string; subject: string; html: string }) => Promise<{
    data: { id: string } | null;
    error: { message: string } | null;
  }>
>();
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

const { POST } = await import('./route');
const { hashKey } = await import('@/lib/throttle');

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Jean Dupont',
    email: 'jean.dupont@example.com',
    projectType: 'Site vitrine',
    message: 'Bonjour,\nun projet.',
    website: '',
    formRenderedAt: Date.now() - 10_000,
    ...overrides,
  };
}

function postRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/contact', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  hitThrottleMock.mockResolvedValue(true);
  ingestMock.mockResolvedValue({ ok: true, leadId: 'lead-1', isReturn: false });
  sendMock.mockResolvedValue({ data: { id: 'x' }, error: null });
});

describe('POST /api/contact - guards', () => {
  it('invalid JSON returns 400', async () => {
    const res = await POST(postRequest('nope'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_payload' });
    expect(ingestMock).not.toHaveBeenCalled();
  });

  it('honeypot filled returns silent ok with no throttle, ingest or send', async () => {
    const res = await POST(postRequest(validPayload({ website: 'http://spam.tld' })));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(hitThrottleMock).not.toHaveBeenCalled();
    expect(ingestMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('too-fast submission returns silent ok with no throttle, ingest or send', async () => {
    const res = await POST(postRequest(validPayload({ formRenderedAt: Date.now() - 500 })));
    expect(await res.json()).toEqual({ ok: true });
    expect(hitThrottleMock).not.toHaveBeenCalled();
    expect(ingestMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('throttled request returns 429 rate_limited without ingest or send', async () => {
    hitThrottleMock.mockResolvedValueOnce(false);
    const res = await POST(postRequest(validPayload()));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'rate_limited' });
    expect(ingestMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('throttle key is hashKey(contact-ip, ip) with 600 s / 5', async () => {
    await POST(postRequest(validPayload(), { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }));
    expect(hitThrottleMock).toHaveBeenCalledWith(hashKey('contact-ip', '203.0.113.7'), 600, 5);
  });

  it('unknown IP uses the "unknown" bucket', async () => {
    await POST(postRequest(validPayload()));
    expect(hitThrottleMock).toHaveBeenCalledWith(hashKey('contact-ip', 'unknown'), 600, 5);
  });

  it('schema failures return 400 without ingest', async () => {
    for (const bad of [
      validPayload({ message: 'x'.repeat(5001) }),
      validPayload({ email: 'no-at-sign' }),
      validPayload({ name: '   ' }),
    ]) {
      const res = await POST(postRequest(bad));
      expect(res.status).toBe(400);
    }
    expect(ingestMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/contact - pipeline', () => {
  it('valid submission ingests then sends both e-mails', async () => {
    const res = await POST(postRequest(validPayload()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    expect(ingestMock).toHaveBeenCalledTimes(1);
    expect(ingestMock.mock.calls[0][0]).toMatchObject({
      channel: 'contact',
      nom: 'Jean Dupont',
      email: 'jean.dupont@example.com',
      telephone: null,
      payload: { projectType: 'Site vitrine', message: 'Bonjour,\nun projet.' },
      consentRgpd: null,
    });
    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(ingestMock.mock.invocationCallOrder[0]).toBeLessThan(sendMock.mock.invocationCallOrder[0]);
  });

  it('ingest failure is best-effort: e-mails still sent and 200', async () => {
    ingestMock.mockResolvedValueOnce({ ok: false });
    const res = await POST(postRequest(validPayload()));
    expect(res.status).toBe(200);
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it('returning lead agency subject starts with Lead revenu', async () => {
    ingestMock.mockResolvedValueOnce({ ok: true, leadId: 'lead-1', isReturn: true });
    await POST(postRequest(validPayload()));
    const subjects = sendMock.mock.calls.map((c) => c[0].subject);
    expect(subjects.some((s) => s.startsWith('Lead revenu'))).toBe(true);
  });

  it('new lead agency subject is unchanged', async () => {
    await POST(postRequest(validPayload()));
    const subjects = sendMock.mock.calls.map((c) => c[0].subject);
    expect(subjects).toContain('Nouveau contact — Site vitrine');
  });

  it('ignores attribution sent in the body', async () => {
    await POST(postRequest(validPayload({ utm_source: 'evil', gclid: 'abc' })));
    const input = ingestMock.mock.calls[0][0] as { attribution: { firstTouch: unknown } };
    expect(input.attribution.firstTouch).toBeNull();
    expect(JSON.stringify(input)).not.toContain('evil');
  });

  it('escapes HTML in the agency e-mail', async () => {
    await POST(postRequest(validPayload({ name: '<script>x</script>' })));
    for (const c of sendMock.mock.calls) {
      expect(c[0].html).not.toContain('<script>');
    }
  });

  it('send failure returns 502', async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const res = await POST(postRequest(validPayload()));
    expect(res.status).toBe(502);
  });
});

describe('client sources carry no attribution (D-06)', () => {
  it('ContactSection and submit.ts contain no utm_ or gclid', async () => {
    const { readFileSync } = await import('node:fs');
    for (const f of ['src/components/sections/ContactSection.tsx', 'src/lib/simulateur/submit.ts']) {
      const src = readFileSync(f, 'utf8');
      expect(src).not.toContain('utm_');
      expect(src).not.toContain('gclid');
    }
  });
});
