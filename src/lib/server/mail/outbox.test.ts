/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  upsert: { data: [{ id: 'row1' }], error: null } as any,
  existing: { data: { id: 'row0' }, error: null } as any,
  attempts: { data: { attempts: 0 }, error: null } as any,
  claim: { data: null as any, error: null as any },
  sendResult: { data: { id: 'prov1' }, error: null } as any,
  sendThrows: false,
  rpc: { ok: true, data: [] } as any,
  scope: 'none' as any,
  scopeCalls: 0,
}));

const SECRET = 'test-secret-test-secret-test-secret-0123';

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  resendCtor: vi.fn(),
  updates: [] as any[],
  claimCalls: 0,
}));

function builder() {
  let op = 'select';
  let isClaim = false;
  const b: any = {};
  let byKey = false;
  b.eq = (col: string) => {
    if (col === 'dedupe_key') byKey = true;
    return b;
  };
  for (const m of ['in', 'lte']) b[m] = () => b;
  b.upsert = () => {
    op = 'upsert';
    return b;
  };
  b.update = (patch: any) => {
    op = 'update';
    mocks.updates.push(patch);
    isClaim = patch.status === 'sending';
    return b;
  };
  b.select = () => b;
  b.maybeSingle = async () => {
    if (op === 'update' && isClaim) return state.claim;
    if (op !== 'select') return { data: null, error: null };
    return byKey ? state.existing : state.attempts;
  };
  b.then = (res: any, rej: any) => {
    const out = op === 'upsert' ? state.upsert : { data: null, error: null };
    return Promise.resolve(out).then(res, rej);
  };
  return b;
}

vi.mock('@/lib/supabase/env', () => ({ getSiteUrl: () => 'https://sevalys.com' }));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({ from: () => builder() }),
}));
vi.mock('./suppression', async (orig) => {
  const actual = await orig<typeof import('./suppression')>();
  return {
    ...actual,
    blockScope: async () => {
      state.scopeCalls += 1;
      return state.scope;
    },
  };
});
vi.mock('@/lib/server/rpc', () => ({ callRpc: async () => state.rpc }));
vi.mock('resend', () => ({
  Resend: class {
    constructor(key: unknown) {
      mocks.resendCtor(key);
    }
    emails = {
      send: async (...args: any[]) => {
        mocks.send(...args);
        if (state.sendThrows) throw new Error('boom user@example.com');
        return state.sendResult;
      },
    };
  },
}));

import { INVITE_SUBJECT } from './inviteEmail';
import { MAIL_EVENTS, MAIL_RULES } from './rules';
import { verifyUnsubscribeToken } from './unsubscribeToken';
import { deriveReviewToken } from '@/lib/reviews/token';
import { buildMail, enqueueAndSend, enqueueMail, processDueMail, sendOutboxRow } from './outbox';

const input = {
  event: 'step_changed' as const,
  recipientEmail: 'User@Example.com',
  dedupeKey: 'step_changed:f1:user@example.com',
  payload: { stepName: 'Production', expectedAction: 'Valider' },
  clientId: 'c1',
  projectId: 'p1',
};

const claimedRow = {
  id: 'row1',
  event_type: 'step_changed',
  template: 'step_changed',
  recipient_email: 'user@example.com',
  recipient_kind: 'client',
  dedupe_key: 'step_changed:f1:user@example.com',
  payload: { stepName: 'Production', expectedAction: 'Valider' },
  client_id: 'c1',
  project_id: 'p1',
  send_after: new Date().toISOString(),
  status: 'sending',
  attempts: 1,
};

let errSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  mocks.send.mockReset();
  mocks.resendCtor.mockReset();
  mocks.updates.length = 0;
  state.upsert = { data: [{ id: 'row1' }], error: null };
  state.existing = { data: { id: 'row0' }, error: null };
  state.attempts = { data: { attempts: 0 }, error: null };
  state.claim = { data: claimedRow, error: null };
  state.sendResult = { data: { id: 'prov1' }, error: null };
  state.sendThrows = false;
  state.rpc = { ok: true, data: [] };
  state.scope = 'none';
  state.scopeCalls = 0;
  vi.stubEnv('UNSUBSCRIBE_SECRET', SECRET);
  vi.stubEnv('REVIEW_REQUESTS_ENABLED', 'true');
  vi.stubEnv('REVIEW_TOKEN_SECRET', REVIEW_SECRET);
  process.env.RESEND_API_KEY = 're_test';
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  errSpy.mockRestore();
});

function noEmailInLogs() {
  for (const call of errSpy.mock.calls) {
    for (const a of call) expect(String(a)).not.toContain('@');
  }
}

describe('enqueueMail', () => {
  it('reports inserted true on first insert', async () => {
    expect(await enqueueMail(input)).toEqual({ id: 'row1', inserted: true });
  });

  it('reports inserted false on conflict', async () => {
    state.upsert = { data: [], error: null };
    const r = await enqueueMail(input);
    expect(r.inserted).toBe(false);
  });
});

describe('enqueueAndSend', () => {
  it('returns duplicate without sending', async () => {
    state.upsert = { data: [], error: null };
    expect(await enqueueAndSend(input)).toBe('duplicate');
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('sends on first enqueue', async () => {
    expect(await enqueueAndSend(input)).toBe('sent');
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });

  it('never throws when the database fails', async () => {
    state.upsert = { data: null, error: { message: 'x' } };
    await expect(enqueueAndSend(input)).resolves.toBe('failed');
    noEmailInLogs();
  });
});

describe('sendOutboxRow', () => {
  it('returns not_claimed when claim returns no row', async () => {
    state.claim = { data: null, error: null };
    expect(await sendOutboxRow('row1')).toBe('not_claimed');
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('passes idempotencyKey to Resend and marks sent', async () => {
    expect(await sendOutboxRow('row1')).toBe('sent');
    expect(mocks.send.mock.calls[0][1]).toEqual({ idempotencyKey: claimedRow.dedupe_key });
    expect(mocks.updates.at(-1)).toMatchObject({ status: 'sent', provider_id: 'prov1' });
  });

  it('marks failed with resend_error', async () => {
    state.sendResult = { data: null, error: { message: 'bad user@example.com' } };
    expect(await sendOutboxRow('row1')).toBe('failed');
    expect(mocks.updates.at(-1)).toMatchObject({ status: 'failed', last_error: 'resend_error' });
    noEmailInLogs();
  });

  it('marks failed with exception when Resend throws', async () => {
    state.sendThrows = true;
    expect(await sendOutboxRow('row1')).toBe('failed');
    expect(mocks.updates.at(-1)).toMatchObject({ status: 'failed', last_error: 'exception' });
    noEmailInLogs();
  });

  it('marks failed with no_api_key without constructing Resend', async () => {
    delete process.env.RESEND_API_KEY;
    expect(await sendOutboxRow('row1')).toBe('failed');
    expect(mocks.updates.at(-1)).toMatchObject({ status: 'failed', last_error: 'no_api_key' });
    expect(mocks.resendCtor).not.toHaveBeenCalled();
  });
});

describe('processDueMail', () => {
  it('counts sent and failed', async () => {
    state.rpc = { ok: true, data: [claimedRow, { ...claimedRow, id: 'row2' }] };
    let n = 0;
    state.sendResult = undefined;
    Object.defineProperty(state, 'sendResult', {
      configurable: true,
      get: () => (n++ === 0 ? { data: { id: 'p' }, error: null } : { data: null, error: { message: 'x' } }),
    });
    const r = await processDueMail();
    expect(r).toEqual({ claimed: 2, sent: 1, failed: 1, skipped: 0 });
    Object.defineProperty(state, 'sendResult', { configurable: true, writable: true, value: { data: { id: 'p' }, error: null } });
  });

  it('returns zeros when the rpc fails', async () => {
    state.rpc = { ok: false, code: 'unknown' };
    expect(await processDueMail()).toEqual({ claimed: 0, sent: 0, failed: 0, skipped: 0 });
  });
});

describe('buildMail', () => {
  it('renders the invite template', () => {
    const m = buildMail({
      ...claimedRow,
      template: 'invite',
      payload: { clientName: 'Acme' },
    } as any);
    expect(m.subject).toBe(INVITE_SUBJECT);
  });

  it('renders the document_issued template', () => {
    const m = buildMail({
      ...claimedRow,
      template: 'document_issued',
      payload: { documentLabel: 'Contrat', projectTitle: 'Refonte', revision: 2 },
    } as any);
    expect(m.subject).toBe('Nouvelle version : Contrat — Refonte');
    expect(m.text).toContain('/espace-client/documents');
  });

  it('renders the document_signed template', () => {
    const m = buildMail({
      ...claimedRow,
      template: 'document_signed',
      payload: {
        documentLabel: 'le devis',
        projectTitle: 'Site',
        signedDate: '12/10/2026',
        signedTime: '14:05',
      },
    } as any);
    expect(m.subject).toBe('Document signé : le devis — Site');
    expect(m.text).toContain('/espace-client/documents');
  });

  it('renders the document_signed_admin template', () => {
    const m = buildMail({
      ...claimedRow,
      template: 'document_signed_admin',
      payload: {
        documentLabel: 'le devis',
        projectTitle: 'Site',
        clientName: 'Acme',
        reference: 'DEV-1',
        signedDate: '12/10/2026',
        signedTime: '14:05',
        reservedCount: 1,
      },
    } as any);
    expect(m.subject).toBe('Signature reçue : le devis — Site');
    expect(m.text).toContain('Réserves : 1');
    expect(m.text).toContain('p1');
  });

  it('renders the acceptance_refused template', () => {
    const m = buildMail({
      ...claimedRow,
      template: 'acceptance_refused',
      payload: {
        projectTitle: 'Site',
        clientName: 'Acme',
        refusedCount: 1,
        refused: [{ index: 2, criterion: 'SEO', note: 'Manquant' }],
      },
    } as any);
    expect(m.subject).toBe('Recette refusée : 1 critère(s) — Site');
    expect(m.text).toContain('SEO : Manquant');
  });

  describe('payment templates', () => {
    const row = (template: string, payload: Record<string, unknown>) =>
      ({ ...claimedRow, template, payload }) as any;

    it('renders payment_requested', () => {
      const m = buildMail(
        row('payment_requested', {
          invoiceNumber: 'FA-2026-0001',
          kind: 'deposit',
          amountCents: 5000,
          projectTitle: 'Site',
        }),
      );
      expect(m.subject).toBe("Facture d'acompte FA-2026-0001 — Site");
    });

    it('renders payment_received, reminders, anomaly and credit note', () => {
      expect(
        buildMail(row('payment_received', { invoiceNumber: 'F1', amountCents: 100, projectTitle: 'S' }))
          .subject,
      ).toBe('Paiement reçu : facture F1');
      expect(
        buildMail(
          row('payment_reminder', { invoiceNumber: 'F1', amountCents: 100, projectTitle: 'S', stage: 'd7' }),
        ).subject,
      ).toBe("Dernier rappel : facture d'acompte F1");
      expect(
        buildMail(
          row('payment_reminder_admin', {
            invoiceNumber: 'F1',
            amountCents: 100,
            projectTitle: 'S',
            clientName: 'Acme',
            issuedOn: '2026-10-01',
            projectId: 'p1',
          }),
        ).subject,
      ).toBe('Acompte impayé depuis 14 jours — S');
      expect(
        buildMail(
          row('payment_anomaly_admin', {
            invoiceNumber: null,
            amountCents: 100,
            expectedCents: 0,
            projectTitle: 'S',
            projectId: 'p1',
            detail: 'x',
          }),
        ).subject,
      ).toBe('Paiement à rapprocher — S');
      expect(
        buildMail(
          row('credit_note_issued', {
            creditNoteNumber: 'AV1',
            invoiceNumber: 'F1',
            amountCents: 100,
            projectTitle: 'S',
            refundRequested: true,
          }),
        ).subject,
      ).toBe('Avoir AV1 — S');
    });

    it('rejects bad amounts, stages and kinds', () => {
      expect(() => buildMail(row('payment_received', { invoiceNumber: 'F1', projectTitle: 'S' }))).toThrow();
      expect(() =>
        buildMail(row('payment_received', { invoiceNumber: 'F1', amountCents: '100', projectTitle: 'S' })),
      ).toThrow();
      expect(() =>
        buildMail(row('payment_reminder', { invoiceNumber: 'F1', amountCents: 1, projectTitle: 'S', stage: 'd9' })),
      ).toThrow();
      expect(() =>
        buildMail(row('payment_requested', { invoiceNumber: 'F1', amountCents: 1, projectTitle: 'S', kind: 'x' })),
      ).toThrow();
    });
  });
});

const REVIEW_SECRET = 'r'.repeat(48);
const LINK_ID = '11111111-1111-4111-8111-111111111111';

const payRow = {
  ...claimedRow,
  event_type: 'payment_requested',
  template: 'payment_requested',
  payload: { invoiceNumber: 'F1', kind: 'deposit', amountCents: 100, projectTitle: 'S' },
};
const reviewRow = {
  ...claimedRow,
  event_type: 'review_request',
  template: 'review_request',
  payload: { projectTitle: 'Site', linkId: LINK_ID, stage: 'd7' },
};
const adminRow = {
  ...claimedRow,
  event_type: 'mail_suppression_admin',
  template: 'mail_suppression_admin',
  recipient_kind: 'admin',
  payload: { cause: 'complaint', maskedEmail: 'u***@e***.com', clientName: null, isLead: false },
};

describe('suppression guard in deliver', () => {
  it('skips marketing for scope marketing', async () => {
    state.claim = { data: reviewRow, error: null };
    state.scope = 'marketing';
    expect(await sendOutboxRow('row1')).toBe('skipped');
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.updates.at(-1)).toMatchObject({ status: 'skipped', last_error: 'suppressed' });
    noEmailInLogs();
  });

  it('sends transactional on scope marketing, skips on all', async () => {
    state.claim = { data: payRow, error: null };
    state.scope = 'marketing';
    expect(await sendOutboxRow('row1')).toBe('sent');
    expect(mocks.send.mock.calls[0][0].headers).toBeUndefined();
    mocks.send.mockReset();
    state.scope = 'all';
    expect(await sendOutboxRow('row1')).toBe('skipped');
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.updates.at(-1)).toMatchObject({ status: 'skipped', last_error: 'suppressed' });
  });

  it('skips review_request with flag_off without a lookup', async () => {
    vi.stubEnv('REVIEW_REQUESTS_ENABLED', '');
    state.claim = { data: reviewRow, error: null };
    expect(await sendOutboxRow('row1')).toBe('skipped');
    expect(mocks.updates.at(-1)).toMatchObject({ status: 'skipped', last_error: 'flag_off' });
    expect(state.scopeCalls).toBe(0);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('sends admin mail even when the address is fully suppressed', async () => {
    state.claim = { data: adminRow, error: null };
    state.scope = 'all';
    expect(await sendOutboxRow('row1')).toBe('sent');
  });

  it('fails marketing retryably on lookup error, sends transactional', async () => {
    state.scope = 'error';
    state.claim = { data: reviewRow, error: null };
    expect(await sendOutboxRow('row1')).toBe('failed');
    expect(mocks.updates.at(-1)).toMatchObject({
      status: 'failed',
      last_error: 'suppression_unavailable',
    });
    state.claim = { data: payRow, error: null };
    expect(await sendOutboxRow('row1')).toBe('sent');
  });

  it('sends a compliant marketing mail', async () => {
    state.claim = { data: reviewRow, error: null };
    expect(await sendOutboxRow('row1')).toBe('sent');
    const arg = mocks.send.mock.calls[0][0];
    expect(arg.from).toBe('"Sèvalys" <bonjour@sevalys.com>');
    expect(arg.headers['List-Unsubscribe']).toMatch(
      /^<https:\/\/sevalys\.com\/api\/unsubscribe\?t=.+>$/,
    );
    expect(arg.headers['List-Unsubscribe-Post']).toBeTruthy();
    expect(arg.html).toContain('/desinscription?t=');
    expect(arg.text).toContain('/desinscription?t=');
    const token = /desinscription\?t=([^\s"<>]+)/.exec(arg.text)![1];
    expect(verifyUnsubscribeToken(decodeURIComponent(token), SECRET)).toBe('user@example.com');
  });

  it('fails render_error for marketing without a secret', async () => {
    vi.stubEnv('UNSUBSCRIBE_SECRET', '');
    state.claim = { data: reviewRow, error: null };
    expect(await sendOutboxRow('row1')).toBe('failed');
    expect(mocks.updates.at(-1)).toMatchObject({ status: 'failed', last_error: 'render_error' });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('counts skipped separately in processDueMail', async () => {
    state.rpc = { ok: true, data: [payRow, { ...reviewRow, id: 'r2' }, { ...payRow, id: 'r3' }] };
    // payRow: none -> sent; review: all -> skipped; payRow: all -> skipped
    const scopes = ['none', 'all', 'all'];
    let n = 0;
    Object.defineProperty(state, 'scope', {
      configurable: true,
      get: () => scopes[n++] ?? 'none',
      set: () => {},
    });
    const r = await processDueMail();
    Object.defineProperty(state, 'scope', { configurable: true, writable: true, value: 'none' });
    expect(r).toEqual({ claimed: 3, sent: 1, failed: 0, skipped: 2 });
  });
});

describe('new templates and marketing parity', () => {
  const row = (template: string, payload: Record<string, unknown>) =>
    ({ ...claimedRow, event_type: template, template, payload }) as any;

  it('renders document reminders and admin templates', () => {
    expect(
      buildMail(row('document_reminder', { documentLabel: 'le devis', projectTitle: 'S', stage: 'd3' }))
        .subject,
    ).toContain('le devis');
    expect(
      buildMail(row('document_reminder', { documentLabel: 'le devis', projectTitle: 'S', stage: 'd7' }))
        .subject,
    ).toContain('Dernier rappel');
    expect(
      buildMail(
        row('document_reminder_admin', {
          documentLabel: 'le devis',
          projectTitle: 'S',
          clientName: 'Acme',
          issuedOn: '2026-10-01',
          projectId: 'p1',
        }),
      ).text,
    ).toContain('Acme');
    expect(
      buildMail(
        row('mail_suppression_admin', {
          cause: 'complaint',
          maskedEmail: 'u***@e.com',
          clientName: 'Acme',
          isLead: false,
        }),
      ).subject,
    ).toContain('Adresse suspendue');
  });

  it('rejects an invalid reminder stage', () => {
    expect(() =>
      buildMail(row('document_reminder', { documentLabel: 'x', projectTitle: 'S', stage: 'd9' })),
    ).toThrow();
  });

  it('every marketing event builds with unsubscribe headers and link (D-12)', () => {
    const marketing = MAIL_EVENTS.filter((e) => MAIL_RULES[e].class === 'marketing');
    expect(marketing.length).toBeGreaterThan(0);
    for (const e of marketing) {
      const m = buildMail({ ...reviewRow, event_type: e, template: MAIL_RULES[e].template } as any);
      expect(m.headers?.['List-Unsubscribe']).toBeTruthy();
      expect(m.html).toContain('/desinscription?t=');
      expect(m.text).toContain('/desinscription?t=');
    }
  });
});

describe('review mails (phase 18)', () => {
  const row = (template: string, payload: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
    ({ ...claimedRow, event_type: template, template, payload, ...extra }) as any;

  it('renders the link derived from linkId, identical for d7 and d21', () => {
    const token = deriveReviewToken(LINK_ID, REVIEW_SECRET);
    const a = buildMail(row('review_request', { projectTitle: 'Site', linkId: LINK_ID, stage: 'd7' }));
    const b = buildMail(row('review_request', { projectTitle: 'Site', linkId: LINK_ID, stage: 'd21' }));
    for (const m of [a, b]) {
      expect(m.html).toContain(`/avis/${token}`);
      expect(m.text).toContain(`https://sevalys.com/avis/${token}`);
      expect(`${m.html}${m.text}`).not.toMatch(/google/i);
    }
  });

  it('fails closed without REVIEW_TOKEN_SECRET', async () => {
    vi.stubEnv('REVIEW_TOKEN_SECRET', '');
    expect(() => buildMail(reviewRow as any)).toThrow('review_token_unavailable');
    state.claim = { data: reviewRow, error: null };
    expect(await sendOutboxRow('row1')).toBe('failed');
    expect(mocks.updates.at(-1)).toMatchObject({ status: 'failed', last_error: 'render_error' });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('rejects the old reviewUrl payload shape', () => {
    expect(() =>
      buildMail(
        row('review_request', { projectTitle: 'S', reviewUrl: 'https://sevalys.com/avis/x', stage: 'd7' }),
      ),
    ).toThrow('invalid_payload');
  });

  it('renders review_published_admin and review_hidden with the contact reply-to', () => {
    const a = buildMail(
      row('review_published_admin', { projectTitle: 'Site', rating: 5 }, { recipient_kind: 'admin' }),
    );
    expect(a.subject).toBe('Nouvel avis publié : 5 sur 5');
    expect(a.replyTo).toBe('contact@sevalys.com');
    const h = buildMail(row('review_hidden', { projectTitle: 'Site' }));
    expect(h.subject).toBe('Votre avis a été masqué');
    expect(h.replyTo).toBe('contact@sevalys.com');
    expect(h.headers).toBeUndefined();
  });

  it('rejects an invalid rating', () => {
    expect(() => buildMail(row('review_published_admin', { projectTitle: 'S', rating: 9 }))).toThrow(
      'invalid_payload',
    );
    expect(() => buildMail(row('review_published_admin', { projectTitle: 'S' }))).toThrow(
      'invalid_payload',
    );
  });
});

