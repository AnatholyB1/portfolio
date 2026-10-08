import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ConfirmAction, { ConfirmButtons, ConfirmPanel } from './ConfirmAction';
import Pager from './Pager';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const css = read('./inline.css');
const noop = () => {};

// Tous les formulaires et panneaux graves de l'admin passent par le motif partagé.
const CONFIRM_USERS: Array<[string, string]> = [
  ['EraseLeadForm', '../leads/EraseLeadForm.tsx'],
  ['LiftSuppressionForm', '../mail/LiftSuppressionForm.tsx'],
  ['ReminderHoldCard', '../projects/ReminderHoldCard.tsx'],
  ['RevokePanel', '../projects/RevokePanel.tsx'],
  ['VoidCostPanel', '../pilotage/VoidCostPanel.tsx'],
  ['RecurringRowActions', '../pilotage/RecurringRowActions.tsx'],
  ['HideReviewDialog', '../reviews/HideReviewDialog.tsx'],
  ['UnhideReviewForm', '../reviews/UnhideReviewForm.tsx'],
  ['ReissueReviewLinkCard', '../reviews/ReissueReviewLinkCard.tsx'],
];

describe('ConfirmAction rendering', () => {
  it('renders only the trigger while closed, with a live region mounted before any message', () => {
    const html = renderToStaticMarkup(
      createElement(ConfirmAction, {
        triggerLabel: 'Invalider ce coût…',
        confirmLabel: "Confirmer l'invalidation",
        keepLabel: 'Garder le coût',
        action: noop,
      }),
    );
    expect(html).toContain('Invalider ce coût…');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toContain('Garder le coût');
    expect(html).not.toContain('<form');
  });

  it('opens an in-flow panel with a warm outlined confirm and a safe keep button, never an acid fill', () => {
    const html = renderToStaticMarkup(
      createElement(ConfirmAction, {
        triggerLabel: 'Effacer les données…',
        confirmLabel: 'Effacer définitivement',
        keepLabel: 'Garder les données',
        action: noop,
        defaultOpen: true,
        description: 'Cette action est définitive.',
      }),
    );
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('pt-inline-panel');
    expect(html).toContain('pt-confirm-btn');
    expect(html).toContain('Garder les données');
    expect(html).toContain('Effacer définitivement');
    expect(html).not.toContain('pt-btn-primary');
    expect(html).not.toContain('pt-lead-panel');
    expect(html).not.toMatch(/>\s*Annuler\s*</);
  });

  it('puts the safe keep button before the confirm button and shows the loading label with an ellipsis', () => {
    const html = renderToStaticMarkup(
      createElement(ConfirmButtons, {
        confirmLabel: 'Confirmer',
        keepLabel: 'Garder',
        onKeep: noop,
        pending: true,
      }),
    );
    expect(html.indexOf('Garder')).toBeLessThan(html.indexOf('Enregistrement…'));
    expect(html).toContain('disabled');
  });

  it('disables the confirm button until the caller allows it', () => {
    const html = renderToStaticMarkup(
      createElement(ConfirmPanel, {
        action: noop,
        confirmLabel: 'Confirmer',
        keepLabel: 'Garder',
        onKeep: noop,
        confirmDisabled: true,
      }),
    );
    expect(html).toMatch(/<button type="submit"[^>]*disabled/);
  });
});

describe('Pager', () => {
  it('uses the leads wording and ghost buttons', () => {
    const html = renderToStaticMarkup(
      createElement(Pager, { page: 2, pageCount: 3, hasNext: true, hrefFor: (p) => `/x?page=${p}` }),
    );
    expect(html).toContain('Précédent');
    expect(html).toContain('Suivant');
    expect(html).toContain('Page 2 sur 3');
    expect(html).toContain('pt-btn-ghost');
    expect(html).toContain('href="/x?page=1"');
    expect(html).toContain('href="/x?page=3"');
    expect(html).not.toContain('Précédente');
  });
  it('renders nothing on a single page', () => {
    expect(renderToStaticMarkup(createElement(Pager, { page: 1, hasNext: false, hrefFor: () => '/' }))).toBe('');
  });
});

describe('destructive confirmation source guards', () => {
  it.each(CONFIRM_USERS)('%s uses the shared pattern, never an acid fill nor the popover panel', (_n, rel) => {
    const src = read(rel);
    expect(src).toContain('@/components/admin/shared/ConfirmAction');
    expect(src).not.toContain('pt-btn-primary');
    expect(src).not.toContain('pt-lead-panel');
    expect(src).not.toContain('pt-lead-danger');
    expect(src).not.toMatch(/style=\{\{/);
    expect(src).not.toMatch(/>\s*Annuler\s*</);
  });

  it('the confirm button is outlined in --warm and the stylesheet never fills it with --acid', () => {
    const rule = css.match(/\.pt-admin \.pt-confirm-btn\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule![1]).toContain('var(--warm)');
    expect(rule![1]).not.toContain('--acid');
    expect(css).not.toMatch(/\.pt-confirm-btn[^{]*\{[^}]*background:\s*var\(--acid\)/);
  });

  it('ConfirmAction keeps trigger and confirm labels distinct for every caller', () => {
    const pairs: Array<[string, string]> = [
      ['Invalider ce coût…', "Confirmer l'invalidation"],
      ['Arrêter cette charge…', "Confirmer l'arrêt"],
      ['Masquer cet avis…', 'Confirmer le masquage'],
    ];
    for (const [trigger, confirm] of pairs) expect(trigger).not.toBe(confirm);
    expect(read('../pilotage/VoidCostPanel.tsx')).toContain('Invalider ce coût');
    expect(read('../pilotage/VoidCostPanel.tsx')).not.toContain('Annuler ce coût');
    expect(read('../projects/FactJournal.tsx')).not.toContain('Annuler ce fait');
  });

  it('inline forms use the in-flow panel and the popover stays out of the shared stylesheet', () => {
    const rule = css.match(/\.pt-admin \.pt-inline-panel\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule![1]).toContain('position: static');
    expect(rule![1]).not.toContain('absolute');
    expect(css).not.toMatch(/^\s*\.pt-admin \.pt-lead-panel\s*\{/m);
  });
});
