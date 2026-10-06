import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { toSuppressionView, loadSuppressions } = await import('./suppressionAdmin');

const rows = [
  { id: 1, email_norm: 'a@x.fr', scope: 'marketing', cause: 'unsubscribe', created_at: '2026-10-01T10:00:00Z' },
  { id: 2, email_norm: 'b@x.fr', scope: 'all', cause: 'bounce_permanent', created_at: '2026-10-03T10:00:00Z' },
  { id: 3, email_norm: 'c@x.fr', scope: 'marketing', cause: 'complaint', created_at: '2026-10-02T10:00:00Z' },
];

describe('toSuppressionView', () => {
  it('maps labels and sorts newest first', () => {
    const v = toSuppressionView(rows, []);
    expect(v.map((r) => r.id)).toEqual([2, 3, 1]);
    expect(v[0].causeLabel).toBe('Rebond définitif');
    expect(v[0].flowsLabel).toBe('Tous les e-mails');
    expect(v[1].causeLabel).toBe('Plainte (spam)');
    expect(v[2].causeLabel).toBe('Désinscription');
    expect(v[2].flowsLabel).toBe('Information (avis, actualités)');
    expect(v.every((r) => r.active)).toBe(true);
  });

  it('marks lifted suppressions inactive with reason and date', () => {
    const v = toSuppressionView(rows, [
      { suppression_id: 1, reason: 'Adresse corrigée', created_at: '2026-10-05T09:00:00Z' },
    ]);
    const lifted = v.find((r) => r.id === 1)!;
    expect(lifted.active).toBe(false);
    expect(lifted.liftReason).toBe('Adresse corrigée');
    expect(lifted.liftedAt).toBe('2026-10-05T09:00:00Z');
  });
});

describe('loadSuppressions', () => {
  function client(supErr: unknown, liftErr: unknown) {
    return {
      from: (t: string) => ({
        select: () => {
          const res =
            t === 'sv_mail_suppressions'
              ? { data: rows, error: supErr }
              : { data: [], error: liftErr };
          return Object.assign(Promise.resolve(res), { order: () => Promise.resolve(res) });
        },
      }),
    } as never;
  }

  it('returns views on success', async () => {
    const v = await loadSuppressions(client(null, null));
    expect(v).toHaveLength(3);
  });

  it('returns null on error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await loadSuppressions(client({ message: 'x' }, null))).toBeNull();
    spy.mockRestore();
  });
});
