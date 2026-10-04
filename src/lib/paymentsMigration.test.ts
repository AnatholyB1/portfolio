import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const NAME = '20261007010000_sv_payments.sql';
const FILE = new URL(`../../supabase/migrations/${NAME}`, import.meta.url);

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

/** Body of one function, from its create statement to the next create function or end of file. */
function fnBody(name: string): string {
  const starts = [...sql.matchAll(/create\s+or\s+replace\s+function\s+([\w.]+)\s*\(/gi)];
  const i = starts.findIndex((m) => m[1] === name);
  expect(i).toBeGreaterThanOrEqual(0);
  const from = starts[i].index ?? 0;
  const to = i + 1 < starts.length ? (starts[i + 1].index ?? sql.length) : sql.length;
  return sql.slice(from, to);
}

const LEDGER_KINDS = [
  'processing',
  'paid',
  'failed',
  'expired',
  'partially_funded',
  'refund_requested',
  'refunded',
  'refund_failed',
  'anomaly',
];
const DETAIL_CODES = [
  'amount_mismatch',
  'currency_mismatch',
  'livemode_mismatch',
  'unknown_invoice',
  'credited_invoice',
  'duplicate_payment',
  'partially_funded',
  'unreconciled_funds',
  'refund_failed',
];

describe('phase 15 payments migration static checks (tables)', () => {
  it('sorts after the invoices migration', () => {
    const files = readdirSync(new URL('../../supabase/migrations/', import.meta.url)).sort();
    expect(files.indexOf(NAME)).toBeGreaterThan(files.indexOf('20261007000000_sv_invoices.sql'));
    expect(files.indexOf('20261007000000_sv_invoices.sql')).toBeGreaterThanOrEqual(0);
  });

  it('ledger kind and detail CHECK lists are the closed lists', () => {
    const table = sql.match(/create\s+table\s+if\s+not\s+exists\s+public\.sv_invoice_payment_events[\s\S]*?\n\);/i);
    expect(table).not.toBeNull();
    const body = (table as RegExpMatchArray)[0];
    const kind = body.match(/kind\s+text\s+not\s+null\s+check\s*\(\s*kind\s+in\s*\(([^)]*)\)/i);
    expect(quoted((kind as RegExpMatchArray)[1])).toEqual(LEDGER_KINDS);
    const detail = body.match(/detail\s+text\s+null\s+check\s*\(\s*detail\s+in\s*\(([^)]*)\)/i);
    expect(quoted((detail as RegExpMatchArray)[1])).toEqual(DETAIL_CODES);
    expect(body).toMatch(/check\s*\(\s*invoice_id\s+is\s+not\s+null\s+or\s+client_id\s+is\s+not\s+null\s*\)/i);
  });

  it('sv_stripe_events is never granted to authenticated', () => {
    for (const g of sql.matchAll(/grant\s+[^;]*?\bon\s+public\.sv_stripe_events\s+to\s+([^;]*);/gi)) {
      expect(g[1]).not.toMatch(/authenticated|anon/i);
    }
    expect(sql).not.toMatch(/sv_stripe_events\s+to\s+authenticated/i);
  });

  it('ledger client grant is limited to kind, amount, method and date', () => {
    const g = sql.match(/grant\s+select\s*\(([^)]*)\)\s+on\s+public\.sv_invoice_payment_events\s+to\s+authenticated/i);
    expect(g).not.toBeNull();
    const cols = (g as RegExpMatchArray)[1].split(',').map((c) => c.trim());
    expect(cols).toEqual(['id', 'invoice_id', 'kind', 'amount_cents', 'method', 'occurred_at']);
  });

  it('no cascading foreign key and no auth.users reference', () => {
    expect(sql).not.toMatch(/on\s+delete\s+(cascade|set\s+null)/i);
    expect(sql).not.toMatch(/references\s+auth\.users/i);
  });

  it('service_role never gets update or delete on payment tables', () => {
    for (const g of sql.matchAll(/grant\s+([^;]*?)\s+on\s+public\.(sv_\w+)\s+to\s+service_role;/gi)) {
      expect(g[1]).not.toMatch(/\b(update|delete|all|truncate)\b/i);
    }
  });

  it('only processed_at may change on an unprocessed event', () => {
    const body = fnBody('sv_private.guard_stripe_event_update');
    expect(body).toContain('sv_stripe_event_immutable');
    expect(body).toContain('old.processed_at is null');
    expect(body).toContain('new.processed_at is not null');
  });
});

describe('phase 15 payments migration static checks (RPCs)', () => {
  it('every public function is revoked from API roles and granted to service_role only', () => {
    const fns = [...sql.matchAll(/create\s+or\s+replace\s+function\s+public\.(sv_\w+)\s*\(/gi)].map((m) => m[1]);
    expect(fns.sort()).toEqual(['sv_apply_stripe_event', 'sv_record_checkout_session', 'sv_record_refund_request']);
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

  it('private helpers are revoked from every API role', () => {
    for (const fn of ['invoice_credited_cents', 'invoice_has_kind', 'invoice_is_processing', 'guard_stripe_event_update']) {
      expect(sql).toMatch(
        new RegExp(`revoke\\s+all\\s+on\\s+function\\s+sv_private\\.${fn}\\s*\\([^)]*\\)\\s+from\\s+public\\s*,\\s*anon\\s*,\\s*authenticated\\s*,\\s*service_role`, 'i'),
      );
    }
  });

  it('sv_apply_stripe_event is atomic, idempotent and posts the right facts', () => {
    const body = fnBody('public.sv_apply_stripe_event');
    for (const needle of [
      'sv_post_project_fact(',
      "'deposit_received'",
      "'balance_received'",
      "'skipped'",
      'processed_at',
      'for update',
      "'Paiement Stripe '",
      'payment_received',
      'payment_anomaly_admin',
    ]) {
      expect(body).toContain(needle);
    }
    // processed_at is written after the ledger insert and the outbox work
    expect(body.lastIndexOf('processed_at = now()')).toBeGreaterThan(body.indexOf('insert into public.sv_invoice_payment_events'));
  });

  it('business mismatches are anomalies, never exceptions', () => {
    const body = fnBody('public.sv_apply_stripe_event');
    expect(body).not.toContain("raise exception 'sv_amount");
    for (const code of DETAIL_CODES.filter((c) => c !== 'refund_failed' && c !== 'partially_funded')) {
      expect(body).toContain(`'${code}'`);
    }
  });

  it('the unresolved branch returns before the ledger insert', () => {
    const body = fnBody('public.sv_apply_stripe_event');
    expect(body).toContain("'ignored_unresolved'");
    expect(body.indexOf("'ignored_unresolved'")).toBeLessThan(body.indexOf('insert into public.sv_invoice_payment_events'));
  });

  it('checkout session guards cover amount, in-progress, livemode and payability', () => {
    const body = fnBody('public.sv_record_checkout_session');
    for (const code of [
      'sv_invoice_not_found',
      'sv_invoice_not_payable',
      'sv_checkout_amount_mismatch',
      'sv_client_payment_in_progress',
      'sv_checkout_livemode_invalid',
    ]) {
      expect(body).toContain(code);
    }
    expect(body).toMatch(/for\s+update/i);
  });

  it('refund request requires a requested credit note on a paid origin', () => {
    const body = fnBody('public.sv_record_refund_request');
    for (const code of ['sv_refund_not_requested', 'sv_refund_origin_unpaid', 'sv_refund_amount_invalid']) {
      expect(body).toContain(code);
    }
  });
});
