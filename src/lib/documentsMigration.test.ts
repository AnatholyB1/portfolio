import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FILE = new URL('../../supabase/migrations/20261005000000_sv_documents.sql', import.meta.url);

function stripComments(sql: string): string {
  return sql
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
}

const sql = stripComments(readFileSync(FILE, 'utf8'));

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

function tableDef(table: string): string {
  const m = sql.match(new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${table}\\s*\\(([\\s\\S]*?)\\n\\);`, 'i'));
  expect(m).not.toBeNull();
  return (m as RegExpMatchArray)[1];
}

describe('phase 13 migration static checks (sv_documents)', () => {
  it('doc_type accepts exactly quote, contract, spec, acceptance (no invoice, D-10)', () => {
    expect(closedList('doc_type')).toEqual(['quote', 'contract', 'spec', 'acceptance']);
    expect(sql).not.toMatch(/'invoice'/i);
  });

  it('outbox closed lists gain document_issued', () => {
    expect(constraintList('sv_mail_outbox_event_type_check', 'event_type')).toEqual([
      'client_invited',
      'step_changed',
      'onboarding_completed',
      'document_issued',
    ]);
    expect(constraintList('sv_mail_outbox_template_check', 'template')).toEqual([
      'invite',
      'step_changed',
      'onboarding_completed',
      'document_issued',
    ]);
  });

  it('no storage objects policy, no current_step, no cascade or set null', () => {
    expect(sql).not.toMatch(/storage\.objects/i);
    expect(sql).not.toMatch(/current_step/i);
    expect(sql).not.toMatch(/on\s+delete\s+(cascade|set\s+null)/i);
  });

  it('neither new table has a status column (chain, not state)', () => {
    for (const t of ['sv_project_documents', 'sv_document_snapshots']) {
      expect(tableDef(t)).not.toMatch(/^\s*status\s/im);
    }
  });

  it('private bucket sv-documents: not public, 10 MB, pdf only', () => {
    const m = sql.match(/insert\s+into\s+storage\.buckets[\s\S]*?;/i);
    expect(m).not.toBeNull();
    const stmt = (m as RegExpMatchArray)[0];
    expect(stmt).toContain("'sv-documents'");
    expect(stmt).toMatch(/,\s*false\s*,/);
    expect(stmt).toContain('10485760');
    expect(stmt).toContain("array['application/pdf']");
  });

  it('both partial unique indexes exist (single root, replaced once)', () => {
    expect(sql).toMatch(/where\s+replaces_document_id\s+is\s+null/i);
    expect(sql).toMatch(/where\s+replaces_document_id\s+is\s+not\s+null/i);
    expect(sql).toMatch(/unique\s+\(project_id,\s*doc_type,\s*revision\)/i);
  });

  it('authenticated column grant lists sha256 but never storage_path', () => {
    const m = sql.match(/grant\s+select\s*\(([^)]*)\)\s+on\s+public\.sv_project_documents\s+to\s+authenticated/i);
    expect(m).not.toBeNull();
    const cols = (m as RegExpMatchArray)[1];
    expect(cols).toMatch(/\bsha256\b/);
    expect(cols).not.toMatch(/storage_path/);
  });

  it('no update grant on either table; service_role gets select, insert only', () => {
    expect(sql).not.toMatch(/grant\s+[^;]*\bupdate\b[^;]*\bon\s+public\.sv_(project_documents|document_snapshots)/i);
    for (const t of ['sv_project_documents', 'sv_document_snapshots']) {
      expect(sql).toMatch(new RegExp(`grant\\s+select,\\s*insert\\s+on\\s+public\\.${t}\\s+to\\s+service_role`, 'i'));
    }
  });

  it('append-only triggers on both tables', () => {
    for (const t of ['sv_project_documents', 'sv_document_snapshots']) {
      expect(sql).toMatch(new RegExp(`before\\s+update\\s+or\\s+delete\\s+on\\s+public\\.${t}[^;]*deny_mutation`, 'i'));
      expect(sql).toMatch(new RegExp(`before\\s+truncate\\s+on\\s+public\\.${t}[^;]*deny_mutation`, 'i'));
    }
  });

  it('snapshot read policy is admin only', () => {
    const m = sql.match(/create\s+policy\s+sv_document_snapshots_admin_read[\s\S]*?;/i);
    expect(m).not.toBeNull();
    const policy = (m as RegExpMatchArray)[0];
    expect(policy).toContain('sv_private.is_admin()');
    expect(policy).not.toMatch(/project_ids|client_ids/);
  });

  it('every public sv_ function is service_role only with a pinned search_path', () => {
    const fns = [...sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+public\.(sv_\w+)\s*\(/gi)].map((m) => m[1]);
    expect(fns).toContain('sv_issue_document');
    for (const fn of fns) {
      expect(sql).toMatch(new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${fn}\\s*\\([^)]*\\)\\s+to\\s+service_role`, 'i'));
      expect(sql).not.toMatch(new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${fn}\\s*\\([^)]*\\)\\s+to\\s+[^;]*(authenticated|anon)`, 'i'));
    }
    expect(sql).toMatch(/set\s+search_path\s*=\s*''/i);
  });

  it('sv_issue_document locks, dedupes mail and raises the five error codes', () => {
    expect(sql).toMatch(/for\s+update/i);
    expect(sql).toMatch(/on\s+conflict\s*\(dedupe_key\)\s+do\s+nothing/i);
    expect(sql).toContain("'document_issued:'");
    expect(sql).toContain('lower(');
    for (const code of [
      'sv_project_not_found',
      'sv_document_already_issued',
      'sv_document_replaces_mismatch',
      'sv_document_revision_mismatch',
      'sv_document_path_mismatch',
    ]) {
      expect(sql).toContain(code);
    }
  });

  it('the outbox payload carries no amount-like key (D-04)', () => {
    const m = sql.match(/jsonb_build_object\(\s*'documentLabel'[^;]*?\)\s*,/i);
    expect(m).not.toBeNull();
    expect((m as RegExpMatchArray)[0]).not.toMatch(/amount|price|prix|cents|total/i);
  });
});
