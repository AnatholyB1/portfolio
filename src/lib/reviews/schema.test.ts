import { describe, expect, it } from 'vitest';
import { composeDisplayName, DISPLAY_MODES, REVIEW_FIELD_ERRORS, reviewSubmissionSchema } from './schema';

const BODY = 'Un travail soigné et un suivi clair.'; // > 20 chars

function base(over: Record<string, unknown> = {}) {
  return {
    token: 'abc_DEF-123',
    rating: 3,
    body: BODY,
    displayMode: 'first_company',
    firstName: 'Marie',
    consent: true,
    ...over,
  };
}

function codes(input: unknown): string[] {
  const r = reviewSubmissionSchema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => i.message);
}

describe('reviewSubmissionSchema valid input', () => {
  it('parses a minimal valid submission', () => {
    const r = reviewSubmissionSchema.safeParse(base());
    expect(r.success).toBe(true);
  });
  it('turns an empty title into undefined', () => {
    const r = reviewSubmissionSchema.safeParse(base({ title: '   ' }));
    expect(r.success && r.data.title).toBeUndefined();
  });
  it('defaults displayMode to first_company', () => {
    const { displayMode: _d, ...rest } = base();
    const r = reviewSubmissionSchema.safeParse(rest);
    expect(r.success && r.data.displayMode).toBe('first_company');
  });
  it('allows newlines in the body', () => {
    expect(codes(base({ body: `${BODY}\nSecond paragraphe.` }))).toEqual([]);
  });
});

describe('rating', () => {
  it.each([0, 6, 2.5, undefined])('rejects %s with code rating', (rating) => {
    expect(codes(base({ rating }))).toContain('rating');
  });
});

describe('body', () => {
  it('rejects 19 trimmed chars', () => {
    expect(codes(base({ body: `  ${'a'.repeat(19)}  ` }))).toContain('body_short');
  });
  it('rejects 2001 chars', () => {
    expect(codes(base({ body: 'a'.repeat(2001) }))).toContain('body_long');
  });
  it.each(['<b>', 'a > b', 'http://x.fr', 'HTTPS://x.fr', 'WWW.x.fr', 'voir www.x.fr'])(
    'rejects markup or link in body: %s',
    (frag) => {
      expect(codes(base({ body: `${BODY} ${frag}` }))).toContain('markup_or_link');
    },
  );
  it('rejects a control character', () => {
    expect(codes(base({ body: `${BODY}\u0007` }))).toContain('markup_or_link');
  });
  it('rejects markup in the title', () => {
    expect(codes(base({ title: 'Top <b>' }))).toContain('markup_or_link');
    expect(codes(base({ title: 'voir www.x.fr' }))).toContain('markup_or_link');
  });
  it('rejects a title over 100 chars', () => {
    expect(codes(base({ title: 'a'.repeat(101) }))).toContain('title_long');
  });
  it('does no opinion filtering (1-star negative and 5-star positive)', () => {
    const neg = 'Franchement nul, je suis déçu, le résultat est mauvais.';
    const pos = 'Excellent, résultat parfait, je recommande vivement.';
    expect(codes(base({ rating: 1, body: neg }))).toEqual([]);
    expect(codes(base({ rating: 5, body: pos }))).toEqual([]);
  });
});

describe('consent', () => {
  it('requires consent true', () => {
    expect(codes(base({ consent: false }))).toContain('consent');
    expect(codes(base({ consent: undefined }))).toContain('consent');
  });
});

describe('display mode fields', () => {
  it('first_initial needs a single-letter initial', () => {
    expect(codes(base({ displayMode: 'first_initial' }))).toContain('initial');
    expect(codes(base({ displayMode: 'first_initial', lastInitial: 'ab' }))).toContain('initial');
    expect(codes(base({ displayMode: 'first_initial', lastInitial: '1' }))).toContain('initial');
    expect(codes(base({ displayMode: 'first_initial', lastInitial: '<' }))).toContain('initial');
    expect(codes(base({ displayMode: 'first_initial', lastInitial: 'é' }))).toEqual([]);
  });
  it('person modes need a first name', () => {
    expect(codes(base({ firstName: undefined }))).toContain('first_name');
    expect(codes(base({ firstName: '  ' }))).toContain('first_name');
    expect(codes(base({ displayMode: 'first_initial', firstName: '', lastInitial: 'D' }))).toContain('first_name');
  });
  it('company_only needs no first name', () => {
    expect(codes(base({ displayMode: 'company_only', firstName: undefined }))).toEqual([]);
  });
  it('bounds the first name to 40 chars', () => {
    expect(codes(base({ firstName: 'a'.repeat(41) }))).toContain('first_name');
    expect(codes(base({ firstName: 'a'.repeat(40) }))).toEqual([]);
  });
  it.each(['<b>Marie', 'Marie http://x', 'www.x.fr', 'Ma\u0007rie'])('rejects first name %j', (firstName) => {
    expect(codes(base({ firstName }))).toContain('markup_or_link');
  });
});

describe('REVIEW_FIELD_ERRORS', () => {
  it('maps every code to French copy', () => {
    expect(REVIEW_FIELD_ERRORS.rating).toBe('Choisissez une note de 1 à 5.');
    expect(REVIEW_FIELD_ERRORS.body_short).toBe('Votre avis doit faire au moins 20 caractères.');
    expect(REVIEW_FIELD_ERRORS.consent).toBe('Cochez la case pour que votre avis puisse être publié.');
    expect(REVIEW_FIELD_ERRORS.markup_or_link).toContain('Les liens et le balisage');
  });
});

describe('composeDisplayName', () => {
  it('first_company', () => {
    expect(composeDisplayName('first_company', 'Marie', '', 'Café Dupont')).toBe('Marie, Café Dupont');
  });
  it('first_initial uppercases the initial', () => {
    expect(composeDisplayName('first_initial', 'Marie', 'd', 'X')).toBe('Marie D.');
  });
  it('company_only', () => {
    expect(composeDisplayName('company_only', '', '', 'Café Dupont')).toBe('Café Dupont');
  });
  it('exposes the three modes', () => {
    expect([...DISPLAY_MODES]).toEqual(['first_company', 'first_initial', 'company_only']);
  });
});
