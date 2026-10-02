import { describe, expect, it } from 'vitest';
import {
  LOGIN_EMAIL_FROM,
  LOGIN_EMAIL_REPLY_TO,
  LOGIN_FOOTNOTE_COLOR,
  buildLoginCodeEmail,
  escapeHtml,
} from './loginCodeEmail';

const link = 'https://sevalys.com/auth/confirm?token_hash=abc&type=email';

describe('buildLoginCodeEmail', () => {
  it('exposes sender constants', () => {
    expect(LOGIN_EMAIL_FROM).toBe('"Sèvalys" <connexion@sevalys.com>');
    expect(LOGIN_EMAIL_REPLY_TO).toBe('contact@sevalys.com');
  });

  it('has the French subject', () => {
    expect(buildLoginCodeEmail({ code: '12345678', link, expiryMinutes: 60 }).subject).toBe(
      'Votre code de connexion Sèvalys',
    );
  });

  it('shows the code as two groups in the accent monospace block that fits 320px', () => {
    const { html } = buildLoginCodeEmail({ code: '12345678', link, expiryMinutes: 60 });
    expect(html).toMatch(/<div[^>]*color:#C4F542[^>]*><span[^>]*>1234<\/span><span[^>]*>5678<\/span><\/div>/);
    expect(html).toContain('font-size:28px');
    expect(html).toContain('letter-spacing:0.18em');
    expect(html).toContain('white-space:nowrap');
    expect(html).toContain('monospace');
    // 8 glyphs monospace (0,6em + 0,18em) + gap 0,5em à 28px, dans 320 - 24 - 48 - 16 - 2 = 230px
    expect((8 * 0.78 + 0.5) * 28).toBeLessThan(230);
  });

  it('keeps the code contiguous (no space) in the plain-text part and in the copy run', () => {
    const { html, text } = buildLoginCodeEmail({ code: '12345678', link, expiryMinutes: 60 });
    expect(text).toContain('\n12345678\n');
    expect(html).toContain('</span><span');
  });

  it('does not hardcode a code length', () => {
    const { html, text } = buildLoginCodeEmail({ code: '123456', link, expiryMinutes: 60 });
    expect(html).toContain('>123<');
    expect(html).toContain('>456<');
    expect(text).toContain('123456');
  });

  it('has the wordmark, language, color scheme and opaque backgrounds', () => {
    const { html, text } = buildLoginCodeEmail({ code: '12345678', link, expiryMinutes: 60 });
    expect(html).toContain('<html lang="fr">');
    expect(html).toContain('name="color-scheme"');
    expect(html).toContain('bgcolor="#0A0B0C"');
    expect(html).toContain('>Sèvalys</p>');
    expect(text.startsWith('Sèvalys')).toBe(true);
  });

  it('uses a footnote colour that reaches 4.5:1', () => {
    const { html } = buildLoginCodeEmail({ code: '12345678', link, expiryMinutes: 60 });
    expect(LOGIN_FOOTNOTE_COLOR).toBe('#9A9690');
    expect(html).toContain('color:#9A9690');
    expect(html).not.toContain('#9a9a94');
  });

  it('includes the fallback link in html and text', () => {
    const { html, text } = buildLoginCodeEmail({ code: '12345678', link, expiryMinutes: 60 });
    expect(html).toContain('Ou ouvrez ce lien de connexion (valable une seule fois)');
    expect(text).toContain('Ou ouvrez ce lien de connexion (valable une seule fois)');
    expect(text).toContain('12345678');
    expect(text).toContain(link);
  });

  it('mentions the configured expiry', () => {
    const { html, text } = buildLoginCodeEmail({ code: '12345678', link, expiryMinutes: 60 });
    expect(html).toContain('valable 60 minutes');
    expect(text).toContain('valable 60 minutes');
  });

  it('falls back to a limited-duration mention when expiry is unknown', () => {
    const { html, text } = buildLoginCodeEmail({ code: '12345678', link, expiryMinutes: null });
    expect(html).toContain('durée limitée');
    expect(text).toContain('durée limitée');
    expect(html).not.toMatch(/\d+ minutes/);
    expect(text).not.toMatch(/\d+ minutes/);
  });

  it('escapes a hostile link', () => {
    const { html } = buildLoginCodeEmail({ code: '12345678', link: '"><script>alert(1)</script>', expiryMinutes: 60 });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('contains no price wording, images or tracking', () => {
    const { html } = buildLoginCodeEmail({ code: '12345678', link, expiryMinutes: 60 });
    expect(html).not.toContain('€');
    expect(html.toLowerCase()).not.toContain('prix');
    expect(html.toLowerCase()).not.toContain('tarif');
    expect(html).not.toContain('<img');
  });
});

describe('escapeHtml', () => {
  it('escapes the five special characters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});
