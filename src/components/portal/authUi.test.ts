import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Contrat UI de la connexion, vérifié sur le texte source (comme privateShells.test.ts).
const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const css = read('../../app/portal.css');
const login = read('./LoginForm.tsx');
const otp = read('./OtpInput.tsx');
const confirm = read('./ConfirmForm.tsx');

describe('portal.css (10-UI-SPEC)', () => {
  it('lays out the form inside the auth card as a 16px column', () => {
    expect(css).toMatch(/\.pt-auth \.pt-card > form \{[^}]*flex-direction: column;[^}]*gap: 16px;/);
  });

  it('defines the scoped border token and never uses --ink-faint for labels or links', () => {
    expect(css).toContain('--pt-border-strong: #6f6b64');
    expect(css).toMatch(/\.pt-label \{[^}]*font-size: 14px;[^}]*color: var\(--ink-dim\)/);
    expect(css).toMatch(/\.pt-back \{[^}]*min-height: 44px;[^}]*color: var\(--ink-dim\)/);
  });

  it('makes the primary button full width only inside the auth card', () => {
    expect(css).toMatch(/\.pt-auth \.pt-card \.pt-btn-primary \{\s*width: 100%;/);
    expect(css).not.toMatch(/^\.pt-btn-primary \{[^}]*width: 100%/m);
  });

  it('gives warnings a treatment distinct from errors', () => {
    expect(css).toMatch(/\.pt-warn\b/);
    expect(css).toMatch(/\.pt-warn[^{]*\{[^}]*var\(--ink-dim\)/);
  });
});

describe('LoginForm and OtpInput', () => {
  it('keeps OTP_LENGTH as the single source of truth', () => {
    expect(otp).toContain('OTP_LENGTH');
    expect(otp).not.toMatch(/\b8\b/);
    expect(login).not.toMatch(/\b8\b/);
  });

  it('keeps the code input mounted while verifying (readOnly, no pending key)', () => {
    expect(otp).toContain('readOnly={pending}');
    expect(login).not.toContain('${verPending}');
  });

  it('keeps the resend button focusable during the countdown', () => {
    expect(login).toContain('aria-disabled');
    expect(login).not.toMatch(/formAction=\{reqAction\}[^>]*\sdisabled=/);
  });

  it('does not control the email input with state initialised in an effect', () => {
    expect(login).toContain('defaultValue={lastEmail}');
    expect(login).not.toMatch(/<input[^>]*\bvalue=\{email\}/);
  });

  it('has a single heading per step and the delivery status line', () => {
    expect(login).not.toContain('<h2');
    expect(login).toContain('Saisissez votre code');
    expect(login).toContain('Code envoyé à');
  });
});

describe('ConfirmForm', () => {
  it('shows the error state directly when the token is missing', () => {
    expect(confirm).toContain('if (!tokenHash)');
    expect(confirm).toContain("Ce lien n'est plus valide.");
  });
});
