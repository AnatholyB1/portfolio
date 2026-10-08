import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deriveReviewToken, hashReviewToken } from '@/lib/reviews/token';

const requireAdmin = vi.fn();
vi.mock('@/lib/server/auth/dal', () => ({ requireAdmin: () => requireAdmin() }));

const callRpc = vi.fn();
vi.mock('@/lib/server/rpc', () => ({ callRpc: (...a: unknown[]) => callRpc(...a) }));

const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: (p: string) => revalidatePath(p) }));

vi.mock('@/lib/server/mail/urls', () => ({
  buildReviewUrl: (t: string) => `https://example.test/avis/${t}`,
}));

const { reissueReviewLinkAction } = await import('./reissue.actions');

const idle = { ok: false, message: null, url: null };
const PID = '3f2b8a52-1c4e-4b7a-9d3e-5a6b7c8d9e0f';
const SECRET = 's'.repeat(40);
function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}
const base = { projectId: PID, detail: 'Le client a perdu le premier e-mail' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('REVIEW_TOKEN_SECRET', SECRET);
  requireAdmin.mockResolvedValue({ user: { id: 'admin-1' } });
  callRpc.mockResolvedValue({ ok: true, data: { outcome: 'reissued' } });
});
afterEach(() => vi.unstubAllEnvs());

describe('reissueReviewLinkAction', () => {
  it('never reaches the RPC for a non-admin', async () => {
    requireAdmin.mockRejectedValue(new Error('NOT_FOUND'));
    await expect(reissueReviewLinkAction(idle, form(base))).rejects.toThrow('NOT_FOUND');
    expect(callRpc).not.toHaveBeenCalled();
  });

  it('reissues with a derived token hash and returns the url once', async () => {
    const res = await reissueReviewLinkAction(idle, form(base));
    const args = callRpc.mock.calls[0];
    expect(args[1]).toBe('sv_reissue_review_link');
    const p = args[2] as Record<string, string>;
    expect(p.p_project_id).toBe(PID);
    expect(p.p_actor_id).toBe('admin-1');
    expect(p.p_detail).toBe(base.detail);
    expect(p.p_link_id).toMatch(/^[0-9a-f-]{36}$/);
    const token = deriveReviewToken(p.p_link_id, SECRET);
    expect(p.p_token_hash).toBe(hashReviewToken(token));
    expect(res).toEqual({
      ok: true,
      message: "Nouveau lien d'avis (affiché une seule fois)",
      url: `https://example.test/avis/${token}`,
    });
    expect(revalidatePath).toHaveBeenCalledWith('/admin/avis');
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/projets/${PID}`);
  });

  it('fails without secret and does not call the RPC', async () => {
    vi.stubEnv('REVIEW_TOKEN_SECRET', '');
    const res = await reissueReviewLinkAction(idle, form(base));
    expect(res).toEqual({
      ok: false,
      message: "Réémission impossible : la configuration des liens d'avis est incomplète.",
      url: null,
    });
    expect(callRpc).not.toHaveBeenCalled();
  });

  it('rejects bad detail or project id without RPC', async () => {
    expect((await reissueReviewLinkAction(idle, form({ ...base, detail: 'ab' }))).ok).toBe(false);
    expect((await reissueReviewLinkAction(idle, form({ ...base, detail: 'x'.repeat(501) }))).ok).toBe(false);
    expect((await reissueReviewLinkAction(idle, form({ ...base, projectId: 'nope' }))).ok).toBe(false);
    expect(callRpc).not.toHaveBeenCalled();
  });

  it('maps reviewed and not_signed', async () => {
    callRpc.mockResolvedValue({ ok: true, data: { outcome: 'reviewed' } });
    const a = await reissueReviewLinkAction(idle, form(base));
    expect(a).toEqual({ ok: false, message: 'Un avis a déjà été déposé pour ce projet.', url: null });
    callRpc.mockResolvedValue({ ok: true, data: { outcome: 'not_signed' } });
    const b = await reissueReviewLinkAction(idle, form(base));
    expect(b).toEqual({ ok: false, message: "Le PV de ce projet n'est pas signé.", url: null });
  });

  it('returns a generic error on RPC failure with no url', async () => {
    callRpc.mockResolvedValue({ ok: false, code: 'unknown' });
    const res = await reissueReviewLinkAction(idle, form(base));
    expect(res.ok).toBe(false);
    expect(res.url).toBeNull();
  });

  it('never logs the token or url', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    );
    const res = await reissueReviewLinkAction(idle, form(base));
    for (const s of spies) {
      expect(JSON.stringify(s.mock.calls)).not.toContain(res.url ?? 'zzz-none');
      s.mockRestore();
    }
  });
});
