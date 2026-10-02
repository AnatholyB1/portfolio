import { describe, expect, it } from 'vitest';
import { INVITE_EMAIL_FROM, INVITE_FOOTNOTE_COLOR, buildInviteEmail } from './inviteEmail';
import { buildFromHeader } from './fromHeader';

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('buildInviteEmail', () => {
  const url = 'https://sevalys.com/connexion?email=jean%40example.com';
  const mail = buildInviteEmail({ clientName: '<b>Acme & "Co"</b>', loginUrl: url });

  it('has the French subject and link', () => {
    expect(mail.subject).toBe('Votre espace client Sèvalys est ouvert');
    expect(mail.html).toContain('https://sevalys.com/connexion?email=jean%40example.com');
    expect(mail.html).toContain('Accéder à mon espace');
    expect(mail.text).toContain(url);
  });

  it('lists the three steps without mentioning a code length', () => {
    for (const step of [
      'Cliquez sur le bouton ci-dessous.',
      'Votre adresse e-mail est déjà remplie.',
      'Saisissez le code à usage unique reçu par e-mail.',
    ]) {
      expect(mail.html).toContain(step);
    }
    expect(mail.html).toContain('<ol');
    expect(mail.text).toContain('3. Saisissez le code à usage unique reçu par e-mail.');
    expect(mail.html + mail.text).not.toMatch(/\d+\s*(chiffres|caractères|digits)/i);
  });

  it('mirrors the headline, signature and contact in the plain-text part', () => {
    expect(mail.html).toContain('<h1');
    for (const part of [mail.html, mail.text]) {
      expect(part).toContain('Votre espace client Sèvalys est ouvert');
      expect(part).toContain('Anatholy Bricon');
      expect(part).toContain('Sèvalys · Tours');
      expect(part).toContain('contact@sevalys.com');
    }
  });

  it('escapes the client name', () => {
    expect(mail.html).not.toContain('<b>Acme');
    expect(mail.html).toContain('&lt;b&gt;Acme &amp; &quot;Co&quot;&lt;/b&gt;');
  });

  it('declares language, color scheme and opaque backgrounds', () => {
    expect(mail.html).toContain('<html lang="fr">');
    expect(mail.html).toContain('name="color-scheme"');
    expect(mail.html).toContain('bgcolor="#0A0B0C"');
    expect(mail.html).toContain('bgcolor="#111213"');
  });

  it('uses a footnote colour that reaches 4.5:1 on the card', () => {
    expect(INVITE_FOOTNOTE_COLOR).toBe('#9A9690');
    expect(contrast(INVITE_FOOTNOTE_COLOR, '#111213')).toBeGreaterThanOrEqual(4.5);
    expect(mail.html).not.toContain('#5A5751');
  });

  it('has no images, tracking or price words', () => {
    expect(mail.html).not.toMatch(/<img/i);
    expect(mail.html).not.toMatch(/€|prix|tarif/i);
  });

  it('builds a safe From header with a quoted UTF-8 display name', () => {
    expect(INVITE_EMAIL_FROM).toBe('"Sèvalys" <connexion@sevalys.com>');
    expect(() => buildFromHeader('Evil"\r\nBcc: x@y.z', 'a@b.co')).toThrow();
    expect(() => buildFromHeader('Sèvalys', 'a@b.co\r\nBcc: x@y.z')).toThrow();
  });
});
