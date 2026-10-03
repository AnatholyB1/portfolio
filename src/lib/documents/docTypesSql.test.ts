import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FACT_TYPES } from '@/lib/projects/steps';
import { SIGNING_FACT } from './steps';
import { ISSUABLE_DOC_TYPES } from './types';

const FILE = join(process.cwd(), 'supabase/migrations/20261005000000_sv_documents.sql');

function stripComments(sql: string): string {
  return sql
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
}

const sql = stripComments(readFileSync(FILE, 'utf8'));

function closedList(column: string): string[] {
  const re = new RegExp(`${column}\\s+text\\s+not\\s+null\\s+check\\s*\\(\\s*${column}\\s+in\\s*\\(([^)]*)\\)`, 'i');
  const m = sql.match(re);
  expect(m).not.toBeNull();
  return [...(m as RegExpMatchArray)[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

describe('documents SQL closed lists', () => {
  it('doc_type check list equals ISSUABLE_DOC_TYPES', () => {
    const list = closedList('doc_type');
    expect(new Set(list)).toEqual(new Set(ISSUABLE_DOC_TYPES));
    expect(list).toHaveLength(ISSUABLE_DOC_TYPES.length);
  });

  it('every signing fact is a known fact type', () => {
    for (const fact of Object.values(SIGNING_FACT)) {
      expect(FACT_TYPES).toContain(fact);
    }
  });
});
