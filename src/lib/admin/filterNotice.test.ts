import { describe, expect, it } from 'vitest';
import { ignoredFilterNotice, shownParam } from './filterNotice';

const ALLOWED = ['new', 'qualified'] as const;

describe('ignoredFilterNotice', () => {
  it('stays silent for an absent, empty or accepted value', () => {
    expect(ignoredFilterNotice('Statut', undefined, ALLOWED)).toBeNull();
    expect(ignoredFilterNotice('Statut', '', ALLOWED)).toBeNull();
    expect(ignoredFilterNotice('Statut', '   ', ALLOWED)).toBeNull();
    expect(ignoredFilterNotice('Statut', 'new', ALLOWED)).toBeNull();
  });

  it('names the filter and the refused value', () => {
    expect(ignoredFilterNotice('Statut', 'xxx', ALLOWED)).toBe(
      "Le filtre « Statut : xxx » n'existe pas. La liste est affichée sans ce filtre.",
    );
  });

  it('shortens a very long value', () => {
    const msg = ignoredFilterNotice('Statut', 'x'.repeat(200), ALLOWED) ?? '';
    expect(msg.length).toBeLessThan(120);
    expect(msg).toContain('…');
  });
});

describe('shownParam', () => {
  it('collapses whitespace', () => {
    expect(shownParam('  a   b\n c ')).toBe('a b c');
  });
});
