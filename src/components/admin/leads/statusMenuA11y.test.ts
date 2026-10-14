import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isOutside, menuNavTarget } from './menuNav';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const pill = read('./StatusPill.tsx');
const lost = read('./LostPanel.tsx');
const css = read('./leads.css');

describe('menuNavTarget', () => {
  it('wraps around with the arrow keys', () => {
    expect(menuNavTarget('ArrowDown', 0, 4)).toBe(1);
    expect(menuNavTarget('ArrowDown', 3, 4)).toBe(0);
    expect(menuNavTarget('ArrowUp', 0, 4)).toBe(3);
    expect(menuNavTarget('ArrowUp', 2, 4)).toBe(1);
  });

  it('jumps with Home and End', () => {
    expect(menuNavTarget('Home', 2, 5)).toBe(0);
    expect(menuNavTarget('End', 1, 5)).toBe(4);
  });

  it('closes on Escape and Tab, ignores other keys', () => {
    expect(menuNavTarget('Escape', 1, 3)).toBe('close');
    expect(menuNavTarget('Tab', 1, 3)).toBe('close');
    expect(menuNavTarget('a', 1, 3)).toBeNull();
    expect(menuNavTarget('Enter', 1, 3)).toBeNull();
  });

  it('handles an empty menu', () => {
    expect(menuNavTarget('ArrowDown', -1, 0)).toBeNull();
    expect(menuNavTarget('Escape', -1, 0)).toBe('close');
  });
});

describe('isOutside', () => {
  const inside = {};
  const container = { contains: (n: unknown) => n === inside };
  it('is true only for a target outside the container', () => {
    expect(isOutside(container, {})).toBe(true);
    expect(isOutside(container, inside)).toBe(false);
    expect(isOutside(null, {})).toBe(false);
  });
});

describe('F-D6 status menu markup', () => {
  it('uses a valid menu: named, items owned directly or through role=none forms, roving tabindex', () => {
    expect(pill).toContain('role="menu"');
    expect(pill).toContain('aria-label="Changer le statut"');
    expect(pill).toContain('<form key={s} action={formAction} role="none">');
    expect(pill.match(/role="menuitem"/g)?.length).toBe(2);
    expect(pill.match(/tabIndex=\{-1\}/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('closes on outside click and returns the focus to the pill after a choice', () => {
    expect(pill).toContain("document.addEventListener('pointerdown'");
    expect(pill).toContain("document.removeEventListener('pointerdown'");
    expect(pill).toContain("if (state.status !== 'idle') pillRef.current?.focus()");
  });

  it('never disables the pill that holds the focus while sending', () => {
    expect(pill).not.toContain('disabled={pending}');
    expect(pill).toContain('aria-disabled={pending || undefined}');
    expect(css).toContain('.pt-lead-pill[aria-disabled="true"]');
  });
});

describe('F-D7 lost panel follows the confirmation pattern', () => {
  it('reuses ConfirmPanel with the warm outlined confirm and a safe first button', () => {
    expect(lost).toContain("import { ConfirmPanel } from '@/components/admin/shared/ConfirmAction'");
    expect(lost).toContain('<ConfirmPanel');
    expect(lost).toContain('autoFocus');
    expect(lost).toContain('confirmDisabled={!reason}');
    expect(lost).toContain('Garder le statut actuel');
    expect(lost).toContain('Confirmer la perte');
    expect(lost).not.toContain('pt-btn-primary');
    expect(lost).not.toContain('Annuler la perte');
    expect(lost).not.toContain('Marquer comme perdu');
  });
});
