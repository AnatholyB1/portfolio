import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/env', () => ({ getSiteUrl: () => 'https://sevalys.com' }));

import { escapeHtml } from './inviteEmail';
import { emailLayout } from './layout';
import { MARKETING_EMAIL_FROM, MARKETING_REPLY_TO, buildMarketingEmail } from './marketingEmail';
import {
  buildAdminMailUrl,
  buildUnsubscribeOneClickUrl,
  buildUnsubscribePageUrl,
} from './urls';

const links = {
  pageUrl: 'https://sevalys.com/desinscription?t=a.b',
  oneClickUrl: 'https://sevalys.com/api/unsubscribe?t=a.b',
};
// Contenu de test uniquement (D-10 : aucune vraie campagne).
const sample = {
  subject: 'Exemple',
  heading: 'Exemple',
  paragraphs: ['Bonjour, ceci est un exemple.'],
  button: 'Voir',
  url: 'https://sevalys.com/exemple',
};

describe('emailLayout', () => {
  it('sans bouton, aucun tableau bouton ni ligne texte', () => {
    const m = emailLayout({ subject: 's', heading: 'h', paragraphs: ['p'] });
    expect(m.html).not.toContain('#C4F542');
    expect(m.text).not.toContain(' : https');
  });
});

describe('buildMarketingEmail', () => {
  it('expéditeur, réponse, en-têtes et pied de page', () => {
    const m = buildMarketingEmail(sample, links);
    expect(m.from).toBe(MARKETING_EMAIL_FROM);
    expect(m.from).toContain('bonjour@sevalys.com');
    expect(m.replyTo).toBe('contact@sevalys.com');
    expect(MARKETING_REPLY_TO).toBe('contact@sevalys.com');
    expect(m.headers['List-Unsubscribe']).toBe(`<${links.oneClickUrl}>`);
    expect(m.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(m.html).toContain(escapeHtml(links.pageUrl));
    expect(m.text).toContain(links.pageUrl);
    expect(m.html).toContain('Se désinscrire');
    expect(m.text).toContain('Se désinscrire');
    expect(m.text).toContain('Anatholy Bricon');
  });

  it.each([
    [{ pageUrl: '', oneClickUrl: links.oneClickUrl }],
    [{ pageUrl: links.pageUrl, oneClickUrl: '' }],
    [{ pageUrl: 'http://sevalys.com/desinscription?t=a', oneClickUrl: links.oneClickUrl }],
    [{ pageUrl: links.pageUrl, oneClickUrl: 'http://sevalys.com/api/unsubscribe?t=a' }],
  ])('refuse sans deux liens https', (bad) => {
    expect(() => buildMarketingEmail(sample, bad)).toThrow('missing_unsubscribe');
  });
});

describe('urls', () => {
  it('jetons encodés', () => {
    expect(buildUnsubscribePageUrl('a.b')).toBe('https://sevalys.com/desinscription?t=a.b');
    expect(buildUnsubscribeOneClickUrl('a b&c')).toBe(
      'https://sevalys.com/api/unsubscribe?t=a%20b%26c',
    );
    expect(buildAdminMailUrl()).toBe('https://sevalys.com/admin/emails');
  });
});
