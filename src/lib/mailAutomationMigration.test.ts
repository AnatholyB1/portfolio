import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const NAME = '20261008000000_sv_mail_automation.sql';
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

const TABLES = ['sv_resend_events', 'sv_mail_suppressions', 'sv_mail_suppression_lifts', 'sv_reminder_holds'];
const RPCS: [string, string][] = [
  ['public.sv_mail_block_scope', 'text'],
  ['public.sv_apply_resend_event', 'text, text, text[], text, text'],
  ['public.sv_record_unsubscribe', 'text, text, text'],
  ['public.sv_lift_suppression', 'bigint, text, uuid'],
  ['public.sv_set_reminder_hold', 'uuid, text, uuid'],
];
const NEW_VALUES = ['document_reminder', 'document_reminder_admin', 'review_request', 'mail_suppression_admin'];

describe('phase 16 mail automation migration static checks', () => {
  it('both outbox lists hold 17 values including the four new ones', () => {
    for (const col of ['event_type', 'template']) {
      const m = sql.match(new RegExp(`sv_mail_outbox_${col}_check check \\(${col} in \\(([^)]*)\\)`, 'i'));
      expect(m).not.toBeNull();
      const values = quoted((m as RegExpMatchArray)[1]);
      expect(values).toHaveLength(17);
      for (const v of [...NEW_VALUES, 'credit_note_issued']) expect(values).toContain(v);
    }
  });

  it('never drops an outbox constraint by a hard-coded name', () => {
    expect(sql).not.toMatch(/drop\s+constraint\s+sv_mail_outbox/i);
    expect(sql).toMatch(/pg_get_constraintdef/i);
  });

  it('every new table has RLS, revoke and both deny triggers', () => {
    for (const t of TABLES) {
      expect(sql).toMatch(new RegExp(`alter\\s+table\\s+public\\.${t}\\s+enable\\s+row\\s+level\\s+security`, 'i'));
      expect(sql).toMatch(
        new RegExp(`revoke\\s+all\\s+on\\s+public\\.${t}\\s+from\\s+anon\\s*,\\s*authenticated\\s*,\\s*service_role`, 'i'),
      );
      expect(sql).toMatch(
        new RegExp(`before\\s+update\\s+or\\s+delete\\s+on\\s+public\\.${t}\\b[^;]*deny_mutation`, 'i'),
      );
      expect(sql).toMatch(new RegExp(`before\\s+truncate\\s+on\\s+public\\.${t}\\b[^;]*deny_mutation`, 'i'));
    }
    expect((sql.match(/create\s+table\s+if\s+not\s+exists\s+public\.sv_/gi) ?? []).length).toBe(4);
  });

  it('no insert, update or delete grant on any new table', () => {
    for (const g of sql.matchAll(/grant\s+([^;]*?)\s+on\s+([^;]*?)\s+to\s+([^;]*);/gi)) {
      if (TABLES.some((t) => g[2].includes(`public.${t}`))) {
        expect(g[1]).not.toMatch(/\b(insert|update|delete|all|truncate)\b/i);
      }
    }
    expect(sql).not.toMatch(/sv_resend_events\s+to\s+authenticated/i);
  });

  it('each public RPC is security definer, pins search_path and is service_role only', () => {
    for (const [name, args] of RPCS) {
      const body = fnBody(name);
      expect(body).toMatch(/security\s+definer/i);
      expect(body).toMatch(/set\s+search_path\s*=\s*''/i);
      const esc = (name + '(' + args + ')').replace(/[.()[\]]/g, '\\$&');
      expect(sql).toMatch(new RegExp(`revoke\\s+all\\s+on\\s+function\\s+${esc}\\s+from\\s+public\\s*,\\s*anon\\s*,\\s*authenticated`, 'i'));
      expect(sql).toMatch(new RegExp(`grant\\s+execute\\s+on\\s+function\\s+${esc}\\s+to\\s+service_role;`, 'i'));
    }
    expect(sql).not.toMatch(/grant\s+execute[^;]*\bto\s+[^;]*\b(anon|authenticated)\b/i);
  });

  it('sv_apply_resend_event is idempotent and only reacts to permanent bounces and complaints', () => {
    const body = fnBody('public.sv_apply_resend_event');
    expect(body).toMatch(/on conflict \(event_id\) do nothing/i);
    expect(body).toContain("'Permanent'");
    expect(body).toContain("'duplicate'");
  });

  it('sv_set_reminder_hold skips only sweep-driven reminders', () => {
    const body = fnBody('public.sv_set_reminder_hold');
    const m = body.match(/event_type\s+in\s*\(([^)]*)\)/i);
    expect(m).not.toBeNull();
    expect(quoted((m as RegExpMatchArray)[1])).toEqual([
      'document_reminder',
      'document_reminder_admin',
      'review_request',
    ]);
    expect(body).not.toContain('payment_reminder');
  });

  it('block scope honours lifts and the alert dedupe key is per suppression', () => {
    expect(fnBody('public.sv_mail_block_scope')).toContain('sv_mail_suppression_lifts');
    expect(sql).toContain("'mail_suppression_admin:' || p_suppression_id::text");
  });
});
