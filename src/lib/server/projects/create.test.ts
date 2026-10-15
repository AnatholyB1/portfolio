import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ callRpc: vi.fn(), sync: vi.fn() }));
vi.mock('@/lib/server/rpc', () => ({ callRpc: mocks.callRpc }));
vi.mock('@/lib/server/projects/onboarding', () => ({ syncOnboardingFacts: mocks.sync }));

import { createProject } from './create';

const CLIENT = '11111111-1111-4111-8111-111111111111';
const valid = { clientId: CLIENT, offer: 'site-vitrine', projectTitle: 'Site Acme' };
const actor = { userId: 'admin-1' };

let errSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.callRpc.mockResolvedValue({ ok: true, data: { project_id: 'p1' } });
  mocks.sync.mockResolvedValue(undefined);
});

describe('createProject', () => {
  it.each([
    ['offre inconnue', { ...valid, offer: 'nope' }],
    ['titre vide', { ...valid, projectTitle: '   ' }],
    ['titre de 81 caracteres', { ...valid, projectTitle: 'x'.repeat(81) }],
    ['clientId non uuid', { ...valid, clientId: 'abc' }],
  ])('rejette une entree invalide (%s) sans appel RPC', async (_n, input) => {
    expect(await createProject(input, actor)).toEqual({ ok: false, code: 'invalid' });
    expect(mocks.callRpc).not.toHaveBeenCalled();
    expect(mocks.sync).not.toHaveBeenCalled();
  });

  it("cree le projet avec les bons parametres RPC et synchronise l'onboarding", async () => {
    const res = await createProject({ ...valid, projectTitle: '  Site Acme  ' }, actor);
    expect(res).toEqual({ ok: true, projectId: 'p1', title: 'Site Acme' });
    expect(mocks.callRpc).toHaveBeenCalledWith('admin/create-project', 'sv_create_project', {
      p_client_id: CLIENT,
      p_actor: 'admin-1',
      p_title: 'Site Acme',
      p_offer: 'site-vitrine',
    });
    expect(mocks.sync).toHaveBeenCalledWith(CLIENT, { silent: true });
  });

  it('mappe sv_client_not_found vers client_not_found sans sync', async () => {
    mocks.callRpc.mockResolvedValue({ ok: false, code: 'sv_client_not_found' });
    expect(await createProject(valid, actor)).toEqual({ ok: false, code: 'client_not_found' });
    expect(mocks.sync).not.toHaveBeenCalled();
  });

  it.each(['sv_invalid_offer', 'sv_invalid_title'])('mappe %s vers invalid', async (code) => {
    mocks.callRpc.mockResolvedValue({ ok: false, code });
    expect(await createProject(valid, actor)).toEqual({ ok: false, code: 'invalid' });
    expect(mocks.sync).not.toHaveBeenCalled();
  });

  it('mappe une erreur inconnue vers error', async () => {
    mocks.callRpc.mockResolvedValue({ ok: false, code: 'boom' });
    expect(await createProject(valid, actor)).toEqual({ ok: false, code: 'error' });
    expect(mocks.sync).not.toHaveBeenCalled();
  });

  it("reussit meme si la sync onboarding echoue", async () => {
    mocks.sync.mockRejectedValue(new Error('down'));
    expect(await createProject(valid, actor)).toEqual({ ok: true, projectId: 'p1', title: 'Site Acme' });
    expect(errSpy).toHaveBeenCalledWith('[admin/create-project] onboarding sync failed');
  });
});
