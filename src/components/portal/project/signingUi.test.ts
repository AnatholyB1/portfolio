import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Gardes source de la page de signature et de la recette (SIGN-01, SIGN-02, SIGN-05, 14-UI-SPEC A et B).
const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const flow = read('./SigningFlow.tsx');
const checklist = read('./AcceptanceChecklist.tsx');
const page = read('../../../app/espace-client/documents/[id]/signer/page.tsx');
const css = read('./project.css');
const copy = read('../../../lib/projects/copy.ts');

describe('signing flow source contract', () => {
  it('uses a single one-time-code numeric field, never type=number', () => {
    expect(flow).toContain('autoComplete="one-time-code"');
    expect(flow).toContain('inputMode="numeric"');
    expect(flow).toContain('maxLength={OTP_LEN}');
    expect(flow).toContain('pattern="[0-9]*"');
    expect(flow).not.toContain('type="number"');
  });

  it('never prechecks a consent or a criterion', () => {
    for (const src of [flow, checklist]) {
      expect(src).not.toMatch(/defaultChecked|checked=\{true\}/);
    }
    expect(flow).toContain('useState(false)');
  });

  it('imports both consent texts from consentText instead of inlining them', () => {
    expect(flow).toContain("from '@/lib/signature/consentText'");
    expect(flow).toContain('texts.esign');
    expect(flow).toContain('texts.evidence');
    expect(flow).not.toContain("J'accepte");
  });

  it('keeps the refusal CTA behind the copy key, with the sentence living in copy.ts', () => {
    expect(checklist).toContain('CL.sendFeedback');
    expect(checklist).toContain('submitAcceptanceAction');
    expect(copy).toContain('Envoyer mon retour à Sèvalys');
    expect(checklist).not.toContain('Envoyer mon retour');
  });

  it('routes every context state from the page', () => {
    expect(page).toContain('loadSigningContext');
    expect(page).toContain('await params');
    expect(page).toContain("dynamic = 'force-dynamic'");
    expect(page).toContain('notFound()');
    expect(page).toContain('AcceptanceChecklist');
    expect(page).toContain('SigningFlow');
  });
});

describe('signing UI stays free of prices, cinema and hardcoded UI-SPEC sentences', () => {
  it('has no price token', () => {
    for (const src of [flow, checklist, page]) {
      expect(src).not.toMatch(/€|\beuros?\b|\bprix\b/i);
    }
  });

  it('has no gsap, cinema or cursor', () => {
    for (const src of [flow, checklist, page]) {
      for (const bad of ['gsap', 'CinemaIntro', 'CustomCursor', 'dangerouslySetInnerHTML']) {
        expect(src).not.toContain(bad);
      }
    }
  });

  it('keeps UI-SPEC sentences out of the JSX files', () => {
    const literals = [
      'Signer le document',
      'Recevoir le code',
      'Document signé',
      "Vous n'êtes pas le signataire désigné",
      'Code à 6 chiffres',
      'Livré avec réserve',
      'Continuer vers la signature',
      'Télécharger le document signé',
    ];
    for (const src of [flow, checklist, page]) {
      for (const s of literals) expect(src).not.toContain(s);
    }
  });
});

describe('pt-sign-* styles', () => {
  it('styles every pt-sign class used by the components', () => {
    const used = new Set<string>();
    for (const src of [flow, checklist]) {
      for (const m of src.matchAll(/pt-sign(?:-[a-z]+)*/g)) used.add(m[0]);
    }
    expect(used.size).toBeGreaterThan(10);
    for (const cls of used) {
      expect(css, `missing selector .${cls}`).toMatch(new RegExp(`\\.${cls}(?![a-z-])`));
    }
  });

  it('honours the mobile contract', () => {
    expect(css).toContain('env(safe-area-inset-bottom)');
    expect(css).toContain('height: 480px');
    expect(css).toContain('height: 720px');
    expect(css).toContain('var(--warm)');
  });
});
