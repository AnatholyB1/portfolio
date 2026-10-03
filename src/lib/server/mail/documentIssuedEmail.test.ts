import { describe, expect, it } from 'vitest';
import { buildDocumentIssuedEmail } from './documentIssuedEmail';

const base = {
  documentLabel: 'Devis',
  projectTitle: 'Site vitrine',
  revision: 1,
  portalUrl: 'https://sevalys.com/espace-client/documents',
};

describe('buildDocumentIssuedEmail', () => {
  it('builds the first-version subject', () => {
    expect(buildDocumentIssuedEmail(base).subject).toBe('Nouveau document : Devis — Site vitrine');
  });

  it('builds the new-version subject', () => {
    expect(buildDocumentIssuedEmail({ ...base, revision: 2 }).subject).toBe(
      'Nouvelle version : Devis — Site vitrine',
    );
  });

  it('contains the French copy and the portal url', () => {
    const { html, text } = buildDocumentIssuedEmail(base);
    for (const out of [html, text]) {
      expect(out).toContain('Bonjour');
      expect(out).toContain('Devis, version 1');
      expect(out).toContain('Ouvrir mon espace client');
      expect(out).toContain(base.portalUrl);
    }
  });

  it('escapes the project title in html', () => {
    const { html } = buildDocumentIssuedEmail({ ...base, projectTitle: '<script>x</script>' });
    expect(html).not.toContain('<script>');
  });

  it('has no price, pixel or signed url', () => {
    const { html, text } = buildDocumentIssuedEmail(base);
    for (const out of [html, text]) {
      for (const bad of ['<img', '€', 'prix', 'tarif', 'token', 'sig=']) {
        expect(out.toLowerCase()).not.toContain(bad);
      }
    }
  });
});
