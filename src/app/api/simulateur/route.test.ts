import { beforeEach, describe, expect, it, vi } from 'vitest';

const ingestMock = vi.fn();
vi.mock('@/lib/leads/ingest', () => ({
  ingestLead: (...args: unknown[]) => ingestMock(...args),
}));

vi.mock('@/lib/leads/ipHash', () => ({
  getClientIp: (h: Headers) => h.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
  hashIp: (ip: string | null) => (ip ? `hash(${ip})` : null),
}));

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

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    nom: 'Jean Dupont',
    email: 'jean.dupont@example.com',
    telephone: '0612345678',
    reponsesDiagnostic: [{ questionId: 'q1', value: 'oui' }],
    servicesRecommandes: ['Landing Page', 'Branding'],
    consentementRgpd: true,
    formRenderedAt: Date.now() - 10_000,
    ...overrides,
  };
}

function postRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/simulateur', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers,
  });
}

function lastSendCall() {
  const calls = sendMock.mock.calls;
  return calls[calls.length - 1][0];
}

function lastIngestInput(): Record<string, unknown> {
  const calls = ingestMock.mock.calls;
  return calls[calls.length - 1][0] as Record<string, unknown>;
}

beforeEach(() => {
  vi.clearAllMocks();
  ingestMock.mockResolvedValue({ ok: true, leadId: 'lead-1', isReturn: false });
  sendMock.mockResolvedValue({ data: { id: 'test' }, error: null });
});

describe('POST /api/simulateur - spam guard', () => {
  it('honeypot-filled payload returns success shape without ingest or send (spam)', async () => {
    const response = await POST(postRequest(validPayload({ website: 'http://spam.tld' })));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(ingestMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('too-fast payload returns success shape without ingest or send (spam)', async () => {
    const response = await POST(postRequest(validPayload({ formRenderedAt: Date.now() })));
    expect(await response.json()).toEqual({ ok: true });
    expect(ingestMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('spam response is byte-identical to the valid-submission response (spam)', async () => {
    const spam = await POST(postRequest(validPayload({ website: 'http://spam.tld' })));
    const spamText = await spam.text();
    const valid = await POST(postRequest(validPayload()));
    const validText = await valid.text();
    expect(spamText).toBe(validText);
  });
});

describe('POST /api/simulateur - ingest and notification', () => {
  it('calls ingestLead once with channel simulateur and cookie attribution', async () => {
    await POST(
      postRequest(validPayload(), {
        'x-forwarded-for': '203.0.113.7, 10.0.0.1',
        cookie: 'foo=bar',
      })
    );

    expect(ingestMock).toHaveBeenCalledTimes(1);
    const input = lastIngestInput();
    expect(input).toMatchObject({
      channel: 'simulateur',
      nom: 'Jean Dupont',
      email: 'jean.dupont@example.com',
      telephone: '0612345678',
      payload: {
        reponsesDiagnostic: [{ questionId: 'q1', value: 'oui' }],
        servicesRecommandes: ['Landing Page', 'Branding'],
      },
      consentRgpd: true,
      ipHash: 'hash(203.0.113.7)',
    });
    expect(input.attribution).toBeDefined();
  });

  it('ipHash is null without x-forwarded-for', async () => {
    await POST(postRequest(validPayload()));
    expect(lastIngestInput().ipHash).toBeNull();
  });

  it('sends exactly one notification to contact@sevalys.com after ingest', async () => {
    await POST(postRequest(validPayload()));
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'contact@sevalys.com' }));
    expect(ingestMock.mock.invocationCallOrder[0]).toBeLessThan(sendMock.mock.invocationCallOrder[0]);
  });

  it('escapes a <script> payload in nom', async () => {
    await POST(postRequest(validPayload({ nom: '<script>alert(1)</script>' })));
    const call = lastSendCall();
    expect(call.html).toContain('&lt;script&gt;');
    expect(call.html).not.toContain('<script>');
  });

  it('ingest failure returns 500 insert_failed without notification', async () => {
    ingestMock.mockResolvedValueOnce({ ok: false });
    const response = await POST(postRequest(validPayload()));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'insert_failed' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('returning lead gets a "Lead revenu" subject, new lead the standard one', async () => {
    ingestMock.mockResolvedValueOnce({ ok: true, leadId: 'lead-1', isReturn: true });
    await POST(postRequest(validPayload()));
    expect(lastSendCall().subject).toContain('Lead revenu');

    await POST(postRequest(validPayload()));
    expect(lastSendCall().subject).toBe('Nouveau prospect - simulateur');
  });

  it('ignores attribution fields sent in the body (cookies only)', async () => {
    await POST(
      postRequest(validPayload({ utm_source: 'evil', gclid: 'abc', source: 'paid' }))
    );
    const input = lastIngestInput();
    const attribution = input.attribution as { firstTouch: unknown; lastTouch: unknown };
    expect(attribution.firstTouch).toBeNull();
    expect(attribution.lastTouch).toBeNull();
    expect(JSON.stringify(input)).not.toContain('evil');
    expect(JSON.stringify(input)).not.toContain('abc');
  });

  it('Resend failure returns 500 notification_failed', async () => {
    sendMock.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    const response = await POST(postRequest(validPayload()));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'notification_failed' });
  });
});

describe('POST /api/simulateur - validation', () => {
  it('rejects a payload missing telephone with 400 and no ingest', async () => {
    const payload = validPayload();
    delete (payload as Record<string, unknown>).telephone;
    const response = await POST(postRequest(payload));
    expect(response.status).toBe(400);
    expect(ingestMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rejects consentementRgpd: false with 400 and no ingest', async () => {
    const response = await POST(postRequest(validPayload({ consentementRgpd: false })));
    expect(response.status).toBe(400);
    expect(ingestMock).not.toHaveBeenCalled();
  });

  it('returns 400 on a non-JSON body without ingest or send', async () => {
    const response = await POST(postRequest('not json'));
    expect(response.status).toBe(400);
    expect(ingestMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });
});
