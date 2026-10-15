import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { documentSubject, nameWithSubject } from '@/lib/projects/accessibleNames';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const onboarding = read('./OnboardingCard.tsx');
const documents = read('./DocumentsList.tsx');
const files = read('./FilesPanel.tsx');
const payments = read('./PaymentsList.tsx');
const payButton = read('./PayButton.tsx');
const notice = read('./ReturnNotice.tsx');
const paiementsPage = read('../../../app/espace-client/paiements/page.tsx');
const clientPage = read('../../../app/espace-client/page.tsx');
const clientCss = read('../client.css');
const projectCss = read('./project.css');
const portalCss = read('../../../app/portal.css');

describe('nameWithSubject', () => {
  it('keeps the visible text first (WCAG 2.5.3) and appends the subject', () => {
    expect(nameWithSubject('Télécharger', 'Devis, version 2')).toBe('Télécharger : Devis, version 2');
    expect(nameWithSubject(' Télécharger ', '')).toBe('Télécharger');
  });

  it('describes a document by label, version and date', () => {
    expect(documentSubject('Devis', 2, '12/10/2026')).toBe('Devis, version 2, émis le 12/10/2026');
  });
});

describe('F-C8 repeated actions carry the item name', () => {
  it('names every download button after its document, file or invoice', () => {
    expect(documents).toContain('nameWithSubject(');
    expect(documents).toContain('documentSubject(DOC_LABELS[d.docType]');
    expect(files).toContain('f.filename');
    expect(files).toContain('nameWithSubject(');
    expect(payments).toContain('nameWithSubject(');
    expect(payments).toContain('inv.number');
  });

  it('names the pay buttons after their invoice', () => {
    expect(payments).toContain('subject={`${PROJECT_COPY.payments.kinds[inv.kind]} ${inv.number}`}');
    expect(payButton).toContain('nameWithSubject(busy ? copy.redirecting : label, subject)');
  });
});

describe('F-C4 onboarding errors are announced', () => {
  it('mounts an alert region before the error text, linked to the field', () => {
    expect(onboarding).toMatch(/function FieldError[\s\S]*role="alert"[\s\S]*message \? \(/);
    expect(onboarding).toContain('<p id={id} className="pt-error">');
    expect(onboarding).toContain('aria-invalid={a.invalid || undefined}');
    expect(onboarding).toContain('aria-describedby={a.describedBy}');
  });

  it('keeps block and company errors in a persistent alert slot', () => {
    expect(onboarding).toContain('function AlertSlot');
    expect(onboarding).toContain('<AlertSlot message=');
    expect(onboarding).not.toMatch(/<p className="pt-error" role="alert">/);
  });
});

describe('F-C5 legal form', () => {
  it('shows the legal form as a label, never the raw INSEE code', () => {
    expect(onboarding).toContain('<dt>Forme juridique</dt>');
    expect(onboarding).toContain('legalFormLabel(company.forme_juridique_code)');
    expect(onboarding).not.toContain('{company.forme_juridique_code}');
  });
});

describe('F-C9 silent payment return', () => {
  it('shows a notice when the invoice of the return is not found, without deriving any payment state', () => {
    expect(paiementsPage).toContain('{!loadFailed && retour && !bannerInvoice ? <ReturnNotice retour={retour} /> : null}');
    expect(notice).toContain('aria-live="polite"');
    expect(notice).toContain('titleRef.current?.focus()');
    expect(notice).not.toContain('payInvoiceAction');
    expect(notice).not.toContain('stripe');
  });
});

describe('F-C13, focus ring and hit areas', () => {
  it('gives the timeline a single accessible name', () => {
    expect(clientPage).not.toContain('aria-label={PROJECT_COPY.portal.timelineLabel}');
    expect(read('./Timeline.tsx')).toContain('<ol aria-label="Avancement du projet"');
  });

  it('draws the brand focus ring on the onboarding summary', () => {
    expect(projectCss).toMatch(/\.pt-root \.pt-onb summary:focus-visible \{[^}]*outline: 2px solid var\(--acid\)/);
  });

  it('gives contact links a 44px hit area', () => {
    expect(clientCss).toMatch(/\.pt-client a,\s*\.pt-noaccess a \{[^}]*min-height: 44px/);
    expect(clientCss).toMatch(/\.pt-root \.pt-client-list a \{[^}]*min-height: 44px/);
  });
});

describe('a single skip link in the private areas', () => {
  it('hides the site-wide skip link only when an admin or portal layout owns one', () => {
    expect(portalCss).toMatch(/body:has\(\[data-own-skip-link\]\) \.skip-link \{\s*display: none;/);
    for (const layout of ['../../../app/admin/layout.tsx', '../../../app/espace-client/layout.tsx']) {
      expect(read(layout)).toContain('data-own-skip-link=""');
    }
  });

  it('leaves every public layout untouched', () => {
    for (const layout of [
      '../../../app/layout.tsx',
      '../../../app/connexion/layout.tsx',
      '../../../app/auth/layout.tsx',
      '../../../app/desinscription/layout.tsx',
      '../../../app/avis/[token]/layout.tsx',
    ]) {
      expect(read(layout)).not.toContain('data-own-skip-link');
    }
  });
});
