import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Gardes source des corrections UI/UX du portail (audit v2.0) : cartes, titres, CSS, contraste.
const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const page = read('../../../app/espace-client/page.tsx');
const docsPage = read('../../../app/espace-client/documents/page.tsx');
const payPage = read('../../../app/espace-client/paiements/page.tsx');
const portalCss = read('../../../app/portal.css');
const clientCss = read('../client.css');
const projectCss = read('./project.css');
const onboarding = read('./OnboardingCard.tsx');
const consent = read('./ConsentCard.tsx');
const files = read('./FilesPanel.tsx');

describe('home page cards and headings', () => {
  it('wraps onboarding, files and consent in pt-card', () => {
    expect(onboarding).toContain('className="pt-card pt-onb"');
    expect(consent).toContain('className="pt-card pt-card-quiet pt-consent"');
    expect(page).toMatch(/<section className="pt-card pt-card-quiet" aria-labelledby="files-title">\s*<FilesPanel/);
    expect(files).toContain('id="files-title"');
  });

  it('uses the Display size for the project title', () => {
    expect(page).toMatch(/<h1 id="project-title" className="pt-display">/);
  });

  it('defines CSS for pt-onb, pt-consent and a portal-scoped pt-summary', () => {
    expect(projectCss).toMatch(/\.pt-root \.pt-onb,\s*\.pt-root \.pt-consent \{/);
    expect(projectCss).toContain('.pt-root .pt-onb .pt-summary');
    expect(portalCss).toMatch(/\.pt-subheading \{[^}]*font-size: 16px/);
  });

  it('gives every h2 outside .pt-client a styled class', () => {
    const sources: Record<string, string> = {
      onboarding,
      consent,
      files,
      docsPage,
      payPage,
      payments: read('./PaymentsList.tsx'),
      banner: read('./ReturnBanner.tsx'),
      mismatch: read('./SigningFlow.tsx'),
    };
    for (const [name, src] of Object.entries(sources)) {
      for (const m of src.matchAll(/<h2\b([^>]*)>/g)) {
        expect(m[1], `${name}: <h2${m[1]}>`).toMatch(/className=/);
      }
    }
  });

  it('keeps the onboarding anchor target focusable', () => {
    expect(onboarding).toMatch(/<h2 id="onboarding" tabIndex=\{-1\}/);
    expect(read('./HashFocusLink.tsx')).toContain('.focus(');
  });
});

describe('layout and spacing', () => {
  it('has no inline layout wrappers on portal pages', () => {
    for (const src of [page, docsPage, payPage, read('../../../app/espace-client/documents/[id]/signer/page.tsx')]) {
      expect(src).not.toMatch(/style=\{\{\s*display: 'flex'/);
    }
    for (const src of [onboarding, consent, files, read('./WhoWaits.tsx'), read('../LoginForm.tsx')]) {
      expect(src).not.toMatch(/style=\{\{/);
    }
  });

  it('drops the off-scale spacing and the extra pay margins', () => {
    expect(clientCss).not.toMatch(/gap: 10px|padding-top: 20px|4px 20px|#6F6B64/);
    expect(projectCss).not.toMatch(/margin-bottom: 24px/);
    expect(read('./PortalLinks.tsx')).not.toContain('marginLeft: 6');
  });

  it('removes the dead legacy nav CSS', () => {
    expect(portalCss).not.toMatch(/\.pt-nav/);
    expect(projectCss).not.toContain('pt-client-nav-off');
  });
});

describe('contrast', () => {
  it('never uses --ink-faint in portal css', () => {
    for (const css of [portalCss, clientCss, projectCss]) {
      expect(css.replace(/\/\*[\s\S]*?\*\//g, '')).not.toContain('--ink-faint');
    }
  });

  it('does not drop the resend countdown text with opacity', () => {
    expect(portalCss).toMatch(/\.pt-btn-text:disabled,\s*\.pt-btn-text\[aria-disabled="true"\] \{\s*color: var\(--ink-dim\)/);
    expect(portalCss).not.toMatch(/\.pt-btn-text\[aria-disabled="true"\] \{[^}]*opacity/);
  });

  it('keeps the acid accent off the signing checkboxes', () => {
    expect(projectCss).not.toContain('accent-color: var(--acid)');
  });
});

describe('copy and live regions', () => {
  it('keeps hard-coded French out of the files table and the interlocutor card', () => {
    expect(files).not.toMatch(/>(Nom|Déposé par|Ajouté le|Taille)</);
    expect(page).not.toContain('+33 6 07 18 41 33');
    expect(page).not.toContain('Votre interlocuteur<');
  });

  it('mounts error live regions empty (StatusNote) and keeps them out of the flow', () => {
    for (const f of ['./PayButton.tsx', './PaymentsList.tsx', './DocumentsList.tsx']) {
      expect(read(f)).toContain('<StatusNote tone="error" live="assertive">');
    }
    expect(portalCss).toContain('.pt-live:empty');
  });
});
