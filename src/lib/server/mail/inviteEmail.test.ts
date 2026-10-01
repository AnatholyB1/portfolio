import { describe, expect, it } from 'vitest';
import { buildInviteEmail } from './inviteEmail';

describe('buildInviteEmail', () => {
  const mail = buildInviteEmail({ clientName: '<b>Acme & "Co"</b>', loginUrl: 'https://sevalys.com/connexion' });

  it('has the French subject and link', () => {
    expect(mail.subject).toBe('Votre espace client Sèvalys est prêt');
    expect(mail.html).toContain('https://sevalys.com/connexion');
    expect(mail.html).toContain('Accéder à mon espace');
    expect(mail.text).toContain('https://sevalys.com/connexion');
  });

  it('escapes the client name', () => {
    expect(mail.html).not.toContain('<b>Acme');
    expect(mail.html).toContain('&lt;b&gt;Acme &amp; &quot;Co&quot;&lt;/b&gt;');
  });

  it('has no images or price words', () => {
    expect(mail.html).not.toMatch(/<img/i);
    expect(mail.html).not.toMatch(/€|prix|tarif/i);
  });
});
