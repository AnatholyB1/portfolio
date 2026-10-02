import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAIL_EVENTS, MAIL_RULES, dedupeKey, type MailEvent, type Rule } from './rules';

describe('MAIL_RULES', () => {
  it('has exactly the three events with expected recipients and zero delay', () => {
    expect(Object.keys(MAIL_RULES).sort()).toEqual([...MAIL_EVENTS].sort());
    expect(MAIL_RULES.client_invited.to).toBe('client');
    expect(MAIL_RULES.step_changed.to).toBe('client');
    expect(MAIL_RULES.onboarding_completed.to).toBe('admin');
    for (const e of MAIL_EVENTS) expect(MAIL_RULES[e].delayMs).toBe(0);
  });

  it('is type-checked as Record<MailEvent, Rule>', () => {
    // @ts-expect-error missing onboarding_completed
    const partial: Record<MailEvent, Rule> = {
      client_invited: MAIL_RULES.client_invited,
      step_changed: MAIL_RULES.step_changed,
    };
    expect(partial).toBeDefined();
  });

  it('has no lead/prospect event', () => {
    const src = readFileSync(new URL('./rules.ts', import.meta.url), 'utf8');
    expect(src).not.toContain('lead_status');
  });
});

describe('dedupeKey', () => {
  it('lowercases and builds keys', () => {
    expect(dedupeKey.clientInvited('c1', 'A@X.fr')).toBe('client_invited:c1:a@x.fr');
    expect(dedupeKey.clientInvited('c1', 'A@X.fr', 2)).toBe('client_invited:c1:a@x.fr:resend:2');
    expect(dedupeKey.stepChanged('f1', 'A@X.fr')).toBe('step_changed:f1:a@x.fr');
    expect(dedupeKey.onboardingCompleted('p1', 'A@X.fr')).toBe('onboarding_completed:p1:a@x.fr');
  });
  it('caps length at 256', () => {
    const long = 'a'.repeat(300) + '@x.fr';
    expect(dedupeKey.clientInvited('c1', long).length).toBeLessThanOrEqual(256);
    expect(dedupeKey.clientInvited('c1', long, 2).length).toBeLessThanOrEqual(256);
    expect(dedupeKey.clientInvited('c1', long, 2).endsWith(':resend:2')).toBe(true);
  });
});
