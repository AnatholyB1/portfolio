import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { services } from '@/data/services';

const FILE = new URL('../../supabase/migrations/20261004000000_sv_projects_engine.sql', import.meta.url);

function stripComments(sql: string): string {
  return sql
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
}

const sql = stripComments(readFileSync(FILE, 'utf8'));

const FACT_TYPES = [
  'onboarding_completed',
  'quote_accepted',
  'contract_signed',
  'deposit_received',
  'production_completed',
  'acceptance_signed',
  'balance_received',
  'fact_revoked',
];

/** Extracts the quoted list of `<column> text not null check (<column> in (...))`. */
function closedList(column: string): string[] {
  const re = new RegExp(`${column}\\s+text\\s+not\\s+null\\s+check\\s*\\(\\s*${column}\\s+in\\s*\\(([^)]*)\\)`, 'i');
  const m = sql.match(re);
  expect(m).not.toBeNull();
  return [...(m as RegExpMatchArray)[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

describe('phase 12 migration static checks (sv_projects_engine)', () => {
  it('offer check list equals the 9 service slugs', () => {
    const offers = closedList('offer');
    const slugs = services.map((s) => s.slug);
    expect(offers).toHaveLength(9);
    expect(new Set(offers)).toEqual(new Set(slugs));
  });

  it('fact type check list equals the 8 fact types', () => {
    const types = closedList('type');
    expect(new Set(types)).toEqual(new Set(FACT_TYPES));
    expect(types).toHaveLength(8);
  });

  it('never stores a step (no current_step), no storage objects policy, no cascade or set null', () => {
    expect(sql).not.toMatch(/current_step/i);
    expect(sql).not.toMatch(/storage\.objects/i);
    expect(sql).not.toMatch(/on\s+delete\s+(cascade|set\s+null)/i);
  });

  it('mail outbox has a unique dedupe_key and send_after', () => {
    expect(sql).toMatch(/dedupe_key\s+text\s+not\s+null\s+unique/i);
    expect(sql).toMatch(/send_after\s+timestamptz/i);
  });

  it('every public function is granted to service_role only', () => {
    const fns = [...sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+public\.(sv_\w+)\s*\(/gi)].map((m) => m[1]);
    expect(fns.length).toBeGreaterThanOrEqual(5);
    for (const fn of fns) {
      expect(sql).toMatch(new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${fn}\\s*\\([^)]*\\)\\s+to\\s+service_role`, 'i'));
      expect(sql).not.toMatch(new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${fn}\\s*\\([^)]*\\)\\s+to\\s+[^;]*(authenticated|anon)`, 'i'));
    }
  });

  it('sv_convert_lead never changes the lead status', () => {
    expect(sql).not.toMatch(/update\s+public\.sv_leads\s+set\s+status/i);
    expect(sql).toContain('sv_lead_not_convertible');
  });
});
