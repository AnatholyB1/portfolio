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
}));

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
  process.env.RESEND_API_KEY = 're_test';
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
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
    expect(r).toEqual({ claimed: 2, sent: 1, failed: 1 });
    Object.defineProperty(state, 'sendResult', { configurable: true, writable: true, value: { data: { id: 'p' }, error: null } });
  });

  it('returns zeros when the rpc fails', async () => {
    state.rpc = { ok: false, code: 'unknown' };
    expect(await processDueMail()).toEqual({ claimed: 0, sent: 0, failed: 0 });
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
});
