import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ConfirmAction, { ConfirmPanel, firstFocusTarget, mergeDescribedBy } from './ConfirmAction';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const noop = () => {};

describe('mergeDescribedBy', () => {
  it('adds the id once and keeps the ones already present', () => {
    expect(mergeDescribedBy(null, 'a')).toBe('a');
    expect(mergeDescribedBy('', 'a')).toBe('a');
    expect(mergeDescribedBy('help', 'a')).toBe('help a');
    expect(mergeDescribedBy('help a', 'a')).toBe('help a');
    expect(mergeDescribedBy('  help   err ', 'a')).toBe('help err a');
  });
});

describe('ConfirmPanel accessibility', () => {
  const html = renderToStaticMarkup(
    createElement(
      ConfirmPanel,
      {
        action: noop,
        confirmLabel: 'Confirmer',
        keepLabel: 'Garder',
        onKeep: noop,
        description: "L'ancien lien cesse de fonctionner.",
      },
      createElement('textarea', { name: 'detail' }),
    ),
  );

  it('links the consequence sentence to the form through aria-describedby', () => {
    const id = /aria-describedby="([^"]+)"/.exec(html)?.[1];
    expect(id).toBeTruthy();
    expect(html).toContain(`id="${id}"`);
    expect(html).toContain("L&#x27;ancien lien cesse de fonctionner.");
  });

  it('merges the description id into every field of the panel (effect) and focuses on request', () => {
    const src = read('./ConfirmAction.tsx');
    expect(src).toContain('querySelectorAll<HTMLElement>(FIELD_SELECTOR)');
    expect(src).toContain("field.setAttribute('aria-describedby'");
    expect(src).toContain('autoFocus');
  });

  it('keeps the confirm button focusable while sending (aria-disabled, no disabled attribute)', () => {
    const pending = renderToStaticMarkup(
      createElement(ConfirmPanel, {
        action: noop,
        confirmLabel: 'Confirmer',
        keepLabel: 'Garder',
        onKeep: noop,
        pending: true,
        pendingLabel: 'Envoi…',
      }),
    );
    expect(pending).toContain('aria-disabled="true"');
    expect(pending).toContain('Envoi…');
    expect(pending).not.toMatch(/<button[^>]*type="submit"[^>]*\sdisabled/);
  });

  it('still disables a confirm that is not allowed yet (empty reason)', () => {
    const blocked = renderToStaticMarkup(
      createElement(ConfirmPanel, {
        action: noop,
        confirmLabel: 'Confirmer',
        keepLabel: 'Garder',
        onKeep: noop,
        confirmDisabled: true,
      }),
    );
    expect(blocked).toMatch(/<button[^>]*type="submit"[^>]*disabled/);
  });
});

describe('ConfirmAction focus rules', () => {
  it('returns the focus to the trigger (or the declared fallback) after a success', () => {
    const src = read('./ConfirmAction.tsx');
    expect(src).toContain("if (!succeeded) return;");
    expect(src).toContain('successFocusId');
    expect(src).toContain('document.getElementById(successFocusId)');
  });

  it('exposes the optional success focus target without changing the closed markup', () => {
    const html = renderToStaticMarkup(
      createElement(ConfirmAction, {
        triggerLabel: 'Enregistrer…',
        confirmLabel: 'Confirmer',
        keepLabel: 'Garder',
        action: noop,
        successFocusId: 'pf-type-1',
      }),
    );
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('pf-type-1');
  });

  it('finds the first field of a panel, or the keep button when there is none', () => {
    const root = {
      querySelector: (sel: string) => (sel.includes('[data-confirm-keep]') ? ({ tag: 'x' } as unknown as HTMLElement) : null),
    } as unknown as ParentNode;
    expect(firstFocusTarget(root)).toEqual({ tag: 'x' });
    expect(firstFocusTarget(null)).toBeNull();
  });
});

describe('panels that unmount on success keep focus and announcement', () => {
  it('RevokePanel focuses its reason on open and FactJournal restores focus and announces', () => {
    const revoke = read('../projects/RevokePanel.tsx');
    const journal = read('../projects/FactJournal.tsx');
    expect(revoke).toContain('autoFocus');
    expect(revoke).toContain('onClose(true)');
    expect(revoke).toContain('onKeep={() => onClose(false)}');
    expect(journal).toContain('role="status"');
    expect(journal).toContain('refocus.current');
    expect(journal).toContain('aria-label={`Invalider ce fait : ${label}`}');
    expect(journal).toContain('tabIndex={-1}');
  });

  it('LiftSuppressionForm stays mounted: live region first, focus on the result', () => {
    const lift = read('../mail/LiftSuppressionForm.tsx');
    const page = read('../../../app/admin/emails/page.tsx');
    expect(lift).toContain('aria-live="polite"');
    expect(lift).toContain('doneRef.current?.focus()');
    expect(lift).toContain('active?: boolean');
    expect(page).toContain('<LiftSuppressionForm suppressionId={r.id} active={r.active} />');
    expect(page).not.toMatch(/r\.active \? <LiftSuppressionForm/);
  });

  it('ReissueReviewLinkCard announces the new link and moves the focus to it', () => {
    const card = read('../reviews/ReissueReviewLinkCard.tsx');
    expect(card).toContain('role="status"');
    expect(card).toContain("Nouveau lien d'avis prêt");
    expect(card).toContain('urlRef.current?.focus()');
    expect(card).toContain('type="text"');
  });

  it('PostFactForm falls back to the fact select after a success', () => {
    expect(read('../projects/PostFactForm.tsx')).toContain('successFocusId={`pf-type-${projectId}`}');
  });
});
