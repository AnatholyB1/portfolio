import { describe, expect, it } from 'vitest';
import { ADMIN_EXPECTED_ACTION, ADMIN_STEP_DESCRIPTIONS, toAdminVoice } from './adminCopy';
import { STEPS, deriveProjectState, resolveWaiting } from './steps';

const FIRST_OR_SECOND_PERSON = /\b(vous|votre|vos|nous|notre|nos|complétez|signez|réglez|vérifiez|déposez)\b/i;

describe('admin voice of the project steps', () => {
  it('never speaks to the client (no vous / votre / nous / imperative)', () => {
    for (const idx of [1, 2, 3, 4, 5, 6] as const) {
      expect(ADMIN_STEP_DESCRIPTIONS[idx]).not.toMatch(FIRST_OR_SECOND_PERSON);
      expect(ADMIN_EXPECTED_ACTION[idx].client).not.toMatch(FIRST_OR_SECOND_PERSON);
      expect(ADMIN_EXPECTED_ACTION[idx].admin).not.toMatch(FIRST_OR_SECOND_PERSON);
    }
  });

  it('rewrites the timeline and the expected action without touching the portal copy', () => {
    const state = deriveProjectState([], '2026-01-01T00:00:00Z');
    const before = JSON.stringify(state);
    const admin = toAdminVoice(state);
    expect(admin.steps[0].description).toBe('Le client confirme ses informations.');
    expect(admin.expectedAction).toMatch(/^Le client complète/);
    expect(JSON.stringify(state)).toBe(before);
    expect(STEPS[0].description).toBe('Vous confirmez vos informations.');
  });

  it('follows who is waiting after resolveWaiting', () => {
    const facts = [
      { id: 1, type: 'onboarding_completed' as const, targetFactId: null, actorKind: 'system' as const, createdAt: '2026-01-02T00:00:00Z' },
    ];
    const base = deriveProjectState(facts, '2026-01-01T00:00:00Z');
    const waitingAdmin = toAdminVoice(resolveWaiting(base, { toSign: 0, toPay: 0 }));
    expect(waitingAdmin.expectedAction).toBe(ADMIN_EXPECTED_ACTION[2].admin);
    const waitingClient = toAdminVoice(resolveWaiting(base, { toSign: 1, toPay: 0 }));
    expect(waitingClient.expectedAction).toBe(ADMIN_EXPECTED_ACTION[2].client);
  });
});
