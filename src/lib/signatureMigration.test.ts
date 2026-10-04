import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FILE = new URL('../../supabase/migrations/20261006000000_sv_signature.sql', import.meta.url);

const raw = readFileSync(FILE, 'utf8');

function stripComments(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
}

const sql = stripComments(raw);

function quoted(list: string): string[] {
  return [...list.matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

/** Extracts the list of `<column> text not null check (<column> in (...))`. */
function closedList(column: string): string[] {
  const re = new RegExp(`${column}\\s+text\\s+not\\s+null\\s+check\\s*\\(\\s*${column}\\s+in\\s*\\(([^)]*)\\)`, 'i');
  const m = sql.match(re);
  expect(m).not.toBeNull();
  return quoted((m as RegExpMatchArray)[1]);
}

/** Extracts the list of `add constraint <name> check (<column> in (...))`. */
function constraintList(name: string, column: string): string[] {
  const re = new RegExp(`add\\s+constraint\\s+${name}\\s+check\\s*\\(\\s*${column}\\s+in\\s*\\(([^)]*)\\)`, 'i');
  const m = sql.match(re);
  expect(m).not.toBeNull();
  return quoted((m as RegExpMatchArray)[1]);
}

/** Body of one function, from its create statement to the next create function or end of file. */
function fnBody(name: string): string {
  const starts = [...sql.matchAll(/create\s+or\s+replace\s+function\s+([\w.]+)\s*\(/gi)];
  const i = starts.findIndex((m) => m[1] === name);
  expect(i).toBeGreaterThanOrEqual(0);
  const from = starts[i].index ?? 0;
  const to = i + 1 < starts.length ? (starts[i + 1].index ?? sql.length) : sql.length;
  return sql.slice(from, to);
}

const EVENT_TYPES = [
  'document_opened',
  'acceptance_response',
  'acceptance_refused',
  'consent_given',
  'code_sent',
  'code_send_failed',
  'code_failed',
  'code_locked',
  'code_expired',
  'signed',
  'sealed',
  'seal_downloaded',
];

const TABLES = [
  'sv_signature_events',
  'sv_acceptance_submissions',
  'sv_acceptance_responses',
  'sv_document_signatures',
  'sv_document_seals',
];

describe('phase 14 migration static checks, part 1 (tables, chain, trail RPCs)', () => {
  it('the closed event list equals the 12 values in order', () => {
    expect(closedList('event_type')).toEqual(EVENT_TYPES);
  });

  it('events and seals: service_role may select, never insert', () => {
    for (const t of ['sv_signature_events', 'sv_document_seals']) {
      const grants = [...sql.matchAll(new RegExp(`grant\\s+([^;]*?)\\s+on\\s+public\\.${t}\\s+to\\s+service_role`, 'gi'))];
      expect(grants.length).toBeGreaterThan(0);
      for (const g of grants) {
        expect(g[1]).toMatch(/\bselect\b/i);
        expect(g[1]).not.toMatch(/\b(insert|update|delete|all)\b/i);
      }
    }
  });

  it('every append-only table has both deny_mutation triggers', () => {
    for (const t of TABLES) {
      expect(sql).toMatch(new RegExp(`before\\s+update\\s+or\\s+delete\\s+on\\s+public\\.${t}[^;]*deny_mutation`, 'i'));
      expect(sql).toMatch(new RegExp(`before\\s+truncate\\s+on\\s+public\\.${t}[^;]*deny_mutation`, 'i'));
    }
  });

  it('sv_signature_codes is the only mutable table and has no client grant', () => {
    expect(sql).not.toMatch(/before\s+update\s+or\s+delete\s+on\s+public\.sv_signature_codes/i);
    for (const g of sql.matchAll(/grant\s+[^;]*\bon\s+public\.sv_signature_codes\s+to\s+([^;]*);/gi)) {
      expect(g[1]).not.toMatch(/authenticated|anon/i);
    }
    expect(sql).not.toMatch(/create\s+policy\s+\w+\s+on\s+public\.sv_signature_codes/i);
  });

  it('no storage objects policy, no cascade or set null, no external extension digest', () => {
    expect(sql).not.toMatch(/storage\.objects/i);
    expect(sql).not.toMatch(/on\s+delete\s+(cascade|set\s+null)/i);
    expect(sql).not.toMatch(/pgcrypto|digest\(/i);
  });

  it('the chain is locked per document and hashed with the shared contract', () => {
    expect(sql).toContain("pg_advisory_xact_lock(hashtext('sv_sig_chain')");
    expect(sql).toContain('chr(31)');
    expect(sql).toContain("'sv-genesis:'");
    expect(sql).toMatch(/signature_link_hash\(/);
    expect(fnBody('sv_private.append_signature_event')).toContain('signature_link_hash(');
    expect(fnBody('public.sv_verify_signature_chain')).toContain('signature_link_hash(');
  });

  it('the seals column grant hides storage_path', () => {
    const m = sql.match(/grant\s+select\s*\(([^)]*)\)\s+on\s+public\.sv_document_seals\s+to\s+authenticated/i);
    expect(m).not.toBeNull();
    expect((m as RegExpMatchArray)[1]).not.toMatch(/storage_path/);
  });

  it('the part 1 marker appears exactly once', () => {
    expect(raw.split('fin partie 1 (14-04 Task 1)').length - 1).toBe(1);
  });
});
