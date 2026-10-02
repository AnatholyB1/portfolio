/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lookupSiret } from './siret';

const SIRET = '55210055400025';

const apiBody = (over: Record<string, unknown> = {}) => ({
  results: [
    {
      siren: '552100554',
      nom_complet: 'ACME SAS',
      nature_juridique: '5710',
      categorie_entreprise: 'PME',
      date_creation: '1980-01-01',
      tva: 'FR12552100554',
      activite_principale: '62.01Z',
      dirigeants: [{ nom: 'Dupont', prenoms: 'Jean' }],
      siege: {
        siret: SIRET,
        adresse: '1 RUE X 75001 PARIS',
        code_postal: '75001',
        libelle_commune: 'PARIS',
        activite_principale: '62.01Z',
        etat_administratif: 'A',
      },
      matching_etablissements: [],
      ...over,
    },
  ],
});

const respond = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('lookupSiret', () => {
  it('rejects invalid SIRET without fetching', async () => {
    expect(await lookupSiret('123')).toEqual({ ok: false, reason: 'invalid' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns minimised data on an exact siege match, never dirigeants', async () => {
    fetchMock.mockReturnValue(respond(apiBody()));
    const r = await lookupSiret('552 100 554 00025');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toMatchObject({
      siret: SIRET,
      siren: '552100554',
      nom: 'ACME SAS',
      commune: 'PARIS',
      code_postal: '75001',
      naf: '62.01Z',
      etat_administratif: 'A',
      forme_juridique_code: '5710',
      tva_intracom: 'FR12552100554',
    });
    expect('dirigeants' in r.data).toBe(false);
    expect(JSON.stringify(r)).not.toContain('Dupont');
  });

  it('uses the URL and abort signal contract', async () => {
    fetchMock.mockReturnValue(respond(apiBody()));
    await lookupSiret(SIRET);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`https://recherche-entreprises.api.gouv.fr/search?q=${SIRET}&per_page=1`);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('matches in matching_etablissements', async () => {
    fetchMock.mockReturnValue(
      respond(
        apiBody({
          siege: { siret: '55210055400001' },
          matching_etablissements: [
            { siret: SIRET, adresse: '2 RUE Y', code_postal: '69001', libelle_commune: 'LYON', etat_administratif: 'F' },
          ],
        }),
      ),
    );
    const r = await lookupSiret(SIRET);
    expect(r.ok && r.data.commune).toBe('LYON');
  });

  it('returns not_found when a fuzzy match has a different SIRET', async () => {
    fetchMock.mockReturnValue(respond(apiBody({ siege: { siret: '99999999999999' } })));
    expect(await lookupSiret(SIRET)).toEqual({ ok: false, reason: 'not_found' });
  });

  it('maps 429 to rate_limited', async () => {
    fetchMock.mockReturnValue(respond({}, 429));
    expect(await lookupSiret(SIRET)).toEqual({ ok: false, reason: 'rate_limited' });
  });

  it('maps 500 and network errors to unavailable', async () => {
    fetchMock.mockReturnValueOnce(respond({}, 500));
    expect(await lookupSiret(SIRET)).toEqual({ ok: false, reason: 'unavailable' });
    fetchMock.mockRejectedValueOnce(new Error('timeout'));
    expect(await lookupSiret(SIRET)).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('does not log the SIRET', async () => {
    fetchMock.mockReturnValue(respond({}, 500));
    await lookupSiret(SIRET);
    expect(JSON.stringify((console.error as any).mock.calls)).not.toContain(SIRET);
  });
});
