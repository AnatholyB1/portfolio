import { createHmac, randomBytes } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resendWebhookSecret, toApplyArgs, verifyResendEvent } from './webhook';

export function makeSecret(): string {
  return `whsec_${randomBytes(32).toString('base64')}`;
}

// Schéma Svix : 'v1,' + base64(HMAC-SHA256(secret décodé, `${id}.${ts}.${payload}`)).
export function sign(secret: string, id: string, timestamp: string, payload: string): string {
  const key = Buffer.from(secret.slice('whsec_'.length), 'base64');
  return `v1,${createHmac('sha256', key).update(`${id}.${timestamp}.${payload}`).digest('base64')}`;
}

const nowTs = () => String(Math.floor(Date.now() / 1000));

afterEach(() => vi.restoreAllMocks());

describe('resendWebhookSecret', () => {
  it('requires the whsec_ prefix', () => {
    expect(resendWebhookSecret({})).toBeNull();
    expect(resendWebhookSecret({ RESEND_WEBHOOK_SECRET: 'abc' })).toBeNull();
    expect(resendWebhookSecret({ RESEND_WEBHOOK_SECRET: 'whsec_abc' })).toBe('whsec_abc');
  });
});

describe('verifyResendEvent', () => {
  const secret = makeSecret();
  const body = JSON.stringify({ type: 'email.bounced', data: { to: ['a@b.fr'] } });
  const id = 'msg_123';

  it('verifies a correctly signed payload', () => {
    const ts = nowTs();
    const ev = verifyResendEvent(body, { id, timestamp: ts, signature: sign(secret, id, ts, body) }, secret);
    expect(ev?.type).toBe('email.bounced');
  });

  it('rejects altered body, wrong secret, missing prefix and stale timestamp', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const ts = nowTs();
    const sig = sign(secret, id, ts, body);
    expect(verifyResendEvent(body + ' ', { id, timestamp: ts, signature: sig }, secret)).toBeNull();
    expect(verifyResendEvent(body, { id, timestamp: ts, signature: sig }, makeSecret())).toBeNull();
    expect(
      verifyResendEvent(body, { id, timestamp: ts, signature: sig.replace('v1,', '') }, secret),
    ).toBeNull();
    const old = String(Math.floor(Date.now() / 1000) - 600);
    expect(
      verifyResendEvent(body, { id, timestamp: old, signature: sign(secret, id, old, body) }, secret),
    ).toBeNull();
  });

  it('logs exactly the fixed string on failure', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    verifyResendEvent(body, { id, timestamp: nowTs(), signature: 'v1,bad' }, secret);
    expect(spy.mock.calls).toEqual([['[resend/webhook] verify_failed']]);
  });

  it('returns null on empty headers', () => {
    expect(verifyResendEvent(body, { id: '', timestamp: nowTs(), signature: 'x' }, secret)).toBeNull();
  });
});

describe('toApplyArgs', () => {
  const bounced = (type: string, to: unknown = ['A@B.fr', 'a@b.fr']) => ({
    type: 'email.bounced',
    data: { to, bounce: { type } },
  });

  it('maps a Permanent bounce, normalised and de-duplicated', () => {
    expect(toApplyArgs('evt1', bounced('Permanent'))).toEqual({
      p_event_id: 'evt1',
      p_event_type: 'email.bounced',
      p_emails: ['a@b.fr'],
      p_bounce_type: 'Permanent',
    });
  });

  it('ignores Transient and Undetermined bounces', () => {
    expect(toApplyArgs('e', bounced('Transient'))).toBeNull();
    expect(toApplyArgs('e', bounced('Undetermined'))).toBeNull();
  });

  it('maps complaints with null bounce type', () => {
    expect(toApplyArgs('e', { type: 'email.complained', data: { to: ['x@y.fr'] } })).toEqual({
      p_event_id: 'e',
      p_event_type: 'email.complained',
      p_emails: ['x@y.fr'],
      p_bounce_type: null,
    });
  });

  it('ignores other events and malformed input', () => {
    for (const t of ['email.delivered', 'email.opened', 'email.delivery_delayed']) {
      expect(toApplyArgs('e', { type: t, data: { to: ['x@y.fr'] } })).toBeNull();
    }
    expect(toApplyArgs('e', 'nope')).toBeNull();
    expect(toApplyArgs('e', { type: 'email.complained', data: {} })).toBeNull();
    expect(toApplyArgs('e', { type: 'email.complained', data: { to: [] } })).toBeNull();
  });

  it('caps recipients at 50 and drops invalid entries', () => {
    const many = Array.from({ length: 60 }, (_, i) => `u${i}@x.fr`);
    expect(toApplyArgs('e', bounced('Permanent', many))?.p_emails).toHaveLength(50);
    const bad = ['no-at', `${'a'.repeat(250)}@x.fr`, 42];
    expect(toApplyArgs('e', bounced('Permanent', bad))).toBeNull();
    expect(toApplyArgs('e', bounced('Permanent', [...bad, 'ok@x.fr']))?.p_emails).toEqual(['ok@x.fr']);
  });
});
