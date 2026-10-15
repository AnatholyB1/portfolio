import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import EmptyState from './EmptyState';
import Skeleton, { clampCount } from './Skeleton';
import { StatusNote, ToastProvider } from './Toast';
import {
  DEFAULT_AUTO_DISMISS_MS,
  MAX_TOASTS,
  liveModeForTone,
  liveRegionProps,
  resolveAutoDismiss,
  toastReducer,
  type ToastItem,
} from './feedback';

const dir = new URL('.', import.meta.url);
const css = readFileSync(new URL('primitives.css', dir), 'utf8');
const portal = readFileSync(new URL('../../app/portal.css', dir), 'utf8');
const globals = readFileSync(new URL('../../app/globals.css', dir), 'utf8');

const item = (id: number, message = `m${id}`, tone: ToastItem['tone'] = 'success'): ToastItem => ({ id, tone, message, autoDismissMs: 3000 });

describe('feedback logic', () => {
  it('auto-dismisses success/info but keeps errors until closed', () => {
    expect(resolveAutoDismiss('success')).toBe(DEFAULT_AUTO_DISMISS_MS.success);
    expect(resolveAutoDismiss('info')).toBe(4000);
    expect(resolveAutoDismiss('error')).toBeNull();
  });

  it('lets callers disable or override auto-dismiss', () => {
    expect(resolveAutoDismiss('success', null)).toBeNull();
    expect(resolveAutoDismiss('success', 0)).toBeNull();
    expect(resolveAutoDismiss('error', 8000)).toBe(8000);
  });

  it('caps the stack and replaces duplicates', () => {
    let s: ToastItem[] = [];
    for (let i = 1; i <= MAX_TOASTS + 2; i++) s = toastReducer(s, { type: 'push', item: item(i) });
    expect(s).toHaveLength(MAX_TOASTS);
    expect(s[0].id).toBe(3);
    s = toastReducer(s, { type: 'push', item: item(99, 'm5') });
    expect(s.filter((t) => t.message === 'm5')).toHaveLength(1);
    expect(s.at(-1)?.id).toBe(99);
  });

  it('dismisses one or clears all', () => {
    const s = [item(1), item(2)];
    expect(toastReducer(s, { type: 'dismiss', id: 1 }).map((t) => t.id)).toEqual([2]);
    expect(toastReducer(s, { type: 'clear' })).toEqual([]);
  });

  it('maps errors to assertive live regions', () => {
    expect(liveModeForTone('error')).toBe('assertive');
    expect(liveModeForTone('success')).toBe('polite');
    expect(liveRegionProps('polite')).toEqual({ role: 'status', 'aria-live': 'polite', 'aria-atomic': true });
    expect(liveRegionProps('assertive').role).toBe('alert');
  });
});

describe('ToastProvider / StatusNote ARIA', () => {
  it('mounts both live regions empty before any message', () => {
    const html = renderToStaticMarkup(createElement(ToastProvider, null, createElement('p', null, 'app')));
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
    expect(html).not.toContain('pt-toast-msg');
  });

  it('renders StatusNote as an always-present live region, even empty', () => {
    const empty = renderToStaticMarkup(createElement(StatusNote, { id: 'n' }));
    expect(empty).toContain('role="status"');
    expect(empty).toContain('data-empty="true"');
    const full = renderToStaticMarkup(createElement(StatusNote, { tone: 'error', live: 'assertive' }, 'Échec'));
    expect(full).toContain('role="alert"');
    expect(full).toContain('pt-status-error');
    expect(full).toContain('Échec');
  });

  it('labels the toast close button', () => {
    const src = readFileSync(new URL('Toast.tsx', dir), 'utf8');
    expect(src).toContain('aria-label="Fermer la notification"');
    expect(src).toContain('onFocus={pause}');
  });
});

describe('EmptyState', () => {
  it('renders a heading, hides the icon from AT and omits empty parts', () => {
    const html = renderToStaticMarkup(createElement(EmptyState, { title: 'Aucun document', description: 'Bientôt.', icon: createElement('svg'), headingLevel: 2 }));
    expect(html).toContain('<h2 class="pt-emptystate-title">Aucun document</h2>');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('pt-emptystate-action');
    const min = renderToStaticMarkup(createElement(EmptyState, { title: 'Vide', compact: true }));
    expect(min).toContain('<h3');
    expect(min).toContain('pt-emptystate-compact');
    expect(min).not.toContain('pt-emptystate-icon');
  });
});

describe('Skeleton', () => {
  it('is a busy status region with a hidden label and aria-hidden shapes', () => {
    const html = renderToStaticMarkup(createElement(Skeleton, { label: 'Chargement des paiements' }));
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('Chargement des paiements');
    expect(html).toContain('class="pt-sk-shapes" aria-hidden="true"');
  });

  it('renders the requested shapes and clamps counts', () => {
    expect(renderToStaticMarkup(createElement(Skeleton, { lines: 4 })).match(/pt-sk-line/g)).toHaveLength(4);
    const table = renderToStaticMarkup(createElement(Skeleton, { variant: 'table', rows: 2, columns: 3 }));
    expect(table.match(/pt-sk-row/g)).toHaveLength(2);
    expect(table).toContain('repeat(3');
    expect(renderToStaticMarkup(createElement(Skeleton, { variant: 'card' }))).toContain('pt-sk-block');
    expect(clampCount(999, 1, 12, 3)).toBe(12);
    expect(clampCount(Number.NaN, 1, 12, 3)).toBe(3);
    expect(clampCount(undefined, 1, 12, 3)).toBe(3);
  });
});

describe('primitives.css', () => {
  it('disables shimmer and toast entrance under reduced motion', () => {
    const block = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(block).toMatch(/\.pt-toast \{\s*animation: none/);
    expect(block).toMatch(/\.pt-sk \{\s*animation: none/);
  });

  it('keeps animations within 400ms and avoids transition: all', () => {
    expect(css).not.toMatch(/transition:\s*all/);
    expect(css).not.toMatch(/animation:[^;]*\b(?:[5-9]\d\d|\d{4,})ms/);
  });

  it('is loaded by portal.css only, not by public globals', () => {
    expect(portal).toContain('components/ui/primitives.css');
    expect(globals).not.toContain('primitives.css');
    expect(globals).not.toMatch(/\.pt-(empty|toast|skeleton|sk\b)/);
  });
});
