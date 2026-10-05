import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Gardes source de l'onglet Paiements du portail client (PAY-01, PAY-03, D-04, D-05, D-18).
const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const page = read('../../../app/espace-client/paiements/page.tsx');
const list = read('./PaymentsList.tsx');
const button = read('./PayButton.tsx');
const banner = read('./ReturnBanner.tsx');
const all = [page, list, button, banner];

describe('client portal payments tab', () => {
  it('guards with requireClient, reads through RLS and validates the return params', () => {
    expect(page).toContain('requireClient()');
    expect(page).toContain('<NoAccess');
    expect(page).toContain('current="paiements"');
    expect(page).toContain('loadInvoicesForProjects(ctx.supabase');
    expect(page).toMatch(/UUID_RE\s*=\s*\/\^\[0-9a-f\]\{8\}/);
    expect(page).toContain('UUID_RE.test(factureParam)');
    expect(page).not.toContain('createSupabaseAdminClient');
    expect(page).not.toContain('service_role');
  });

  it('stays free of cinema, cursor, GSAP, three and language context', () => {
    for (const src of all) {
      for (const bad of ['gsap', 'three', 'CinemaIntro', 'CustomCursor', 'LanguageContext', 'dangerouslySetInnerHTML']) {
        expect(src).not.toContain(bad);
      }
    }
  });

  it('return banner polls every 3 s, at most 10 times, and never derives paid from the URL', () => {
    expect(banner).toContain('3000');
    expect(banner).toContain('MAX_POLLS = 10');
    expect(banner).toContain('router.refresh');
    expect(banner).toContain("retour === 'succes'");
    expect(banner).toContain("invoice.status === 'paid'");
    expect(banner).not.toContain('Payée');
    expect(banner).not.toContain('pt-btn-primary');
    // La branche « confirmé » ne dépend que du statut issu du webhook.
    expect(banner).toMatch(/else if \(invoice\.status === 'paid'\)/);
  });

  it('list uses the central copy, formatEuros, and a single primary pay button', () => {
    expect(list).toContain('PROJECT_COPY.payments');
    expect(list).toContain('formatEuros');
    expect(list).not.toContain('Intl');
    expect(list.match(/variant="primary"/g)?.length).toBe(1);
    expect(list).toContain('copy.waiting');
    expect(list).toContain('copy.vatNote');
  });

  it('pay button sends only the invoice id and redirects to the server URL', () => {
    expect(button).toContain('window.location.assign');
    expect(button).toContain('pay(invoiceId)');
    expect(button).not.toContain('amount');
    expect(button).toContain('inFlight');
  });
});
