import { describe, it, expect } from 'vitest';
import { buildSignatureCodeEmail } from './signatureCodeEmail';

describe('buildSignatureCodeEmail', () => {
  const m = buildSignatureCodeEmail({ code: '012345', documentLabel: 'le devis', expiryMinutes: 10 });
  const warning =
    "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail ; aucune signature ne sera enregistrée.";

  it('has the subject', () => {
    expect(m.subject).toBe('Votre code de signature Sèvalys');
  });
  it('contains code, expiry and warning in html and text', () => {
    expect(m.html).toContain('012345');
    expect(m.text).toContain('012345');
    expect(m.html).toContain('valable 10 minutes');
    expect(m.text).toContain('valable 10 minutes');
    expect(m.text).toContain(warning);
    expect(m.html).toContain(warning.replace(/'/g, '&#39;'));
    expect(m.html).toContain('Courier');
  });
  it('has no link or button', () => {
    expect(m.html).not.toContain('<a ');
    expect(m.html).not.toContain('<button');
    expect(m.text).not.toContain('http');
  });
});
