import { describe, expect, it } from 'vitest';
import {
  buildAcceptanceRefusedAdminEmail,
  buildDocumentSignedAdminEmail,
  buildDocumentSignedEmail,
} from './documentSignedEmail';

const PORTAL = 'https://sevalys.com/espace-client/documents';
const ADMIN = 'https://sevalys.com/admin/projets/p1';

const client = {
  documentLabel: 'le devis',
  projectTitle: 'Site',
  signedDate: '12/10/2026',
  signedTime: '14:05',
  portalUrl: PORTAL,
};
const admin = {
  documentLabel: 'le devis',
  projectTitle: 'Site',
  clientName: 'Acme',
  reference: 'DEV-001',
  signedDate: '12/10/2026',
  signedTime: '14:05',
  reservedCount: 0,
  adminUrl: ADMIN,
};

function onlyUrls(out: string, allowed: string[]) {
  for (const m of out.matchAll(/https?:\/\/[^\s"'<>]+/g)) {
    expect(allowed).toContain(m[0]);
  }
}

describe('buildDocumentSignedEmail', () => {
  it('builds subject and body', () => {
    const m = buildDocumentSignedEmail(client);
    expect(m.subject).toBe('Document signé : le devis — Site');
    for (const out of [m.html, m.text]) {
      expect(out).toContain('nous confirmons la signature du devis');
      expect(out).toContain('12/10/2026');
      expect(out).toContain('14:05');
      expect(out).toContain('Ouvrir mon espace client');
      expect(out).toContain(PORTAL);
    }
  });
  it('maps each label to a natural genitive', () => {
    const t = (l: string) => buildDocumentSignedEmail({ ...client, documentLabel: l }).text;
    expect(t('le contrat')).toContain('signature du contrat');
    expect(t('le procès-verbal de recette')).toContain('signature du procès-verbal de recette');
  });
  it('has no amount, attachment or foreign link', () => {
    const m = buildDocumentSignedEmail(client);
    for (const out of [m.html, m.text]) {
      expect(out).not.toContain('€');
      expect(out.toLowerCase()).not.toContain('attachment');
      onlyUrls(out, [PORTAL]);
    }
  });
  it('escapes html', () => {
    const m = buildDocumentSignedEmail({ ...client, projectTitle: '<script>x</script>' });
    expect(m.html).not.toContain('<script>');
  });
});

describe('buildDocumentSignedAdminEmail', () => {
  it('builds subject and body without reserves', () => {
    const m = buildDocumentSignedAdminEmail(admin);
    expect(m.subject).toBe('Signature reçue : le devis — Site');
    for (const out of [m.html, m.text]) {
      expect(out).toContain('Acme');
      expect(out).toContain('DEV-001');
      expect(out).toContain('12/10/2026');
      expect(out).toContain('14:05');
      expect(out).toContain('Ouvrir la fiche projet');
      expect(out).toContain(ADMIN);
      expect(out).not.toContain('Réserves');
      expect(out).not.toContain('€');
    }
  });
  it('mentions reserves when present', () => {
    const m = buildDocumentSignedAdminEmail({ ...admin, reservedCount: 2 });
    expect(m.text).toContain('Réserves : 2 réserve(s) inscrite(s) au PV.');
    onlyUrls(m.html, [ADMIN]);
  });
  it('escapes client name', () => {
    const m = buildDocumentSignedAdminEmail({ ...admin, clientName: '<b>x</b>' });
    expect(m.html).not.toContain('<b>x</b>');
  });
});

describe('buildAcceptanceRefusedAdminEmail', () => {
  const refused = [
    { index: 1, criterion: 'Page <i>contact</i>', note: 'Formulaire <script>alert(1)</script>' },
    { index: 3, criterion: 'SEO', note: 'Manquant' },
  ];
  it('lists refused criteria with notes, escaped', () => {
    const m = buildAcceptanceRefusedAdminEmail({
      projectTitle: 'Site',
      clientName: 'Acme',
      refused,
      refusedCount: 2,
      adminUrl: ADMIN,
    });
    expect(m.subject).toBe('Recette refusée : 2 critère(s) — Site');
    expect(m.html).not.toContain('<script>');
    expect(m.html).not.toContain('<i>');
    expect(m.html).toContain('Manquant');
    expect(m.text).toContain('- SEO : Manquant');
    expect(m.text).toContain('Émettez un procès-verbal corrigé.');
    expect(m.html).toContain('Ouvrir la fiche projet');
    onlyUrls(m.html, [ADMIN]);
  });
});
