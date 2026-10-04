import { describe, expect, it } from 'vitest';
import { acceptanceAnswersSchema, summarizeAnswers } from './acceptance';

const ok = (index: number) => ({ index, status: 'delivered' as const });

describe('acceptanceAnswersSchema', () => {
  const schema = acceptanceAnswersSchema(3);

  it('accepte 3 réponses indexées 1..3', () => {
    expect(schema.safeParse([ok(1), ok(2), ok(3)]).success).toBe(true);
  });

  it('rejette index manquant, doublon, 0, 4, statut inconnu', () => {
    expect(schema.safeParse([ok(1), ok(2)]).success).toBe(false);
    expect(schema.safeParse([ok(1), ok(1), ok(3)]).success).toBe(false);
    expect(schema.safeParse([ok(0), ok(2), ok(3)]).success).toBe(false);
    expect(schema.safeParse([ok(1), ok(2), ok(4)]).success).toBe(false);
    expect(schema.safeParse([ok(1), ok(2), { index: 3, status: 'maybe' }]).success).toBe(false);
  });

  it('note obligatoire (3..1000) pour reserved et refused', () => {
    for (const status of ['reserved', 'refused'] as const) {
      const base = [ok(1), ok(2)];
      expect(schema.safeParse([...base, { index: 3, status }]).success).toBe(false);
      expect(schema.safeParse([...base, { index: 3, status, note: 'ab' }]).success).toBe(false);
      expect(schema.safeParse([...base, { index: 3, status, note: 'a'.repeat(1001) }]).success).toBe(false);
      expect(schema.safeParse([...base, { index: 3, status, note: 'abc' }]).success).toBe(true);
      expect(schema.safeParse([...base, { index: 3, status, note: 'a'.repeat(1000) }]).success).toBe(true);
    }
  });

  it('delivered avec note rejeté', () => {
    expect(schema.safeParse([ok(1), ok(2), { index: 3, status: 'delivered', note: 'abc' }]).success).toBe(false);
  });
});

describe('summarizeAnswers', () => {
  it('compte par statut', () => {
    expect(
      summarizeAnswers([
        ok(1),
        { index: 2, status: 'reserved', note: 'abc' },
        { index: 3, status: 'refused', note: 'abc' },
        ok(4),
      ]),
    ).toEqual({ delivered: 2, reserved: 1, refused: 1, total: 4 });
  });
});
