import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  REMINDER_MAX_AGE_DAYS,
  REVIEW_REQUEST_CADENCE as REVIEW,
  STANDARD_REMINDER_CADENCE as STANDARD,
  parisElapsedDays,
  reminderStage,
} from './cadence';

describe('reminderStage', () => {
  it('standard cadence returns the highest stage reached', () => {
    expect(reminderStage(2, STANDARD.client)).toBeNull();
    expect(reminderStage(3, STANDARD.client)).toBe('d3');
    expect(reminderStage(6, STANDARD.client)).toBe('d3');
    expect(reminderStage(7, STANDARD.client)).toBe('d7');
    expect(reminderStage(30, STANDARD.client)).toBe('d7');
    expect(reminderStage(61, STANDARD.client)).toBeNull();
    expect(REMINDER_MAX_AGE_DAYS).toBe(60);
  });
  it('review cadence is d7 then d21', () => {
    expect(reminderStage(6, REVIEW.client)).toBeNull();
    expect(reminderStage(7, REVIEW.client)).toBe('d7');
    expect(reminderStage(21, REVIEW.client)).toBe('d21');
    expect(reminderStage(40, REVIEW.client)).toBe('d21');
    expect(REVIEW.admin).toBeNull();
  });
  it('no burst after an outage', () => {
    expect(reminderStage(10, STANDARD.client)).toBe('d7');
  });
});

describe('parisElapsedDays', () => {
  it('counts Paris calendar days across the DST change', () => {
    expect(
      parisElapsedDays(new Date('2026-10-24T22:30:00Z'), new Date('2026-10-27T08:00:00Z')),
    ).toBe(2);
  });
  it('is never negative', () => {
    expect(parisElapsedDays(new Date('2026-10-27T08:00:00Z'), new Date('2026-10-20T08:00:00Z'))).toBe(0);
  });
});

describe('SQL deposit parity', () => {
  const sql = readFileSync(
    new URL('../../../../supabase/migrations/20261007000000_sv_invoices.sql', import.meta.url),
    'utf8',
  )
    .split('\n')
    .map((l) => l.replace(/--.*$/, ''))
    .join('\n');
  it('deposit reminders use the 3, 7 and 14 day offsets', () => {
    const start = sql.indexOf("if p_kind = 'deposit' then");
    expect(start).toBeGreaterThan(-1);
    const end = sql.indexOf("return jsonb_build_object", start);
    const block = sql.slice(start, end);
    const days = [...block.matchAll(/p_now \+ interval '(\d+) days'/g)].map((m) => Number(m[1]));
    expect(days.sort((a, b) => a - b)).toEqual([
      ...STANDARD.client.map((s) => s.day),
      STANDARD.admin.day,
    ]);
  });
});
