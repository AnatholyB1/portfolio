import { beforeEach, describe, expect, it, vi } from 'vitest';

const insertMock = vi.fn<
  (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
>();
const fromMock = vi.fn(() => ({ insert: insertMock }));
const createServiceRoleClientMock = vi.fn(() => ({ from: fromMock }));

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: () => createServiceRoleClientMock(),
}));

const sendMock = vi.fn<
  (payload: { to: string; html: string }) => Promise<{ data: { id: string } | null; error: { message: string } | null }>
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

function lastInsertedRow(): Record<string, unknown> {
  const calls = insertMock.mock.calls;
  return calls[calls.length - 1][0];
}

function lastSendCall(): { to: string; html: string } {
  const calls = sendMock.mock.calls;
  return calls[calls.length - 1][0] as { to: string; html: string };
}

beforeEach(() => {
  vi.clearAllMocks();
  insertMock.mockResolvedValue({ error: null });
  sendMock.mockResolvedValue({ data: { id: 'test' }, error: null });
});

describe('POST /api/simulateur — spam guard', () => {
  it('honeypot-filled payload returns success shape without insert or send (spam)', async () => {
    const response = await POST(postRequest(validPayload({ website: 'http://spam.tld' })));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(insertMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('too-fast payload (formRenderedAt = now) returns success shape without insert or send (spam)', async () => {
    const response = await POST(postRequest(validPayload({ formRenderedAt: Date.now() })));
    const body = await response.json();

    expect(body).toEqual({ ok: true });
    expect(insertMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('spam response is byte-identical to the valid-submission response (spam)', async () => {
    const spamResponse = await POST(postRequest(validPayload({ website: 'http://spam.tld' })));
    const spamBody = await spamResponse.json();

    const validResponse = await POST(postRequest(validPayload()));
    const validBody = await validResponse.json();

    expect(spamBody).toEqual(validBody);
  });
});

describe('POST /api/simulateur — notification', () => {
  it('valid payload sends exactly one notification to contact@sevalys.com (notification)', async () => {
    await POST(postRequest(validPayload()));

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'contact@sevalys.com' })
    );
  });

  it('escapes a <script> payload in nom before sending the notification (notification)', async () => {
    await POST(postRequest(validPayload({ nom: '<script>alert(1)</script>' })));

    const call = lastSendCall();
    expect(call.html).toContain('&lt;script&gt;');
    expect(call.html).not.toContain('<script>');
  });

  it('does not send a notification when the insert fails (notification)', async () => {
    insertMock.mockResolvedValueOnce({ error: { message: 'boom' } });

    const response = await POST(postRequest(validPayload()));
    const body = await response.json();

    expect(sendMock).not.toHaveBeenCalled();
    expect(response.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('boom');
  });
});

describe('POST /api/simulateur — insert shape', () => {
  it('inserts an object with exactly the expected snake_case keys', async () => {
    await POST(postRequest(validPayload()));

    expect(insertMock).toHaveBeenCalledTimes(1);
    const insertedRow = lastInsertedRow();
    expect(Object.keys(insertedRow).sort()).toEqual(
      [
        'nom',
        'email',
        'telephone',
        'reponses_diagnostic',
        'services_recommandes',
        'consentement_rgpd',
        'ip_hash',
      ].sort()
    );
  });

  it('hashes a provided x-forwarded-for header into a 64-char hex ip_hash', async () => {
    await POST(
      postRequest(validPayload(), { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' })
    );

    const insertedRow = lastInsertedRow();
    expect(insertedRow.ip_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(insertedRow.ip_hash).not.toBe('203.0.113.7');
  });

  it('sets ip_hash to null when no x-forwarded-for header is present', async () => {
    await POST(postRequest(validPayload()));

    const insertedRow = lastInsertedRow();
    expect(insertedRow.ip_hash).toBeNull();
  });
});

describe('POST /api/simulateur — happy path', () => {
  it('valid payload returns 200 with { ok: true } after insert and notification succeed', async () => {
    const response = await POST(postRequest(validPayload()));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/simulateur — validation', () => {
  it('rejects a payload missing telephone with 400 and no insert (D-01)', async () => {
    const payload = validPayload();
    delete (payload as Record<string, unknown>).telephone;

    const response = await POST(postRequest(payload));

    expect(response.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('rejects consentementRgpd: false with 400 and no insert', async () => {
    const response = await POST(postRequest(validPayload({ consentementRgpd: false })));

    expect(response.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('returns 400 without throwing on a malformed (non-JSON) body', async () => {
    await expect(POST(postRequest('not json'))).resolves.toBeDefined();
    const response = await POST(postRequest('not json'));
    expect(response.status).toBe(400);
  });
});
