import { describe, expect, it } from 'vitest';
import { countDocumentsToSign, type PendingDoc, type ProjectFact } from './pendingSignatures';

const doc = (id: string, projectId: string, docType: PendingDoc['docType'], revision = 1, replaces: string | null = null): PendingDoc => ({
  id,
  projectId,
  docType,
  revision,
  replacesDocumentId: replaces,
  issuedAt: '2026-10-01T08:00:00Z',
});
let n = 0;
const fact = (projectId: string, type: ProjectFact['type'], target: number | null = null): ProjectFact => ({
  id: ++n,
  projectId,
  type,
  targetFactId: target,
  actorKind: 'admin',
  createdAt: `2026-10-0${Math.min(n, 9)}T08:00:00Z`,
});

describe('countDocumentsToSign', () => {
  it('counts an issued document without any signing fact', () => {
    expect(countDocumentsToSign([doc('q1', 'p1', 'quote')], [])).toBe(1);
  });

  it('does not count a document signed electronically', () => {
    expect(countDocumentsToSign([doc('q1', 'p1', 'quote')], [fact('p1', 'quote_accepted')])).toBe(0);
  });

  it('does not count a document whose fact was posted by hand (no signature row needed)', () => {
    // Régression : le décompte lisait sv_document_signatures, donc un fait manuel laissait le document « à signer ».
    expect(countDocumentsToSign([doc('c1', 'p1', 'contract')], [fact('p1', 'contract_signed')])).toBe(0);
  });

  it('counts again once the signing fact has been revoked', () => {
    const f = fact('p1', 'quote_accepted');
    const revoke = fact('p1', 'fact_revoked', f.id);
    expect(countDocumentsToSign([doc('q1', 'p1', 'quote')], [f, revoke])).toBe(1);
  });

  it('ignores a replaced revision and counts the head only', () => {
    const docs = [doc('q1', 'p1', 'quote', 1), doc('q2', 'p1', 'quote', 2, 'q1')];
    expect(countDocumentsToSign(docs, [])).toBe(1);
  });

  it('keeps projects apart: a fact of one project never closes the document of another', () => {
    const docs = [doc('q1', 'p1', 'quote'), doc('q2', 'p2', 'quote')];
    expect(countDocumentsToSign(docs, [fact('p1', 'quote_accepted')])).toBe(1);
  });

  it('never counts a non signable document', () => {
    expect(countDocumentsToSign([doc('s1', 'p1', 'spec')], [])).toBe(0);
  });
});
