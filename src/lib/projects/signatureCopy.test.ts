import { describe, expect, it } from 'vitest';
import { SIGNATURE_EVENT_LABELS } from '../signature/events';
import { PROJECT_COPY } from './copy';

const S = PROJECT_COPY.signature;

function collect(node: unknown, out: string[]): void {
  if (typeof node === 'string') out.push(node);
  else if (typeof node === 'function') {
    const fn = node as (...a: unknown[]) => unknown;
    const r = fn(3, 'a', 'b', 'c');
    if (typeof r === 'string') out.push(r);
  } else if (Array.isArray(node)) node.forEach((n) => collect(n, out));
  else if (node && typeof node === 'object') Object.values(node).forEach((n) => collect(n, out));
}

describe('PROJECT_COPY.signature', () => {
  it('has the page titles and step labels', () => {
    expect(S.titles.quote).toBe('Signer le devis');
    expect(S.titles.contract).toBe('Signer le contrat');
    expect(S.titles.acceptance).toBe('Signer le procès-verbal de recette');
    expect(S.titles.acceptanceChecklist).toBe('Recette du projet');
    expect(S.steps.three).toHaveLength(3);
    expect(S.steps.four).toHaveLength(4);
  });

  it('has the finalizePending message and action', () => {
    expect(S.code.finalizePending).toBe(
      "Votre signature est enregistrée, mais le document signé n'a pas encore pu être finalisé. Réessayez dans un instant ; si l'erreur persiste, écrivez-nous.",
    );
    expect(S.code.finalizeAction).toBe('Reprendre la finalisation');
    expect(S.code.signFailed).toContain("Aucune signature n'a été enregistrée");
  });

  it('has the Documents tab labels', () => {
    expect(S.documentsTab.readAndSign).toBe('Lire et signer');
    expect(S.documentsTab.downloadSigned).toBe('Télécharger le document signé');
    expect(S.documentsTab.signedOn('4 octobre 2026')).toContain('4 octobre 2026');
  });

  it('has parameterised admin integrity messages', () => {
    expect(S.admin.integrityOk(3, '4 octobre 2026', '10:00')).toContain('3 maillons');
    expect(S.admin.integrityBroken(2)).toContain('maillon 2');
    expect(S.admin.integrityFailure.length).toBeGreaterThan(0);
    expect(Object.keys(S.admin.actions)).toHaveLength(12);
    expect(S.admin.actions).toEqual(SIGNATURE_EVENT_LABELS);
  });

  it('updates the frozen-document sentence (D-17)', () => {
    expect(PROJECT_COPY.documents.admin.signedNoReplace).toBe(
      'Ce document est signé et figé. Pour corriger, ajoutez un fait correctif depuis le journal des faits.',
    );
  });

  it('contains no U+202F nor euro sign', () => {
    const all: string[] = [];
    collect(S, all);
    expect(all.length).toBeGreaterThan(50);
    for (const s of all) {
      expect(s).not.toContain(' ');
      expect(s).not.toContain('€');
    }
  });
});
