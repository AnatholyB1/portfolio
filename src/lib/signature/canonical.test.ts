import { describe, expect, it } from 'vitest';
import { canonicalJson, HASH_FORMAT_VERSION, LINK_SEPARATOR } from './canonical';
import { SIGNATURE_ACTOR_KINDS, SIGNATURE_EVENTS, SIGNATURE_EVENT_LABELS } from './events';

describe('canonicalJson', () => {
  it('sorts keys at every depth without whitespace', () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: [3, { f: 1, e: 2 }] } })).toBe(
      '{"a":{"c":[3,{"e":2,"f":1}],"d":2},"b":1}',
    );
  });

  it('escapes the U+001F separator so it never appears raw', () => {
    const out = canonicalJson({ k: 'a\u001fb' });
    expect(out).toBe('{"k":"a\\u001fb"}');
    expect(out.includes('\u001f')).toBe(false);
  });

  it('keeps null and array order', () => {
    expect(canonicalJson({ a: null, l: [3, 1, 2] })).toBe('{"a":null,"l":[3,1,2]}');
  });

  it('throws on unsupported values', () => {
    expect(() => canonicalJson({ a: undefined })).toThrow('canonical_unsupported');
    expect(() => canonicalJson({ a: () => 1 })).toThrow('canonical_unsupported');
    expect(() => canonicalJson({ a: NaN })).toThrow('canonical_unsupported');
    expect(() => canonicalJson({ a: Infinity })).toThrow('canonical_unsupported');
  });

  it('exposes the hash contract constants', () => {
    expect(HASH_FORMAT_VERSION).toBe('v1');
    expect(LINK_SEPARATOR).toBe('\u001f');
  });
});

describe('closed lists', () => {
  it('has the 12 event types in contract order', () => {
    expect([...SIGNATURE_EVENTS]).toEqual([
      'document_opened',
      'acceptance_response',
      'acceptance_refused',
      'consent_given',
      'code_sent',
      'code_send_failed',
      'code_failed',
      'code_locked',
      'code_expired',
      'signed',
      'sealed',
      'seal_downloaded',
    ]);
  });

  it('has a non-empty French label for every event', () => {
    for (const e of SIGNATURE_EVENTS) expect(SIGNATURE_EVENT_LABELS[e].length).toBeGreaterThan(0);
    expect(SIGNATURE_EVENT_LABELS.code_locked).toBe('Code bloqué (trop d\'essais)');
  });

  it('has the three actor kinds', () => {
    expect([...SIGNATURE_ACTOR_KINDS]).toEqual(['client', 'admin', 'system']);
  });
});
