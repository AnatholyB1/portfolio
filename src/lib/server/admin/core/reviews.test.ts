import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deriveReviewToken, hashReviewToken } from '@/lib/reviews/token';

const rpc = vi.hoisted(() => ({ callRpc: vi.fn() }));
const outbox = vi.hoisted(() => ({ sendOutboxRow: vi.fn() }));
vi.mock('@/lib/server/rpc', () => rpc);
vi.mock('@/lib/server/mail/outbox', () => outbox);
vi.mock('@/lib/server/mail/urls', () => ({
  buildReviewUrl: (t: string) => `https://example.test/avis/${t}`,
}));

import { hideReviewCore, reissueReviewLinkCore, unhideReviewCore } from './reviews';

const ctx = { supabase: {} as never, user: { id: 'admin-1' } as never };
const RID = '3f2b8a52-1c4e-4b7a-9d3e-5a6b7c8d9e0f';
const PID = '3f2b8a52-1c4e-4b7a-9d3e-5a6b7c8d9e0f';
const SECRET = 's'.repeat(40);
const ERR = 'Action impossible. Vérifiez le motif et le détail puis réessayez.';
const UNCHANGED = "Aucun changement : l'avis est déjà dans cet état.";
const GENERIC = 'La réémission a échoué. Réessayez dans un instant.';

beforeEach(() => {
  rpc.callRpc.mockReset();
  outbox.sendOutboxRow.mockReset();
  outbox.sendOutboxRow.mockResolvedValue(undefined);
  vi.stubEnv('REVIEW_TOKEN_SECRET', SECRET);
});
afterEach(() => vi.unstubAllEnvs());

describe('hideReviewCore', () => {
  const base = { reviewId: RID, reason: 'illegal_content', detail: 'Propos injurieux visant un tiers' };
  beforeEach(() => {
    rpc.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'hidden', outbox_ids: ['o1', 'o2'] } });
  });
  it('hides with the actor, sends each notice', async () => {
    expect(await hideReviewCore(ctx, base)).toEqual({ ok: true, message: 'Avis masqué. Son auteur est prévenu par e-mail.' });
    expect(rpc.callRpc).toHaveBeenCalledWith('admin/avis', 'sv_moderate_review', {
      p_review_id: RID,
      p_action: 'hide',
      p_reason: 'illegal_content',
      p_detail: 'Propos injurieux visant un tiers',
      p_actor_id: 'admin-1',
    });
    expect(outbox.sendOutboxRow).toHaveBeenCalledTimes(2);
  });
  it('rejects reasons outside the closed list and bad details without RPC', async () => {
    for (const reason of ['negative', 'low_rating', '']) expect(await hideReviewCore(ctx, { ...base, reason })).toEqual({ ok: false, message: ERR });
    expect((await hideReviewCore(ctx, { ...base, detail: 'ab' })).ok).toBe(false);
    expect((await hideReviewCore(ctx, { ...base, detail: 'x'.repeat(501) })).message).toBe(ERR);
    expect(rpc.callRpc).not.toHaveBeenCalled();
  });
  it('still succeeds when sending the notice throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    outbox.sendOutboxRow.mockRejectedValue(new Error('smtp'));
    expect((await hideReviewCore(ctx, base)).ok).toBe(true);
  });
  it('maps unchanged and rpc failure without sending notices', async () => {
    rpc.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'unchanged' } });
    expect(await hideReviewCore(ctx, base)).toEqual({ ok: false, message: UNCHANGED });
    rpc.callRpc.mockResolvedValue({ ok: false, code: 'unknown' });
    expect(await hideReviewCore(ctx, base)).toEqual({ ok: false, message: ERR });
    expect(outbox.sendOutboxRow).not.toHaveBeenCalled();
  });
});

describe('unhideReviewCore', () => {
  const base = { reviewId: RID, detail: 'Erreur de modération corrigée' };
  beforeEach(() => {
    rpc.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'unhidden', outbox_ids: [] } });
  });
  it('unhides with a null reason', async () => {
    expect(await unhideReviewCore(ctx, base)).toEqual({ ok: true, message: 'Masquage levé.' });
    expect(rpc.callRpc).toHaveBeenCalledWith('admin/avis', 'sv_moderate_review', {
      p_review_id: RID,
      p_action: 'unhide',
      p_reason: null,
      p_detail: 'Erreur de modération corrigée',
      p_actor_id: 'admin-1',
    });
  });
  it('rejects a short detail and handles unchanged', async () => {
    expect((await unhideReviewCore(ctx, { ...base, detail: 'a' })).ok).toBe(false);
    expect(rpc.callRpc).not.toHaveBeenCalled();
    rpc.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'unchanged' } });
    expect(await unhideReviewCore(ctx, base)).toEqual({ ok: false, message: UNCHANGED });
  });
});

describe('reissueReviewLinkCore', () => {
  const base = { projectId: PID, detail: 'Le client a perdu le premier e-mail' };
  beforeEach(() => {
    rpc.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'reissued' } });
  });
  it('reissues with a derived token hash and returns the url', async () => {
    const res = await reissueReviewLinkCore(ctx, base);
    const [scope, fn, p] = rpc.callRpc.mock.calls[0] as [string, string, Record<string, string>];
    expect([scope, fn]).toEqual(['admin/avis', 'sv_reissue_review_link']);
    expect(p).toMatchObject({ p_project_id: PID, p_actor_id: 'admin-1', p_detail: base.detail });
    const token = deriveReviewToken(p.p_link_id, SECRET);
    expect(p.p_token_hash).toBe(hashReviewToken(token));
    expect(res).toEqual({
      ok: true,
      message: "Nouveau lien d'avis (affiché une seule fois)",
      data: { url: `https://example.test/avis/${token}` },
    });
  });
  it('fails without secret and does not call the RPC', async () => {
    vi.stubEnv('REVIEW_TOKEN_SECRET', '');
    expect(await reissueReviewLinkCore(ctx, base)).toEqual({
      ok: false,
      message: "Réémission impossible : la configuration des liens d'avis est incomplète.",
    });
    expect(rpc.callRpc).not.toHaveBeenCalled();
  });
  it('rejects bad detail or project id without RPC', async () => {
    expect(await reissueReviewLinkCore(ctx, { ...base, detail: 'ab' })).toEqual({ ok: false, message: GENERIC });
    expect((await reissueReviewLinkCore(ctx, { ...base, projectId: 'nope' })).ok).toBe(false);
    expect(rpc.callRpc).not.toHaveBeenCalled();
  });
  it('maps reviewed, not_signed and failures (never a url)', async () => {
    rpc.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'reviewed' } });
    expect(await reissueReviewLinkCore(ctx, base)).toEqual({ ok: false, message: 'Un avis a déjà été déposé pour ce projet.' });
    rpc.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'not_signed' } });
    expect(await reissueReviewLinkCore(ctx, base)).toEqual({ ok: false, message: "Le PV de ce projet n'est pas signé." });
    rpc.callRpc.mockResolvedValue({ ok: false, code: 'unknown' });
    expect(await reissueReviewLinkCore(ctx, base)).toEqual({ ok: false, message: GENERIC });
  });
  it('never logs the token or url', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    const res = await reissueReviewLinkCore(ctx, base);
    const url = res.ok ? res.data?.url : undefined;
    expect(url).toBeTruthy();
    for (const s of spies) {
      expect(JSON.stringify(s.mock.calls)).not.toContain(url ?? 'zzz-none');
      s.mockRestore();
    }
  });
});
