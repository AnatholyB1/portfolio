import { describe, expect, it } from 'vitest';
import type { Fact, FactType } from '@/lib/projects/steps';
import {
  DOC_PREREQUISITE,
  DOC_STEP_GUARD,
  SIGNING_FACT,
  checkIssuable,
  checkPreviewable,
  chainHeads,
  expectedDocTypes,
  replacedByMap,
  type ChainDoc,
} from './steps';
import type { DocType } from './types';

const STARTED = '2026-10-01T08:00:00Z';

function f(id: number, type: FactType, createdAt: string, targetFactId: number | null = null): Fact {
  return { id, type, targetFactId, actorKind: 'admin', createdAt };
}

function doc(id: string, docType: DocType, revision: number, replaces: string | null = null): ChainDoc {
  return { id, docType, revision, replacesDocumentId: replaces, issuedAt: '2026-10-02T08:00:00Z' };
}

const onboarding = f(1, 'onboarding_completed', '2026-10-01T09:00:00Z');
const quoteAccepted = f(2, 'quote_accepted', '2026-10-02T09:00:00Z');
const contractSigned = f(3, 'contract_signed', '2026-10-03T09:00:00Z');
const deposit = f(4, 'deposit_received', '2026-10-04T09:00:00Z');
const production = f(5, 'production_completed', '2026-10-05T09:00:00Z');
const acceptanceSigned = f(6, 'acceptance_signed', '2026-10-06T09:00:00Z');

const step2 = [onboarding];
const step3 = [onboarding, quoteAccepted];
const step5 = [onboarding, quoteAccepted, contractSigned, deposit, production];
const step6 = [...step5, acceptanceSigned];

function args(docType: DocType, facts: Fact[], docs: ChainDoc[] = []) {
  return { docType, facts, startedAt: STARTED, docs };
}

describe('constants', () => {
  it('maps guards, prerequisites and signing facts', () => {
    expect(DOC_STEP_GUARD).toEqual({ quote: 2, spec: 2, contract: 3, acceptance: 5, invoice: 6 });
    expect(DOC_PREREQUISITE).toEqual({ contract: 'quote', acceptance: 'spec', invoice: 'quote' });
    expect(SIGNING_FACT).toEqual({
      quote: 'quote_accepted',
      contract: 'contract_signed',
      acceptance: 'acceptance_signed',
    });
  });
});

describe('checkIssuable', () => {
  it('refuses a quote at step 1', () => {
    expect(checkIssuable(args('quote', []))).toEqual({ ok: false, code: 'wrong_step' });
  });

  it('allows quote and spec at step 2 and refuses the contract', () => {
    expect(checkIssuable(args('quote', step2))).toEqual({ ok: true, replaces: null, revision: 1 });
    expect(checkIssuable(args('spec', step2))).toEqual({ ok: true, replaces: null, revision: 1 });
    expect(checkIssuable(args('contract', step2))).toEqual({ ok: false, code: 'wrong_step' });
  });

  it('replaces an active quote at step 2 with revision 2', () => {
    const q1 = doc('q1', 'quote', 1);
    expect(checkIssuable(args('quote', step2, [q1]))).toEqual({ ok: true, replaces: q1, revision: 2 });
  });

  it('allows the contract at step 3 only with an active quote', () => {
    const q1 = doc('q1', 'quote', 1);
    expect(checkIssuable(args('contract', step3, [q1]))).toEqual({ ok: true, replaces: null, revision: 1 });
    expect(checkIssuable(args('contract', step3))).toEqual({ ok: false, code: 'missing_quote' });
  });

  it('refuses replacing a signed contract until the fact is revoked', () => {
    const q1 = doc('q1', 'quote', 1);
    const c1 = doc('c1', 'contract', 1);
    const signed = [...step3, contractSigned];
    expect(checkIssuable(args('contract', signed, [q1, c1]))).toEqual({ ok: false, code: 'signed_no_replace' });
    const revoked = [...signed, f(9, 'fact_revoked', '2026-10-03T10:00:00Z', 3)];
    expect(checkIssuable(args('contract', revoked, [q1, c1]))).toEqual({ ok: true, replaces: c1, revision: 2 });
  });

  it('allows the acceptance at step 5 only with an active spec', () => {
    const s1 = doc('s1', 'spec', 1);
    expect(checkIssuable(args('acceptance', step5, [s1]))).toEqual({ ok: true, replaces: null, revision: 1 });
    expect(checkIssuable(args('acceptance', step5))).toEqual({ ok: false, code: 'missing_spec' });
  });

  it('refuses a signed acceptance replacement', () => {
    // acceptance_signed closes step 5, so the guard trips first at step 6
    const s1 = doc('s1', 'spec', 1);
    const a1 = doc('a1', 'acceptance', 1);
    expect(checkIssuable(args('acceptance', step6, [s1, a1]))).toEqual({ ok: false, code: 'wrong_step' });
  });

  it('refuses a signed quote replacement through the step guard', () => {
    const q1 = doc('q1', 'quote', 1);
    expect(checkIssuable(args('quote', step3, [q1]))).toEqual({ ok: false, code: 'wrong_step' });
  });

  it('never issues an invoice, preview only', () => {
    const q1 = doc('q1', 'quote', 1);
    expect(checkIssuable(args('invoice', step6, [q1]))).toEqual({ ok: false, code: 'preview_only' });
  });

  it('refuses everything when the project is done', () => {
    const all = [...step6, f(7, 'balance_received', '2026-10-07T09:00:00Z')];
    const q1 = doc('q1', 'quote', 1);
    const s1 = doc('s1', 'spec', 1);
    for (const t of ['quote', 'spec', 'contract', 'acceptance'] as DocType[]) {
      expect(checkIssuable(args(t, all, [q1, s1]))).toEqual({ ok: false, code: 'wrong_step' });
    }
  });
});

describe('checkPreviewable', () => {
  it('previews the invoice at step 6 with an active quote', () => {
    const q1 = doc('q1', 'quote', 1);
    expect(checkPreviewable(args('invoice', step6, [q1]))).toEqual({ ok: true, replaces: null, revision: 1 });
  });

  it('refuses the invoice preview without quote or at step 5', () => {
    const q1 = doc('q1', 'quote', 1);
    expect(checkPreviewable(args('invoice', step6))).toEqual({ ok: false, code: 'missing_quote' });
    expect(checkPreviewable(args('invoice', step5, [q1]))).toEqual({ ok: false, code: 'wrong_step' });
  });

  it('applies the same rules as checkIssuable for issuable types', () => {
    const q1 = doc('q1', 'quote', 1);
    const c1 = doc('c1', 'contract', 1);
    const signed = [...step3, contractSigned];
    expect(checkPreviewable(args('quote', step2, [q1]))).toEqual({ ok: true, replaces: q1, revision: 2 });
    expect(checkPreviewable(args('contract', step3))).toEqual({ ok: false, code: 'missing_quote' });
    expect(checkPreviewable(args('contract', signed, [q1, c1]))).toEqual({ ok: false, code: 'signed_no_replace' });
  });
});

describe('chain helpers', () => {
  const q1 = doc('q1', 'quote', 1);
  const q2 = doc('q2', 'quote', 2, 'q1');
  const q3 = doc('q3', 'quote', 3, 'q2');

  it('finds chain heads per type', () => {
    const s1 = doc('s1', 'spec', 1);
    const heads = chainHeads([q1, q2, q3, s1]);
    expect(heads.get('quote')).toBe(q3);
    expect(heads.get('spec')).toBe(s1);
    expect(heads.has('contract')).toBe(false);
  });

  it('maps replaced ids to the replacing doc', () => {
    const m = replacedByMap([q1, q2, q3]);
    expect(m.get('q1')).toBe(q2);
    expect(m.get('q2')).toBe(q3);
    expect(m.has('q3')).toBe(false);
  });
});

describe('expectedDocTypes', () => {
  it('lists documents by step in flow order', () => {
    expect(expectedDocTypes(2)).toEqual(['quote', 'spec']);
    expect(expectedDocTypes(3)).toEqual(['contract']);
    expect(expectedDocTypes(4)).toEqual([]);
    expect(expectedDocTypes(5)).toEqual(['acceptance']);
    expect(expectedDocTypes(6)).toEqual(['invoice']);
    expect(expectedDocTypes(1)).toEqual([]);
    expect(expectedDocTypes(null)).toEqual([]);
  });
});
