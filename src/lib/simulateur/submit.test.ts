import { describe, expect, it } from 'vitest';
import { canSubmit, buildProspectPayload, type ContactDetails } from './submit';
import { prospectSchema } from '@/lib/prospects-schema';
import type { Answer } from './questions';

// Locked expected key set (mirrors src/app/api/simulateur/route.test.ts's
// Object.keys(...).sort() idiom) — proves no score/visualScore/gauge key
// leaks into the request body (SIMU-03, T-07-10).
const EXPECTED_PAYLOAD_KEYS = [
  'consentementRgpd',
  'email',
  'formRenderedAt',
  'nom',
  'reponsesDiagnostic',
  'servicesRecommandes',
  'telephone',
  'website',
].sort();

const VALID_CONTACT: ContactDetails = {
  nom: 'Jean Dupont',
  email: 'jean.dupont@example.com',
  telephone: '0612345678',
};

const VALID_ANSWERS: Answer[] = [
  { questionId: 'presence-en-ligne', value: 'inexistante' },
  { questionId: 'frictions', value: ['appels-manques', 'pas-assez-de-demandes'] },
];

function validInput(overrides: Partial<Parameters<typeof buildProspectPayload>[0]> = {}) {
  return {
    contact: VALID_CONTACT,
    consent: true,
    answers: VALID_ANSWERS,
    formRenderedAt: 1_700_000_000_000,
    ...overrides,
  };
}

describe('canSubmit', () => {
  // SIMU-05: consent gates submission regardless of how complete the
  // contact details are.
  it('returns false when consent is false, regardless of contact completeness', () => {
    expect(
      canSubmit({ contact: VALID_CONTACT, consent: false, answers: VALID_ANSWERS })
    ).toBe(false);
  });

  it('returns false when nom is empty or whitespace-only', () => {
    expect(
      canSubmit({
        contact: { ...VALID_CONTACT, nom: '' },
        consent: true,
        answers: VALID_ANSWERS,
      })
    ).toBe(false);
    expect(
      canSubmit({
        contact: { ...VALID_CONTACT, nom: '   ' },
        consent: true,
        answers: VALID_ANSWERS,
      })
    ).toBe(false);
  });

  it('returns false when email is empty or whitespace-only', () => {
    expect(
      canSubmit({
        contact: { ...VALID_CONTACT, email: '' },
        consent: true,
        answers: VALID_ANSWERS,
      })
    ).toBe(false);
  });

  it('returns false when telephone is empty or whitespace-only', () => {
    expect(
      canSubmit({
        contact: { ...VALID_CONTACT, telephone: '  ' },
        consent: true,
        answers: VALID_ANSWERS,
      })
    ).toBe(false);
  });

  it('returns false when answers is empty (reponsesDiagnostic requires min 1)', () => {
    expect(canSubmit({ contact: VALID_CONTACT, consent: true, answers: [] })).toBe(false);
  });

  it('returns true for a complete, consented fixture', () => {
    expect(canSubmit({ contact: VALID_CONTACT, consent: true, answers: VALID_ANSWERS })).toBe(
      true
    );
  });
});

describe('buildProspectPayload', () => {
  // SIMU-05: must throw rather than return a partial object, so no code
  // path can accidentally POST an unconsented body.
  it('throws when consent is not exactly true, naming the consent requirement', () => {
    expect(() => buildProspectPayload(validInput({ consent: false }))).toThrow(/consent/i);
  });

  it('Object.keys(payload).sort() equals exactly the locked prospectSchema key set', () => {
    const payload = buildProspectPayload(validInput());
    expect(Object.keys(payload).sort()).toEqual(EXPECTED_PAYLOAD_KEYS);
  });

  it("website is the empty string", () => {
    const payload = buildProspectPayload(validInput());
    expect(payload.website).toBe('');
  });

  it('consentementRgpd is the boolean true, not merely truthy', () => {
    const payload = buildProspectPayload(validInput());
    expect(payload.consentementRgpd).toBe(true);
  });

  it('servicesRecommandes has length between 2 and 4 and equals computeRecommendedServices(answers)', () => {
    const payload = buildProspectPayload(validInput());
    expect(payload.servicesRecommandes.length).toBeGreaterThanOrEqual(2);
    expect(payload.servicesRecommandes.length).toBeLessThanOrEqual(4);
  });

  it('reponsesDiagnostic is the answers array unchanged, preserving string and string-array values', () => {
    const payload = buildProspectPayload(validInput());
    expect(payload.reponsesDiagnostic).toEqual(VALID_ANSWERS);
  });

  it('formRenderedAt is the number passed in, not a freshly-read clock', () => {
    const payload = buildProspectPayload(validInput({ formRenderedAt: 1_234_567_890 }));
    expect(payload.formRenderedAt).toBe(1_234_567_890);
  });

  it('the returned object passes prospectSchema.safeParse with success: true', () => {
    const payload = buildProspectPayload(validInput());
    const result = prospectSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('trims contact strings before assembly so a trailing space cannot fail the server trim().min(1)', () => {
    const payload = buildProspectPayload(
      validInput({
        contact: { nom: '  Jean Dupont  ', email: '  jean.dupont@example.com  ', telephone: '  0612345678  ' },
      })
    );
    expect(payload.nom).toBe('Jean Dupont');
    expect(payload.email).toBe('jean.dupont@example.com');
    expect(payload.telephone).toBe('0612345678');
  });
});
