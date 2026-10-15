import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ notify: () => 0 }) }));
import { successMessage } from './useSuccessToast';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

describe('successMessage', () => {
  it('returns the message for both state shapes, only on success', () => {
    expect(successMessage({ status: 'success', message: 'Enregistré' })).toBe('Enregistré');
    expect(successMessage({ ok: true, message: 'Fait' })).toBe('Fait');
    expect(successMessage({ status: 'error', message: 'Non' })).toBeNull();
    expect(successMessage({ ok: false, message: 'Non' })).toBeNull();
    expect(successMessage({ status: 'idle' })).toBeNull();
    expect(successMessage({ status: 'success' })).toBeNull();
  });
});

describe('action feedback wiring', () => {
  it('mounts the toast provider once in the admin layout', () => {
    const layout = read('../../../app/admin/layout.tsx');
    expect(layout).toContain('<ToastProvider>');
  });

  it('announces success by toast where the acting panel disappears with the action', () => {
    for (const f of ['../leads/StatusPill.tsx', '../leads/LostPanel.tsx', '../projects/RevokePanel.tsx', '../funnel/CostEditor.tsx', '../ResendButton.tsx']) {
      expect(read(f)).toContain('useSuccessToast(');
    }
  });

  it('keeps errors announced assertively inline (StatusNote) next to the control', () => {
    expect(read('../ResendButton.tsx')).toContain('<StatusNote tone="error" live="assertive"');
    expect(read('../funnel/CostEditor.tsx')).toContain('<StatusNote tone="error" live="assertive"');
  });
});
