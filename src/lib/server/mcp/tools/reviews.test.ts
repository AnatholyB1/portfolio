import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runTool } from '../registry';
import { confirmTwoStep } from '../testing';

const rpc = vi.hoisted(() => ({ callRpc: vi.fn() }));
const outbox = vi.hoisted(() => ({ sendOutboxRow: vi.fn() }));
const admin = vi.hoisted(() => ({
  loadAdminReviews: vi.fn(),
  REVIEW_HIDE_REASONS: [
    { value: 'defamation_or_insult', label: 'Diffamation ou injure' },
    { value: 'third_party_personal_data', label: "Données personnelles d'un tiers" },
    { value: 'illegal_content', label: 'Contenu illégal' },
    { value: 'inauthentic', label: 'Avis non authentique ou usurpation' },
  ],
}));
const links = vi.hoisted(() => ({ loadOpenReviewLinks: vi.fn(), loadReviewLinkStatus: vi.fn() }));
vi.mock('@/lib/server/rpc', () => rpc);
vi.mock('@/lib/server/mail/outbox', () => outbox);
vi.mock('@/lib/server/mail/urls', () => ({ buildReviewUrl: (t: string) => `https://example.test/avis/${t}` }));
vi.mock('@/lib/server/reviews/admin', () => admin);
vi.mock('@/lib/server/reviews/linksAdmin', () => links);

import { reviewTools } from './reviews';

const RID = '3f2b8a52-1c4e-4b7a-9d3e-5a6b7c8d9e0f';
const PID = '4f2b8a52-1c4e-4b7a-9d3e-5a6b7c8d9e0f';
const principal = { tokenId: 't1', userId: 'admin-1' };
const audit = vi.fn();
const ctx = { supabase: {} as never, user: { id: 'admin-1' } as never };
const tool = (name: string) => {
  const t = reviewTools.find((x) => x.name === name);
  if (!t) throw new Error(`missing tool ${name}`);
  return t;
};

beforeEach(() => {
  audit.mockReset();
  for (const f of [rpc.callRpc, outbox.sendOutboxRow, admin.loadAdminReviews, links.loadOpenReviewLinks, links.loadReviewLinkStatus]) f.mockReset();
  outbox.sendOutboxRow.mockResolvedValue(undefined);
  vi.stubEnv('REVIEW_TOKEN_SECRET', 's'.repeat(40));
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.unstubAllEnvs());

describe('reviewTools metadata', () => {
  it('declares exact names, covers and destructive flags', () => {
    expect(Object.fromEntries(reviewTools.map((t) => [t.name, t.covers]))).toEqual({
      list_reviews: [],
      list_open_review_links: [],
      hide_review: ['hideReviewAction'],
      unhide_review: ['unhideReviewAction'],
      reissue_review_link: ['reissueReviewLinkAction'],
    });
    expect(reviewTools.filter((t) => t.destructive).map((t) => t.name).sort()).toEqual(['hide_review', 'reissue_review_link']);
  });
});

describe('hide_review', () => {
  const args = { reviewId: RID, reason: 'illegal_content', detail: 'Propos injurieux visant un tiers' };
  it('without confirm never hides and previews the effects', async () => {
    const r = await runTool(tool('hide_review'), args, ctx, principal, audit);
    expect(rpc.callRpc).not.toHaveBeenCalled();
    expect(r).toMatchObject({ ok: true, needsConfirmation: true });
    const json = JSON.stringify(r);
    expect(json).toContain(RID);
    expect(json).toContain('Contenu illégal');
    expect(json).toMatch(/e-mail/);
  });
  it('with confirm hides and notifies', async () => {
    rpc.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'hidden', outbox_ids: ['o1'] } });
    const r = await confirmTwoStep(tool('hide_review'), { ...args }, ctx, principal, audit);
    expect(rpc.callRpc).toHaveBeenCalledWith('admin/avis', 'sv_moderate_review', expect.objectContaining({ p_action: 'hide', p_actor_id: 'admin-1' }));
    expect(outbox.sendOutboxRow).toHaveBeenCalledWith('o1');
    expect(r).toMatchObject({ ok: true, data: { ok: true } });
  });
  it('rejects a reason outside the closed list as invalid_input', async () => {
    expect(await confirmTwoStep(tool('hide_review'), { ...args, reason: 'low_rating' }, ctx, principal, audit)).toEqual({ ok: false, error: 'invalid_input' });
  });
  it('unchanged is an audited error', async () => {
    rpc.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'unchanged' } });
    const r = await confirmTwoStep(tool('hide_review'), { ...args }, ctx, principal, audit);
    expect(r.ok).toBe(false);
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ outcome: 'error' }));
  });
});

describe('unhide_review', () => {
  it('runs without confirmation and unhides', async () => {
    rpc.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'unhidden', outbox_ids: [] } });
    const r = await runTool(tool('unhide_review'), { reviewId: RID, detail: 'Erreur de modération' }, ctx, principal, audit);
    expect(rpc.callRpc).toHaveBeenCalledWith('admin/avis', 'sv_moderate_review', expect.objectContaining({ p_action: 'unhide', p_reason: null }));
    expect(r).toMatchObject({ ok: true, data: { ok: true } });
  });
});

describe('reissue_review_link', () => {
  const args = { projectId: PID, detail: 'Le client a perdu le premier e-mail' };
  it('without confirm never reissues and previews the current link status', async () => {
    links.loadReviewLinkStatus.mockResolvedValue({ status: { kind: 'active', expiresAt: '2026-12-01' }, reviewFiled: false });
    const r = await runTool(tool('reissue_review_link'), args, ctx, principal, audit);
    expect(rpc.callRpc).not.toHaveBeenCalled();
    expect(links.loadReviewLinkStatus).toHaveBeenCalledWith(ctx.supabase, PID);
    expect(r).toMatchObject({ ok: true, needsConfirmation: true });
    const json = JSON.stringify(r);
    expect(json).toContain(PID);
    expect(json).toContain('active');
    expect(json).toMatch(/invalid/i);
  });
  it('previews without status when the read fails', async () => {
    links.loadReviewLinkStatus.mockRejectedValue(new Error('x'));
    const r = await runTool(tool('reissue_review_link'), args, ctx, principal, audit);
    expect(r).toMatchObject({ ok: true, needsConfirmation: true });
  });
  it('with confirm reissues and returns the url once', async () => {
    rpc.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'reissued' } });
    const r = await confirmTwoStep(tool('reissue_review_link'), { ...args }, ctx, principal, audit);
    expect(r).toMatchObject({ ok: true, data: { ok: true, data: { url: expect.stringContaining('https://example.test/avis/') } } });
    // L'URL est un secret : jamais dans l'audit.
    expect(JSON.stringify(audit.mock.calls)).not.toContain('example.test');
  });
  it('reviewed is an audited error', async () => {
    rpc.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'reviewed' } });
    const r = await confirmTwoStep(tool('reissue_review_link'), { ...args }, ctx, principal, audit);
    expect(r).toEqual({ ok: false, error: 'Un avis a déjà été déposé pour ce projet.' });
  });
});

describe('review fixes', () => {
  const longBody = 'x'.repeat(300);
  const rv = (status: string) => ({
    id: 'r', publishedAt: 'd', projectId: PID, projectTitle: 'Refonte', companyName: 'Dupont', rating: 1, title: null,
    body: longBody, displayName: 'Jean D.', status, history: [],
  });
  it('list_reviews truncates the body of hidden reviews to 80 characters and keeps published ones whole', async () => {
    admin.loadAdminReviews.mockResolvedValue([rv('hidden'), rv('published')]);
    const r = await runTool(tool('list_reviews'), {}, ctx, principal, audit);
    const reviews = (r as { data: { reviews: { status: string; body: string }[] } }).data.reviews;
    expect(reviews[0].body.length).toBeLessThanOrEqual(80);
    expect(reviews[0].body.endsWith('…')).toBe(true);
    expect(reviews[1].body).toBe(longBody);
  });
  it('list_reviews caps page at 100', async () => {
    expect(await runTool(tool('list_reviews'), { page: 101 }, ctx, principal, audit)).toEqual({ ok: false, error: 'invalid_input' });
  });
  it('reissue_review_link warns that the one-time url persists in the transcript', () => {
    expect(tool('reissue_review_link').description).toMatch(/transcription|historique de la conversation/);
    expect(tool('reissue_review_link').description).toMatch(/URL/);
  });
});

describe('list_reviews', () => {
  const review = (id: string) => ({
    id,
    publishedAt: 'd',
    projectId: PID,
    projectTitle: 'Refonte',
    companyName: 'Dupont',
    rating: 5,
    title: null,
    body: 'Super',
    displayName: 'Jean D.',
    status: 'published',
    history: [{ id: 1, action: 'hide', reason: 'inauthentic', reasonLabel: 'x', detail: 'd', actorEmail: 'alice@dupont.fr', createdAt: 'c' }],
  });
  it('reads through loadAdminReviews with the RLS client and masks actor e-mails', async () => {
    admin.loadAdminReviews.mockResolvedValue([review('r1')]);
    const r = await runTool(tool('list_reviews'), { page: 2, limit: 10 }, ctx, principal, audit);
    expect(admin.loadAdminReviews).toHaveBeenCalledWith(ctx.supabase, { from: 10, to: 20 });
    const json = JSON.stringify(r);
    expect(json).toContain('a***@d***.fr');
    expect(json).not.toContain('alice@dupont.fr');
    expect(r).toMatchObject({ ok: true, data: { page: 2, hasNext: false } });
  });
  it('reports hasNext and trims the extra row', async () => {
    admin.loadAdminReviews.mockResolvedValue([review('a'), review('b'), review('c')]);
    const r = await runTool(tool('list_reviews'), { limit: 2 }, ctx, principal, audit);
    expect(r).toMatchObject({ ok: true, data: { hasNext: true } });
    expect((r as { data: { reviews: unknown[] } }).data.reviews).toHaveLength(2);
  });
});

describe('list_open_review_links', () => {
  it('lists project links without client names', async () => {
    links.loadOpenReviewLinks.mockResolvedValue([{ projectId: PID, projectTitle: 'Refonte', companyName: 'Dupont SARL', status: { kind: 'active', expiresAt: 'e' } }]);
    const r = await runTool(tool('list_open_review_links'), {}, ctx, principal, audit);
    expect(links.loadOpenReviewLinks).toHaveBeenCalledWith(ctx.supabase);
    expect(r).toMatchObject({ ok: true, data: { links: [{ projectId: PID, projectTitle: 'Refonte', status: { kind: 'active' } }] } });
    expect(JSON.stringify(r)).not.toContain('Dupont SARL');
  });
  it('fails when the read fails', async () => {
    links.loadOpenReviewLinks.mockRejectedValue(new Error('x'));
    expect(await runTool(tool('list_open_review_links'), {}, ctx, principal, audit)).toEqual({ ok: false, error: 'tool_failed' });
  });
});
