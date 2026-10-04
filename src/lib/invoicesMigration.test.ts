import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FILE = new URL('../../supabase/migrations/20261007000000_sv_invoices.sql', import.meta.url);

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

const PREVIOUS = [
  'client_invited',
  'step_changed',
  'onboarding_completed',
  'document_issued',
  'document_signed',
  'document_signed_admin',
  'acceptance_refused',
];
const NEW_EVENTS = [
  'payment_requested',
  'payment_received',
  'payment_reminder',
  'payment_reminder_admin',
  'payment_anomaly_admin',
  'credit_note_issued',
];
const TABLES = ['sv_invoices', 'sv_invoice_lines', 'sv_invoice_deductions', 'sv_invoice_pdfs'];

describe('phase 15 invoices migration static checks (tables, immutability, lists)', () => {
  it('outbox event list is the seven previous values plus the six payment events', () => {
    expect(constraintList('sv_mail_outbox_event_type_check', 'event_type')).toEqual([...PREVIOUS, ...NEW_EVENTS]);
  });

  it('outbox template list is the previous templates plus the six payment templates', () => {
    const templates = ['invite', ...PREVIOUS.slice(1), ...NEW_EVENTS];
    expect(constraintList('sv_mail_outbox_template_check', 'template')).toEqual(templates);
  });

  it('every invoice table has both deny_mutation triggers', () => {
    for (const t of TABLES) {
      expect(sql).toMatch(new RegExp(`before\\s+update\\s+or\\s+delete\\s+on\\s+public\\.${t}\\b[^;]*deny_mutation`, 'i'));
      expect(sql).toMatch(new RegExp(`before\\s+truncate\\s+on\\s+public\\.${t}\\b[^;]*deny_mutation`, 'i'));
    }
  });

  it('service_role never gets insert, update or delete on invoice tables, counters have no grant', () => {
    for (const g of sql.matchAll(/grant\s+([^;]*?)\s+on\s+public\.(sv_invoice\w*)\s+to\s+([^;]*);/gi)) {
      expect(g[2]).not.toBe('sv_invoice_counters');
      expect(g[1]).not.toMatch(/\b(insert|update|delete|all|truncate)\b/i);
    }
    expect(sql).not.toMatch(/grant\s+[^;]*\bon\s+public\.sv_invoice_counters/i);
  });

  it('no sequence object and no cascading foreign key', () => {
    expect(sql).not.toMatch(/create\s+sequence/i);
    expect(sql).not.toMatch(/on\s+delete\s+(cascade|set\s+null)/i);
    expect(sql).not.toMatch(/references\s+auth\.users/i);
  });

  it('client column grant hides snapshot, created_by and storage_path', () => {
    const inv = sql.match(/grant\s+select\s*\(([^)]*)\)\s+on\s+public\.sv_invoices\s+to\s+authenticated/i);
    expect(inv).not.toBeNull();
    expect((inv as RegExpMatchArray)[1]).not.toMatch(/\bsnapshot\b|\bcreated_by\b/);
    const pdf = sql.match(/grant\s+select\s*\(([^)]*)\)\s+on\s+public\.sv_invoice_pdfs\s+to\s+authenticated/i);
    expect(pdf).not.toBeNull();
    expect((pdf as RegExpMatchArray)[1]).not.toMatch(/storage_path/);
  });
});

describe('phase 15 invoices migration static checks (RPCs)', () => {
  it('every new public function is revoked from the API roles and granted to service_role only', () => {
    const fns = [...sql.matchAll(/create\s+or\s+replace\s+function\s+public\.(sv_\w+)\s*\(/gi)].map((m) => m[1]);
    expect(fns.sort()).toEqual(['sv_attach_invoice_pdf', 'sv_issue_credit_note', 'sv_issue_invoice']);
    for (const fn of fns) {
      expect(sql).toMatch(
        new RegExp(`revoke\\s+all\\s+on\\s+function\\s+public\\.${fn}\\s*\\([^)]*\\)\\s+from\\s+public\\s*,\\s*anon\\s*,\\s*authenticated`, 'i'),
      );
      expect(sql).toMatch(new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${fn}\\s*\\([^)]*\\)\\s+to\\s+service_role`, 'i'));
      expect(sql).not.toMatch(
        new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${fn}\\s*\\([^)]*\\)\\s+to\\s+[^;]*(authenticated|anon)`, 'i'),
      );
    }
  });

  it('clock-injected variants are not granted to any API role', () => {
    for (const fn of ['issue_invoice_at', 'issue_credit_note_at', 'next_invoice_seq']) {
      expect(sql).toMatch(
        new RegExp(`revoke\\s+all\\s+on\\s+function\\s+sv_private\\.${fn}\\s*\\([^)]*\\)\\s+from\\s+public\\s*,\\s*anon\\s*,\\s*authenticated\\s*,\\s*service_role`, 'i'),
      );
      expect(sql).not.toMatch(new RegExp(`grant\\s+execute\\s+on\\s+function\\s+sv_private\\.${fn}`, 'i'));
    }
  });

  it('numbers come from next_invoice_seq in the issuing bodies, with Paris time', () => {
    for (const name of ['sv_private.issue_invoice_at', 'sv_private.issue_credit_note_at']) {
      const body = fnBody(name);
      expect(body).toContain('next_invoice_seq(');
      expect(body).toContain('Europe/Paris');
    }
  });

  it('issue_invoice_at checks nothing-to-pay before touching the counter and schedules reminders', () => {
    const body = fnBody('sv_private.issue_invoice_at');
    expect(body.indexOf('sv_invoice_nothing_to_pay')).toBeGreaterThan(-1);
    expect(body.indexOf('sv_invoice_nothing_to_pay')).toBeLessThan(body.indexOf('next_invoice_seq('));
    for (const interval of ["'3 days'", "'7 days'", "'14 days'"]) {
      expect(body).toContain(interval);
    }
    expect(body).toContain('has_effective_fact(');
    for (const code of ['sv_invoice_contract_not_signed', 'sv_invoice_acceptance_not_signed', 'sv_invoice_line_mismatch', 'sv_invoice_total_mismatch']) {
      expect(body).toContain(code);
    }
  });

  it('issue_credit_note_at locks the origin and enforces the credit cap', () => {
    const body = fnBody('sv_private.issue_credit_note_at');
    expect(body).toMatch(/for\s+update/i);
    for (const code of ['sv_cannot_credit_credit_note', 'sv_credit_reason_invalid', 'sv_credit_exceeds_invoice']) {
      expect(body).toContain(code);
    }
    expect(body).toContain("'skipped'");
  });

  it('sv_attach_invoice_pdf pins the storage path and refuses a different hash', () => {
    const body = fnBody('public.sv_attach_invoice_pdf');
    expect(body).toContain("'/invoices/'");
    expect(body).toContain('sv_pdf_path_invalid');
    expect(body).toContain('sv_pdf_already_attached');
  });
});
