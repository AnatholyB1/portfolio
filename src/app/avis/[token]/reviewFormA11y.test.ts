import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dir = new URL('.', import.meta.url);
const form = readFileSync(new URL('ReviewForm.tsx', dir), 'utf8');
const rating = readFileSync(new URL('ReviewRatingInput.tsx', dir), 'utf8');
const css = readFileSync(new URL('reviewForm.css', dir), 'utf8');

describe('review form accessibility and copy guards', () => {
  it('marks required fields visibly and programmatically', () => {
    expect(form).toContain('sont obligatoires');
    expect((form.match(/<Req \/>/g) ?? []).length).toBeGreaterThanOrEqual(5);
    expect(form).toMatch(/aria-required="true"/);
    expect(rating).toContain('aria-required="true"');
    expect(rating).toContain('aria-labelledby="rv-rating-label"');
  });

  it('keeps the character-count hint after blur', () => {
    expect(form).not.toContain('bodyBlurred');
    expect(form).toMatch(/missing > 0 && bodyLen > 0/);
    expect(form).toContain('className="pt-helper tabular"');
  });

  it('describes the initial field and capitalises it', () => {
    expect(form).toContain('autoCapitalize="characters"');
    expect(form).toContain('rv-help-initial');
  });

  it('uses non-breaking spaces before French colons and in numeric units', () => {
    expect(form).toContain('Projet&nbsp;:');
    expect(form).toContain('Affiché publiquement&nbsp;:');
    expect(form).toContain('\\u00a0caractères');
  });

  it('keeps one h1 id (rv-heading) and no leftover pt-auth-title', () => {
    expect(form).toContain('id="rv-heading"');
    expect(form).not.toContain('pt-auth-title');
  });

  it('gives text links a 44px hit area', () => {
    expect(css).toMatch(/\.rv-link \{[^}]*min-height: 44px/);
  });
});
