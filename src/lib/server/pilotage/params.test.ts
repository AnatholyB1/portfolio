import { describe, expect, it } from 'vitest';
import { parsePilotageParams, pilotageHref } from './params';

const DEFAULTS = { periode: 'mois', base: 'ttc', tests: false, detail: null, projectId: null, page: 1 } as const;
const UUID = '3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b';

describe('parsePilotageParams', () => {
  it('défauts', () => {
    expect(parsePilotageParams({})).toEqual(DEFAULTS);
  });
  it('valeurs valides', () => {
    expect(
      parsePilotageParams({ periode: 'annee', base: 'ht', tests: '1', detail: 'facture', page: '3', cle: `projet:${UUID}` }),
    ).toEqual({ periode: 'annee', base: 'ht', tests: true, detail: 'facture', projectId: UUID, page: 3 });
  });
  it('valeurs inconnues retombent sur les défauts', () => {
    expect(
      parsePilotageParams({ periode: 'semaine', base: 'eur', tests: 'yes', detail: 'x', page: '-3' }),
    ).toEqual(DEFAULTS);
    expect(parsePilotageParams({ page: '1e9' }).page).toBe(1);
    expect(parsePilotageParams({ periode: 'constructor', detail: 'hasOwnProperty' })).toEqual(DEFAULTS);
  });
  it('tableaux : premier élément', () => {
    expect(parsePilotageParams({ periode: ['trimestre', 'annee'], base: ['ht'] })).toMatchObject({
      periode: 'trimestre',
      base: 'ht',
    });
  });
  it('cle : uuid uniquement', () => {
    expect(parsePilotageParams({ cle: `projet:${UUID}` }).projectId).toBe(UUID);
    expect(parsePilotageParams({ cle: "projet:1'; drop table x;--" }).projectId).toBeNull();
    expect(parsePilotageParams({ cle: `client:${UUID}` }).projectId).toBeNull();
    expect(parsePilotageParams({ cle: 'projet:abc' }).projectId).toBeNull();
  });
});

describe('pilotageHref', () => {
  it('détail avec ancre', () => {
    expect(pilotageHref({ ...DEFAULTS }, { detail: 'facture' })).toBe(
      '/admin/pilotage?periode=mois&base=ttc&tests=0&detail=facture#detail',
    );
  });
  it('projet et page', () => {
    const href = pilotageHref({ ...DEFAULTS }, { detail: 'devis', projectId: UUID, page: 2 });
    expect(href).toBe(
      `/admin/pilotage?periode=mois&base=ttc&tests=0&detail=devis&cle=${encodeURIComponent(`projet:${UUID}`)}&page=2#detail`,
    );
  });
  it('réinitialisation du détail', () => {
    const cur = { ...DEFAULTS, detail: 'facture' as const, projectId: UUID, page: 4 };
    expect(pilotageHref(cur, { detail: null, projectId: null })).toBe('/admin/pilotage?periode=mois&base=ttc&tests=0');
  });
  it('tests activés', () => {
    expect(pilotageHref({ ...DEFAULTS }, { tests: true, base: 'ht', periode: 'annee' })).toBe(
      '/admin/pilotage?periode=annee&base=ht&tests=1',
    );
  });
});
