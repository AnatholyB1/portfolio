import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/env', () => ({ getSiteUrl: () => 'https://sevalys.com' }));

import { escapeHtml } from './inviteEmail';
import { buildMarketingEmail } from './marketingEmail';
import {
  documentReminderAdminEmail,
  documentReminderEmail,
  mailSuppressionAdminEmail,
  reviewHiddenEmail,
  reviewPublishedAdminEmail,
  reviewRequestContent,
} from './reminderEmails';

const base = { documentLabel: 'Contrat', projectTitle: 'Projet X', revision: 1 };

describe('documentReminderEmail', () => {
  it('d3 et d7', () => {
    const a = documentReminderEmail({ ...base, stage: 'd3' });
    const b = documentReminderEmail({ ...base, stage: 'd7' });
    expect(a.subject.startsWith('Rappel :')).toBe(true);
    expect(b.subject.startsWith('Dernier rappel :')).toBe(true);
    for (const m of [a, b]) {
      expect(m.text).toContain('Contrat');
      expect(m.text).toContain('Projet X');
      expect(m.text).toContain('https://sevalys.com/espace-client/documents');
      expect(m.text).toContain('Si vous avez déjà signé, ignorez ce message.');
      expect(m.text).not.toContain('version');
    }
  });

  it('mentionne la version au-delà de 1', () => {
    const m = documentReminderEmail({ ...base, revision: 3, stage: 'd3' });
    expect(m.text).toContain('version 3');
  });

  it('échappe le HTML', () => {
    const m = documentReminderEmail({ ...base, projectTitle: '<b>x</b>', stage: 'd3' });
    expect(m.html).toContain(escapeHtml('<b>x</b>'));
    expect(m.html).not.toContain('<b>x</b>');
  });
});

describe('documentReminderAdminEmail', () => {
  it('alerte d14', () => {
    const m = documentReminderAdminEmail({
      documentLabel: 'Contrat',
      projectTitle: 'Projet X',
      clientName: 'Client SA',
      issuedOn: '2026-10-01',
      projectId: 'p-1',
    });
    expect(m.text).toContain('non signé depuis 14 jours');
    expect(m.text).toContain('Client SA');
    expect(m.text).toContain('01/10/2026');
    expect(m.text).toContain('https://sevalys.com/admin/projets/p-1');
  });
});

describe('reviewRequestContent', () => {
  const url = 'https://sevalys.com/avis/test-token';
  it('d7 et d21 diffèrent, lien conservé, sans prix ni étoiles', () => {
    const a = reviewRequestContent({ projectTitle: 'Projet X', reviewUrl: url, stage: 'd7' });
    const b = reviewRequestContent({ projectTitle: 'Projet X', reviewUrl: url, stage: 'd21' });
    expect(a.subject).not.toBe(b.subject);
    expect(a.url).toBe(url);
    expect(JSON.stringify([a, b])).not.toMatch(/€|étoile|prix/i);
  });

  it.each(['http://x', '', 'pas une url'])('refuse %j', (bad) => {
    expect(() =>
      reviewRequestContent({ projectTitle: 'P', reviewUrl: bad, stage: 'd7' }),
    ).toThrow('invalid_review_url');
  });

  it('passe par buildMarketingEmail avec le lien factice et la désinscription', () => {
    const links = {
      pageUrl: 'https://sevalys.com/desinscription?t=a.b',
      oneClickUrl: 'https://sevalys.com/api/unsubscribe?t=a.b',
    };
    const m = buildMarketingEmail(
      reviewRequestContent({ projectTitle: 'P', reviewUrl: url, stage: 'd7' }),
      links,
    );
    expect(m.text).toContain(url);
    expect(m.text).toContain(links.pageUrl);
    expect(m.headers['List-Unsubscribe']).toBe(`<${links.oneClickUrl}>`);
  });
});

describe('mailSuppressionAdminEmail', () => {
  it.each([
    ['complaint', 'plainte pour spam'],
    ['bounce_permanent', 'rebond définitif'],
    ['unsubscribe', 'désinscription'],
  ] as const)('cause %s', (cause, label) => {
    const m = mailSuppressionAdminEmail({
      cause,
      maskedEmail: 'j***@example.com',
      clientName: 'Client SA',
      isLead: false,
    });
    expect(m.text).toContain(label);
    expect(m.text).toContain('j***@example.com');
    expect(m.text).toContain('Client SA');
    expect(m.text).toContain('https://sevalys.com/admin/emails');
  });

  it('lead', () => {
    const m = mailSuppressionAdminEmail({
      cause: 'bounce_permanent',
      maskedEmail: 'a***@b.fr',
      clientName: null,
      isLead: true,
    });
    expect(m.text).toContain('lead');
  });
});

describe('review mails (phase 18)', () => {
  const url = 'https://sevalys.com/avis/test-token';

  it('review request has no Google link (D-11)', () => {
    for (const stage of ['d7', 'd21'] as const) {
      const m = buildMarketingEmail(reviewRequestContent({ projectTitle: 'P', reviewUrl: url, stage }), {
        pageUrl: 'https://sevalys.com/desinscription?t=a.b',
        oneClickUrl: 'https://sevalys.com/api/unsubscribe?t=a.b',
      });
      expect(`${m.subject}${m.html}${m.text}`).not.toMatch(/google/i);
    }
  });

  it('reviewPublishedAdminEmail names the rating and links to admin reviews', () => {
    const m = reviewPublishedAdminEmail({ projectTitle: 'Site X', rating: 4 });
    expect(m.subject).toBe('Nouvel avis publié : 4 sur 5');
    expect(m.text).toContain('Site X');
    expect(m.text).toContain('Voir les avis');
    expect(m.html).toContain('https://sevalys.com/admin/avis');
    expect(JSON.stringify(m)).not.toMatch(/€|prix|tarif/i);
  });

  it.each([0, 6, 3.5, Number.NaN])('reviewPublishedAdminEmail refuses rating %j', (rating) => {
    expect(() => reviewPublishedAdminEmail({ projectTitle: 'P', rating })).toThrow('invalid_payload');
  });

  it('refuses an empty project title', () => {
    expect(() => reviewPublishedAdminEmail({ projectTitle: ' ', rating: 3 })).toThrow('invalid_payload');
    expect(() => reviewHiddenEmail({ projectTitle: '' })).toThrow('invalid_payload');
  });

  it('reviewHiddenEmail is generic, says not deleted and how to contest', () => {
    const m = reviewHiddenEmail({ projectTitle: 'Site X' });
    expect(m.subject).toBe('Votre avis a été masqué');
    expect(m.text).toContain('Site X');
    expect(m.text).toContain("Il n'est pas supprimé");
    expect(m.text).toContain('répondez simplement à cet e-mail');
    expect(m.text).toContain('contenu illégal');
    expect(m.html).not.toContain('<a href');
    expect(JSON.stringify(m)).not.toMatch(/€|prix|tarif|detail|reason/i);
  });
});
