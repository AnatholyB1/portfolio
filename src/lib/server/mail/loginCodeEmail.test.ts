import { describe, expect, it } from 'vitest';
import {
  LOGIN_EMAIL_FROM,
  LOGIN_EMAIL_REPLY_TO,
  buildLoginCodeEmail,
  escapeHtml,
} from './loginCodeEmail';

const link = 'https://sevalys.com/auth/confirm?token_hash=abc&type=email';

describe('buildLoginCodeEmail', () => {
  it('exposes sender constants', () => {
    expect(LOGIN_EMAIL_FROM).toBe('Sevalys <connexion@sevalys.com>');
    expect(LOGIN_EMAIL_REPLY_TO).toBe('contact@sevalys.com');
  });

  it('has the French subject', () => {
    expect(buildLoginCodeEmail({ code: '123456', link, expiryMinutes: 60 }).subject).toBe(
      'Votre code de connexion Sèvalys',
    );
  });

  it('shows the code in the styled monospace block', () => {
    const { html } = buildLoginCodeEmail({ code: '123456', link, expiryMinutes: 60 });
    expect(html).toMatch(/<[^>]*color:#C4F542[^>]*>\s*123456\s*</);
    expect(html).toContain('font-size:32px');
    expect(html).toContain('letter-spacing:0.3em');
    expect(html).toContain('monospace');
  });

  it('includes the fallback link in html and text', () => {
    const { html, text } = buildLoginCodeEmail({ code: '123456', link, expiryMinutes: 60 });
    expect(html).toContain('Ou ouvrez ce lien de connexion');
    expect(text).toContain('123456');
    expect(text).toContain(link);
  });

  it('mentions the configured expiry', () => {
    const { html, text } = buildLoginCodeEmail({ code: '123456', link, expiryMinutes: 60 });
    expect(html).toContain('valable 60 minutes');
    expect(text).toContain('valable 60 minutes');
  });

  it('falls back to a limited-duration mention when expiry is unknown', () => {
    const { html, text } = buildLoginCodeEmail({ code: '123456', link, expiryMinutes: null });
    expect(html).toContain('durée limitée');
    expect(text).toContain('durée limitée');
    expect(html).not.toMatch(/\d+ minutes/);
    expect(text).not.toMatch(/\d+ minutes/);
  });

  it('escapes a hostile link', () => {
    const { html } = buildLoginCodeEmail({ code: '123456', link: '"><script>alert(1)</script>', expiryMinutes: 60 });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('contains no price wording, images or tracking', () => {
    const { html } = buildLoginCodeEmail({ code: '123456', link, expiryMinutes: 60 });
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
