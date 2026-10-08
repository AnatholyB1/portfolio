// Parite SQL / TS (Pitfall 10) : listes fermees de l'outbox et cles de dedoublonnage.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAIL_EVENTS, MAIL_RULES, dedupeKey } from './rules';

const read = (name: string): string =>
  readFileSync(new URL(`../../../../supabase/migrations/${name}`, import.meta.url), 'utf8')
    .split('\n')
    .map((l) => l.replace(/--.*$/, ''))
    .join('\n');

const invoices = read('20261007000000_sv_invoices.sql');
const payments = read('20261007010000_sv_payments.sql');
const automation = read('20261008000000_sv_mail_automation.sql');
// Les listes fermees les plus recentes vivent dans la migration phase 18.
const latestLists = read('20261010000000_sv_reviews.sql');

function list(sql: string, constraint: string, column: string): string[] {
  const re = new RegExp(`${constraint}\\s+check\\s*\\(\\s*${column}\\s+in\\s*\\(([^)]*)\\)`, 'i');
  const m = re.exec(sql);
  expect(m).not.toBeNull();
  return [...m![1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

/** Normalise une expression SQL de cle en gabarit comparable aux helpers TS. */
function templates(sql: string, prefix: string): string[] {
  const re = new RegExp(`'${prefix}:'[^,]*`, 'g');
  return [...sql.matchAll(re)].map((m) =>
    m[0]
      .replace(/\s+/g, ' ')
      .replace(/(p_id|v_inv\.id|v_origin\.id)::text/g, '{id}')
      .replace(/p_suppression_id::text/g, '{id}')
      .replace(/v_email|v_admin/g, '{email}')
      .replace(/p_event_id/g, '{evt}')
      .replace(/'([^']*)'/g, '$1')
      .replace(/\s*\|\|\s*/g, '')
      .trim(),
  );
}

describe('payments mail SQL/TS parity', () => {
  it('event_type list equals MAIL_EVENTS', () => {
    expect(list(latestLists, 'sv_mail_outbox_event_type_check', 'event_type').sort()).toEqual(
      [...MAIL_EVENTS].sort(),
    );
  });

  it('template list equals invite plus rule templates', () => {
    const t = new Set<string>(['invite', ...Object.values(MAIL_RULES).map((r) => r.template)]);
    expect(list(latestLists, 'sv_mail_outbox_template_check', 'template').sort()).toEqual(
      [...t].sort(),
    );
  });

  it('SQL dedupe key literals match the TS helpers', () => {
    const expected: Record<string, { sql: string; sample: string }> = {
      payment_requested: { sql: invoices, sample: dedupeKey.paymentRequested('{id}', '{email}') },
      payment_received: { sql: payments, sample: dedupeKey.paymentReceived('{id}', '{email}') },
      payment_reminder_admin: { sql: invoices, sample: dedupeKey.paymentReminderAdmin('{id}') },
      payment_anomaly_admin: { sql: payments, sample: dedupeKey.paymentAnomalyAdmin('{evt}') },
      credit_note_issued: { sql: invoices, sample: dedupeKey.creditNoteIssued('{id}', '{email}') },
      mail_suppression_admin: { sql: automation, sample: dedupeKey.mailSuppressionAdmin('{id}') },
    };
    for (const [prefix, { sql, sample }] of Object.entries(expected)) {
      const found = templates(sql, prefix);
      expect(found.length, prefix).toBeGreaterThan(0);
      expect(found, prefix).toContain(sample);
    }
    const reminders = templates(invoices, 'payment_reminder');
    expect(reminders).toContain(dedupeKey.paymentReminder('{id}', 'd3', '{email}'));
    expect(reminders).toContain(dedupeKey.paymentReminder('{id}', 'd7', '{email}'));
  });
});
