import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  verify: vi.fn(),
  toArgs: vi.fn(),
  callRpc: vi.fn(),
  send: vi.fn(),
  after: vi.fn(),
}));

vi.mock('@/lib/server/stripe/webhook', async (orig) => ({
  ...(await orig<typeof import('@/lib/server/stripe/webhook')>()),
  verifyStripeEvent: (...a: unknown[]) => h.verify(...a),
  toApplyArgs: (...a: unknown[]) => h.toArgs(...a),
}));
vi.mock('@/lib/server/rpc', () => ({ callRpc: (...a: unknown[]) => h.callRpc(...a) }));
vi.mock('@/lib/server/mail/outbox', () => ({ sendOutboxRow: (...a: unknown[]) => h.send(...a) }));
vi.mock('@/lib/server/projects/facts', () => ({ afterFactPosted: (...a: unknown[]) => h.after(...a) }));

import { LEDGER_KINDS } from '@/lib/server/stripe/webhook';
import { POST } from './route';

function req(sig: string | null = 't=1,v1=x') {
  return new Request('https://site.test/api/stripe/webhook', {
    method: 'POST',
    body: '{"id":"evt_1"}',
    headers: sig ? { 'stripe-signature': sig } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  h.verify.mockReturnValue({ event: { id: 'evt_1' }, mode: 'test' });
  h.toArgs.mockReturnValue({ p_event_id: 'evt_1', p_kind: 'paid' });
  h.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'applied', project_id: 'p1', fact_id: 7, outbox_ids: ['o1', 'o2'] } });
  h.send.mockResolvedValue('sent');
  h.after.mockResolvedValue(undefined);
});

describe('POST /api/stripe/webhook', () => {
  it('missing signature -> 400', async () => {
    const r = await POST(req(null));
    expect(r.status).toBe(400);
    expect(await r.text()).toBe('missing signature');
  });

  it('invalid signature -> 400, no RPC', async () => {
    h.verify.mockReturnValue(null);
    const r = await POST(req());
    expect(r.status).toBe(400);
    expect(await r.text()).toBe('invalid signature');
    expect(h.callRpc).not.toHaveBeenCalled();
  });

  it('unmapped event -> 200 ignored, no RPC', async () => {
    h.toArgs.mockReturnValue(null);
    const r = await POST(req());
    expect(r.status).toBe(200);
    expect(await r.text()).toBe('ignored');
    expect(h.callRpc).not.toHaveBeenCalled();
  });

  it('RPC failure -> 500 retry', async () => {
    h.callRpc.mockResolvedValue({ ok: false, code: 'unknown' });
    const r = await POST(req());
    expect(r.status).toBe(500);
    expect(await r.text()).toBe('retry');
  });

  it('success sends each outbox row and notifies the fact', async () => {
    const r = await POST(req());
    expect(r.status).toBe(200);
    expect(h.callRpc).toHaveBeenCalledWith(
      'stripe/webhook',
      'sv_apply_stripe_event',
      expect.objectContaining({ p_event_id: 'evt_1', p_admin_email: 'contact@sevalys.com' }),
    );
    expect(h.send).toHaveBeenCalledTimes(2);
    expect(h.after).toHaveBeenCalledWith('p1', 7);
  });

  it('mail or notify failures still return 200', async () => {
    h.send.mockRejectedValue(new Error('x'));
    h.after.mockRejectedValue(new Error('y'));
    const r = await POST(req());
    expect(r.status).toBe(200);
  });

  it('ignored_unresolved -> 200 ok, nothing sent or notified', async () => {
    h.callRpc.mockResolvedValue({
      ok: true,
      data: { outcome: 'ignored_unresolved', project_id: null, fact_id: null, outbox_ids: [] },
    });
    const r = await POST(req());
    expect(r.status).toBe(200);
    expect(await r.text()).toBe('ok');
    expect(h.send).not.toHaveBeenCalled();
    expect(h.after).not.toHaveBeenCalled();
  });
});

describe('static guarantees', () => {
  const root = process.cwd();

  it('route reads the raw body', () => {
    const src = readFileSync(join(root, 'src/app/api/stripe/webhook/route.ts'), 'utf8');
    expect(src).toContain('request.text()');
    expect(src).not.toContain('request.json');
  });

  it('LEDGER_KINDS equals the migration CHECK list', () => {
    const sql = readFileSync(join(root, 'supabase/migrations/20261007010000_sv_payments.sql'), 'utf8');
    const m = /sv_invoice_payment_events \([\s\S]*?kind text not null check \(kind in \(([\s\S]*?)\)\)/.exec(sql);
    expect(m).not.toBeNull();
    const kinds = [...(m as RegExpExecArray)[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
    expect([...kinds].sort()).toEqual([...LEDGER_KINDS].sort());
  });

  it('proxy public matcher excludes api', () => {
    const src = readFileSync(join(root, 'src/proxy.ts'), 'utf8');
    expect(src).toContain('(?!api');
  });
});
