import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAIL_EVENTS, MAIL_RULES, dedupeKey, type MailEvent, type Rule } from './rules';

describe('MAIL_RULES', () => {
  it('has exactly the thirteen events with expected recipients and zero delay', () => {
    expect(MAIL_EVENTS).toHaveLength(13);
    expect(Object.keys(MAIL_RULES).sort()).toEqual([...MAIL_EVENTS].sort());
    expect(MAIL_RULES.document_issued).toEqual({
      template: 'document_issued',
      delayMs: 0,
      to: 'client',
    });
    expect(MAIL_RULES.client_invited.to).toBe('client');
    expect(MAIL_RULES.step_changed.to).toBe('client');
    expect(MAIL_RULES.onboarding_completed.to).toBe('admin');
    expect(MAIL_RULES.document_signed.to).toBe('client');
    expect(MAIL_RULES.document_signed_admin.to).toBe('admin');
    expect(MAIL_RULES.acceptance_refused.to).toBe('admin');
    for (const e of ['payment_requested', 'payment_received', 'payment_reminder', 'credit_note_issued'] as const)
      expect(MAIL_RULES[e]).toEqual({ template: e, delayMs: 0, to: 'client' });
    for (const e of ['payment_reminder_admin', 'payment_anomaly_admin'] as const)
      expect(MAIL_RULES[e]).toEqual({ template: e, delayMs: 0, to: 'admin' });
    for (const e of MAIL_EVENTS) expect(MAIL_RULES[e].delayMs).toBe(0);
  });

  it('is type-checked as Record<MailEvent, Rule>', () => {
    // @ts-expect-error missing document_issued
    const partial: Record<MailEvent, Rule> = {
      client_invited: MAIL_RULES.client_invited,
      step_changed: MAIL_RULES.step_changed,
      onboarding_completed: MAIL_RULES.onboarding_completed,
      document_signed: MAIL_RULES.document_signed,
      document_signed_admin: MAIL_RULES.document_signed_admin,
      acceptance_refused: MAIL_RULES.acceptance_refused,
      payment_requested: MAIL_RULES.payment_requested,
      payment_received: MAIL_RULES.payment_received,
      payment_reminder: MAIL_RULES.payment_reminder,
      payment_reminder_admin: MAIL_RULES.payment_reminder_admin,
      payment_anomaly_admin: MAIL_RULES.payment_anomaly_admin,
      credit_note_issued: MAIL_RULES.credit_note_issued,
    };
    expect(partial).toBeDefined();
  });

  it('has no lead/prospect event', () => {
    const src = readFileSync(new URL('./rules.ts', import.meta.url), 'utf8');
    expect(src).not.toContain('lead_status');
  });
});

describe('closed lists vs phase-15 migration', () => {
  const sql = readFileSync(
    new URL('../../../../supabase/migrations/20261007000000_sv_invoices.sql', import.meta.url),
    'utf8',
  )
    .split('\n')
    .map((l) => l.replace(/--.*$/, ''))
    .join('\n');

  const list = (constraint: string, column: string): string[] => {
    const re = new RegExp(`${constraint}\\s+check\\s*\\(\\s*${column}\\s+in\\s*\\(([^)]*)\\)`, 'i');
    const m = re.exec(sql);
    expect(m).not.toBeNull();
    return [...m![1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  };

  it('event_type list equals MAIL_EVENTS', () => {
    expect(list('sv_mail_outbox_event_type_check', 'event_type').sort()).toEqual(
      [...MAIL_EVENTS].sort(),
    );
  });

  it('template list equals invite plus the rule templates', () => {
    const templates = new Set<string>([
      'invite',
      ...Object.values(MAIL_RULES).map((r) => r.template),
    ]);
    expect(list('sv_mail_outbox_template_check', 'template').sort()).toEqual([...templates].sort());
  });
});

describe('dedupeKey', () => {
  it('lowercases and builds keys', () => {
    expect(dedupeKey.clientInvited('c1', 'A@X.fr')).toBe('client_invited:c1:a@x.fr');
    expect(dedupeKey.clientInvited('c1', 'A@X.fr', 2)).toBe('client_invited:c1:a@x.fr:resend:2');
    expect(dedupeKey.stepChanged('f1', 'A@X.fr')).toBe('step_changed:f1:a@x.fr');
    expect(dedupeKey.onboardingCompleted('p1', 'A@X.fr')).toBe('onboarding_completed:p1:a@x.fr');
    expect(dedupeKey.documentIssued('d1', 'A@X.fr')).toBe('document_issued:d1:a@x.fr');
    expect(dedupeKey.documentSigned('d1', 'A@X.fr')).toBe('document_signed:d1:a@x.fr');
    expect(dedupeKey.documentSignedAdmin('d1')).toBe('document_signed_admin:d1');
    expect(dedupeKey.acceptanceRefused('s1')).toBe('acceptance_refused:s1');
    expect(dedupeKey.paymentRequested('id', 'A@B.fr')).toBe('payment_requested:id:a@b.fr');
    expect(dedupeKey.paymentReceived('id', 'A@B.fr')).toBe('payment_received:id:a@b.fr');
    expect(dedupeKey.paymentReminder('id', 'd3', 'A@B.fr')).toBe('payment_reminder:id:d3:a@b.fr');
    expect(dedupeKey.paymentReminder('id', 'd7', 'a@b.fr')).toBe('payment_reminder:id:d7:a@b.fr');
    expect(dedupeKey.paymentReminderAdmin('id')).toBe('payment_reminder_admin:id:d14');
    expect(dedupeKey.paymentAnomalyAdmin('evt_1')).toBe('payment_anomaly_admin:evt_1');
    expect(dedupeKey.creditNoteIssued('cn', 'A@B.fr')).toBe('credit_note_issued:cn:a@b.fr');
  });
  it('caps length at 256', () => {
    const long = 'a'.repeat(300) + '@x.fr';
    expect(dedupeKey.clientInvited('c1', long).length).toBeLessThanOrEqual(256);
    expect(dedupeKey.clientInvited('c1', long, 2).length).toBeLessThanOrEqual(256);
    expect(dedupeKey.clientInvited('c1', long, 2).endsWith(':resend:2')).toBe(true);
  });
});
