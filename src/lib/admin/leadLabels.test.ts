import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ERASE_REASONS, LOST_REASONS, STATUS_ORDER } from './leadLabels';
import { correctionSchema, costSchema } from './leadSchemas';

const sql = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261003000000_sv_leads_core.sql'),
  'utf8',
);

function list(re: RegExp): string[] {
  const m = sql.match(re);
  if (!m) throw new Error('list not found');
  return [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
}

describe('closed lists match the migration', () => {
  it('statuses', () => {
    expect([...STATUS_ORDER]).toEqual(list(/check \(status in \(([^)]*)\)/));
  });
  it('lost reasons', () => {
    expect(LOST_REASONS.map((r) => r.code)).toEqual(list(/check \(lost_reason in \(([^)]*)\)/));
  });
  it('erase reasons', () => {
    expect(ERASE_REASONS.map((r) => r.code)).toEqual(
      list(/p_reason_code not in \(([^)]*)\)/),
    );
  });
});

describe('costSchema', () => {
  const base = { source: 'google', campaign: 'brand', month: '2026-10' };
  it('converts 12,50 to 1250 cents and month to first day', () => {
    const r = costSchema.parse({ ...base, amount: '12,50' });
    expect(r.cents).toBe(1250);
    expect(r.month).toBe('2026-10-01');
  });
  it('rejects zero and 3 decimals', () => {
    expect(costSchema.safeParse({ ...base, amount: '0' }).success).toBe(false);
    expect(costSchema.safeParse({ ...base, amount: '1.234' }).success).toBe(false);
  });
});

describe('correctionSchema', () => {
  const base = {
    leadId: '11111111-1111-4111-8111-111111111111',
    source: 'google',
    medium: 'cpc',
    campaign: '',
  };
  it('rejects 9-char reason, accepts 10', () => {
    expect(correctionSchema.safeParse({ ...base, reason: '123456789' }).success).toBe(false);
    expect(correctionSchema.safeParse({ ...base, reason: '1234567890' }).success).toBe(true);
  });
});
