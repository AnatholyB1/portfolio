import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { REVIEW_HIDE_REASONS, deriveStatus, loadAdminReviews } from './admin';

type Tables = Record<string, { data: unknown[] | null; error: unknown }>;

// Faux client : toute chaîne select/in/order se résout vers les lignes de la table.
function fakeClient(tables: Tables): SupabaseClient {
  return {
    from(name: string) {
      const t = tables[name] ?? { data: [], error: null };
      const chain: Record<string, unknown> = {
        select: () => chain,
        in: () => chain,
        order: () => chain,
        then: (res: (v: unknown) => unknown) => Promise.resolve(t).then(res),
      };
      return chain;
    },
  } as unknown as SupabaseClient;
}

const review = {
  id: 'r1',
  project_id: 'p1',
  rating: 4,
  title: null,
  body: 'Un texte d’avis suffisamment long.',
  display_name: 'Studio Dupont',
  company_name_snapshot: 'Dupont SARL',
  published_at: '2026-10-01T10:00:00Z',
};

describe('REVIEW_HIDE_REASONS', () => {
  it('has exactly the four legal reasons', () => {
    expect(REVIEW_HIDE_REASONS.map((r) => r.value)).toEqual([
      'defamation_or_insult',
      'third_party_personal_data',
      'illegal_content',
      'inauthentic',
    ]);
  });
});

describe('deriveStatus', () => {
  it('derives from the latest action', () => {
    expect(deriveStatus([])).toBe('published');
    expect(deriveStatus([{ action: 'hide' }])).toBe('hidden');
    expect(deriveStatus([{ action: 'unhide' }, { action: 'hide' }])).toBe('published');
  });
});

describe('loadAdminReviews', () => {
  const base: Tables = {
    sv_reviews: { data: [review], error: null },
    sv_projects: { data: [{ id: 'p1', title: 'Site vitrine', client_id: 'c1' }], error: null },
    sv_clients: { data: [{ id: 'c1', name: 'Dupont' }], error: null },
    sv_admins: { data: [{ user_id: 'a1', email: 'admin@example.test' }], error: null },
  };

  it('returns published with empty history when there is no log', async () => {
    const [r] = await loadAdminReviews(fakeClient({ ...base, sv_review_moderation_log: { data: [], error: null } }));
    expect(r.status).toBe('published');
    expect(r.history).toEqual([]);
    expect(r.projectTitle).toBe('Site vitrine');
    expect(r.companyName).toBe('Dupont SARL');
  });

  it('derives hidden after a hide, published after hide then unhide, newest first, labels mapped', async () => {
    const hide = {
      id: 1, review_id: 'r1', action: 'hide', reason: 'illegal_content',
      detail: 'Propos injurieux', actor_id: 'a1', created_at: '2026-10-02T10:00:00Z',
    };
    const unhide = {
      id: 2, review_id: 'r1', action: 'unhide', reason: null,
      detail: 'Erreur corrigée', actor_id: 'a1', created_at: '2026-10-03T10:00:00Z',
    };
    const [hidden] = await loadAdminReviews(
      fakeClient({ ...base, sv_review_moderation_log: { data: [hide], error: null } }),
    );
    expect(hidden.status).toBe('hidden');
    expect(hidden.history[0].reasonLabel).toBe('Contenu illégal');
    expect(hidden.history[0].actorEmail).toBe('admin@example.test');

    const [back] = await loadAdminReviews(
      fakeClient({ ...base, sv_review_moderation_log: { data: [hide, unhide], error: null } }),
    );
    expect(back.status).toBe('published');
    expect(back.history.map((h) => h.id)).toEqual([2, 1]);
    expect(back.history[0].reasonLabel).toBeNull();
  });

  it('throws on a read error', async () => {
    await expect(
      loadAdminReviews(fakeClient({ sv_reviews: { data: null, error: { message: 'x' } } })),
    ).rejects.toThrow();
  });
});
