import { describe, expect, it } from 'vitest';
import { buildStepChangedEmail } from './stepChangedEmail';
import { buildOnboardingCompletedEmail } from './onboardingCompletedEmail';

const portalUrl = 'https://sevalys.com/espace-client';
const adminUrl = 'https://sevalys.com/admin/projets/p1';

describe('project emails', () => {
  const step = buildStepChangedEmail({ stepName: 'Production', expectedAction: 'Validez la maquette', portalUrl });
  const done = buildOnboardingCompletedEmail({ companyName: 'ACME', projectTitle: 'Site', adminUrl });

  it('has exact subjects', () => {
    expect(step.subject).toBe('Votre projet avance : Production');
    expect(done.subject).toBe('Onboarding terminé : ACME');
  });

  it('step_changed has CTA and url in html and text', () => {
    expect(step.html).toContain('Ouvrir mon espace');
    expect(step.html).toContain(portalUrl);
    expect(step.text).toContain(portalUrl);
    expect(done.text).toContain(adminUrl);
  });

  it('escapes interpolated values', () => {
    const s = buildStepChangedEmail({ stepName: '<script>x</script>', expectedAction: '<script>', portalUrl });
    const o = buildOnboardingCompletedEmail({ companyName: '<script>x', projectTitle: '<script>', adminUrl });
    expect(s.html).not.toContain('<script>');
    expect(o.html).not.toContain('<script>');
    expect(s.html).toContain('&lt;script&gt;');
  });

  it('has no price or tracking pixel', () => {
    for (const m of [step, done]) {
      for (const body of [m.html, m.text]) {
        expect(body).not.toContain('<img');
        expect(body).not.toContain('€');
        expect(body.toLowerCase()).not.toContain('prix');
        expect(body.toLowerCase()).not.toContain('tarif');
      }
    }
  });
});
