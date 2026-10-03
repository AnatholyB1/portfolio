import { describe, expect, it } from 'vitest';
import type { Fact, FactType } from '@/lib/projects/steps';
import type { ChainDoc } from './steps';
import { documentStatus, sortForDisplay, withStatuses } from './status';
import type { DocType } from './types';

function f(id: number, type: FactType, createdAt: string, targetFactId: number | null = null): Fact {
  return { id, type, targetFactId, actorKind: 'admin', createdAt };
}

function doc(id: string, docType: DocType, revision: number, replaces: string | null = null): ChainDoc {
  return { id, docType, revision, replacesDocumentId: replaces, issuedAt: '2026-10-02T08:00:00Z' };
}

describe('documentStatus', () => {
  it('is replaced when not the chain head, even if the fact is effective', () => {
    const q1 = doc('q1', 'quote', 1);
    const q2 = doc('q2', 'quote', 2, 'q1');
    const facts = [f(1, 'quote_accepted', '2026-10-02T09:00:00Z')];
    expect(documentStatus(q1, [q1, q2], facts)).toBe('replaced');
  });

  it('quote: to_sign, signed, then to_sign after revocation', () => {
    const q1 = doc('q1', 'quote', 1);
    expect(documentStatus(q1, [q1], [])).toBe('to_sign');
    const accepted = f(1, 'quote_accepted', '2026-10-02T09:00:00Z');
    expect(documentStatus(q1, [q1], [accepted])).toBe('signed');
    const revoked = f(2, 'fact_revoked', '2026-10-02T10:00:00Z', 1);
    expect(documentStatus(q1, [q1], [accepted, revoked])).toBe('to_sign');
  });

  it('contract is signed iff contract_signed is effective', () => {
    const c1 = doc('c1', 'contract', 1);
    expect(documentStatus(c1, [c1], [])).toBe('to_sign');
    expect(documentStatus(c1, [c1], [f(1, 'contract_signed', '2026-10-03T09:00:00Z')])).toBe('signed');
    expect(documentStatus(c1, [c1], [f(1, 'quote_accepted', '2026-10-03T09:00:00Z')])).toBe('to_sign');
  });

  it('acceptance is signed iff acceptance_signed is effective', () => {
    const a1 = doc('a1', 'acceptance', 1);
    expect(documentStatus(a1, [a1], [])).toBe('to_sign');
    expect(documentStatus(a1, [a1], [f(1, 'acceptance_signed', '2026-10-06T09:00:00Z')])).toBe('signed');
  });

  it('spec is issued whatever the facts', () => {
    const s1 = doc('s1', 'spec', 1);
    expect(documentStatus(s1, [s1], [])).toBe('issued');
    expect(documentStatus(s1, [s1], [f(1, 'quote_accepted', '2026-10-02T09:00:00Z')])).toBe('issued');
  });

  it('invoice: balance kind paid iff balance_received', () => {
    const i1 = doc('i1', 'invoice', 1);
    expect(documentStatus(i1, [i1], [], 'balance')).toBe('to_pay');
    expect(documentStatus(i1, [i1], [f(1, 'balance_received', '2026-10-07T09:00:00Z')], 'balance')).toBe('paid');
    expect(documentStatus(i1, [i1], [f(1, 'deposit_received', '2026-10-07T09:00:00Z')], 'balance')).toBe('to_pay');
  });

  it('invoice: deposit kind paid iff deposit_received', () => {
    const i1 = doc('i1', 'invoice', 1);
    expect(documentStatus(i1, [i1], [], 'deposit')).toBe('to_pay');
    expect(documentStatus(i1, [i1], [f(1, 'deposit_received', '2026-10-04T09:00:00Z')], 'deposit')).toBe('paid');
  });
});

describe('withStatuses and sortForDisplay', () => {
  const q1 = doc('q1', 'quote', 1);
  const q2 = doc('q2', 'quote', 2, 'q1');
  const s1 = doc('s1', 'spec', 1);
  const c1 = doc('c1', 'contract', 1);

  it('attaches status and replacedBy', () => {
    const facts = [f(1, 'quote_accepted', '2026-10-02T09:00:00Z')];
    const out = withStatuses([q1, q2, s1], facts);
    const byId = Object.fromEntries(out.map((d) => [d.id, d]));
    expect(byId.q1.status).toBe('replaced');
    expect(byId.q1.replacedBy).toBe(q2);
    expect(byId.q2.status).toBe('signed');
    expect(byId.q2.replacedBy).toBeNull();
    expect(byId.s1.status).toBe('issued');
  });

  it('orders by flow order then revision desc', () => {
    const a1 = doc('a1', 'acceptance', 1);
    const i1 = doc('i1', 'invoice', 1);
    const sorted = sortForDisplay([i1, a1, c1, q1, s1, q2]).map((d) => d.id);
    expect(sorted).toEqual(['q2', 'q1', 's1', 'c1', 'a1', 'i1']);
  });

  it('does not mutate its input', () => {
    const input = [q1, q2];
    sortForDisplay(input);
    expect(input).toEqual([q1, q2]);
  });
});
