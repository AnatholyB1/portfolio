import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAdmin = vi.fn();
vi.mock('@/lib/server/auth/dal', () => ({ requireAdmin: () => requireAdmin() }));

const getAccessibleProject = vi.fn();
vi.mock('@/lib/server/projects/access', () => ({
  getAccessibleProject: (...a: unknown[]) => getAccessibleProject(...a),
}));

const addProjectLink = vi.fn();
vi.mock('@/lib/server/projects/content', () => ({
  addProjectLink: (...a: unknown[]) => addProjectLink(...a),
}));

const postProjectFact = vi.fn();
const revokeProjectFact = vi.fn();
vi.mock('@/lib/server/projects/facts', () => ({
  postProjectFact: (...a: unknown[]) => postProjectFact(...a),
  revokeProjectFact: (...a: unknown[]) => revokeProjectFact(...a),
}));

const requestUpload = vi.fn();
const confirmUpload = vi.fn();
const createDownloadUrl = vi.fn();
vi.mock('@/lib/server/projects/files', () => ({
  requestUpload: (...a: unknown[]) => requestUpload(...a),
  confirmUpload: (...a: unknown[]) => confirmUpload(...a),
  createDownloadUrl: (...a: unknown[]) => createDownloadUrl(...a),
}));

const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: (p: string) => revalidatePath(p) }));

const {
  postFactAction,
  revokeFactAction,
  addLinkAction,
  adminRequestUploadAction,
  adminConfirmUploadAction,
  adminDownloadAction,
} = await import('./actions');

const ID = '11111111-1111-4111-8111-111111111111';
const idle = { status: 'idle' as const };
const supabase = { tag: 'rls' };

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const okResult = (over: Record<string, unknown> = {}) => ({
  ok: true,
  changed: true,
  factId: 5,
  stepBefore: 2,
  stepAfter: 3,
  done: false,
  mail: 'sent',
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ user: { id: 'admin-1' }, supabase });
  getAccessibleProject.mockResolvedValue({ id: ID, clientId: 'c1' });
  postProjectFact.mockResolvedValue(okResult());
  revokeProjectFact.mockResolvedValue(okResult());
  addProjectLink.mockResolvedValue({ ok: true });
  requestUpload.mockResolvedValue({ ok: true, fileId: 'f1', signedUrl: 'https://s/u', token: 't', path: 'p' });
  confirmUpload.mockResolvedValue({ ok: true });
  createDownloadUrl.mockResolvedValue({ ok: true, url: 'https://s/d' });
});

const guarded: [string, () => Promise<unknown>, ReturnType<typeof vi.fn>][] = [
  ['postFactAction', () => postFactAction(idle, form({ projectId: ID, type: 'quote_accepted' })), postProjectFact],
  [
    'revokeFactAction',
    () => revokeFactAction(idle, form({ projectId: ID, factId: '3', reason: 'Erreur de saisie' })),
    revokeProjectFact,
  ],
  [
    'addLinkAction',
    () => addLinkAction(idle, form({ projectId: ID, title: 'Maquette', url: 'https://x.fr/a' })),
    addProjectLink,
  ],
  [
    'adminRequestUploadAction',
    () => adminRequestUploadAction({ projectId: ID, filename: 'a.pdf', size: 10, mime: 'application/pdf' }),
    requestUpload,
  ],
  ['adminConfirmUploadAction', () => adminConfirmUploadAction('f1'), confirmUpload],
  ['adminDownloadAction', () => adminDownloadAction('f1'), createDownloadUrl],
];

describe.each(guarded)('%s guard', (_n, run, service) => {
  it('propagates requireAdmin rejection and calls no service', async () => {
    requireAdmin.mockRejectedValue(new Error('NOT_FOUND'));
    await expect(run()).rejects.toThrow('NOT_FOUND');
    expect(service).not.toHaveBeenCalled();
  });
  it('calls requireAdmin before the service', async () => {
    await run();
    expect(requireAdmin.mock.invocationCallOrder[0]).toBeLessThan(service.mock.invocationCallOrder[0]);
  });
});

describe('postFactAction', () => {
  it('refuses system-only onboarding_completed', async () => {
    const r = await postFactAction(idle, form({ projectId: ID, type: 'onboarding_completed' }));
    expect(r.status).toBe('error');
    expect(postProjectFact).not.toHaveBeenCalled();
  });
  it('refuses when project is not visible through RLS', async () => {
    getAccessibleProject.mockResolvedValue(null);
    const r = await postFactAction(idle, form({ projectId: ID, type: 'quote_accepted' }));
    expect(r.status).toBe('error');
    expect(postProjectFact).not.toHaveBeenCalled();
    expect(getAccessibleProject).toHaveBeenCalledWith(supabase, ID);
  });
  it('answers already recorded when nothing changed', async () => {
    postProjectFact.mockResolvedValue(okResult({ changed: false }));
    const r = await postFactAction(idle, form({ projectId: ID, type: 'quote_accepted' }));
    expect(r).toEqual({ status: 'error', message: "Ce fait est déjà enregistré. Rien n'a été modifié." });
  });
  it('returns the new step and mail line on success with admin actor', async () => {
    const r = await postFactAction(idle, form({ projectId: ID, type: 'quote_accepted', note: 'ok' }));
    expect(r.status).toBe('success');
    expect(r.message).toBe("Fait enregistré. L'étape est maintenant Contrat et acompte.");
    expect(r.mailLine).toBe('E-mail envoyé au client');
    expect(postProjectFact).toHaveBeenCalledWith(
      expect.objectContaining({ actorKind: 'admin', actorId: 'admin-1', type: 'quote_accepted' }),
    );
  });
  it('uses Terminé when the project is done and maps mail states', async () => {
    postProjectFact.mockResolvedValue(okResult({ done: true, stepAfter: null, mail: 'failed' }));
    const r = await postFactAction(idle, form({ projectId: ID, type: 'balance_received' }));
    expect(r.message).toBe("Fait enregistré. L'étape est maintenant Terminé.");
    expect(r.mailLine).toBe("Échec de l'envoi, il sera retenté");
    postProjectFact.mockResolvedValue(okResult({ mail: 'pending' }));
    expect((await postFactAction(idle, form({ projectId: ID, type: 'quote_accepted' }))).mailLine).toBe(
      "E-mail en attente d'envoi",
    );
    postProjectFact.mockResolvedValue(okResult({ mail: 'none' }));
    expect((await postFactAction(idle, form({ projectId: ID, type: 'quote_accepted' }))).mailLine).toBeUndefined();
  });
  it('revalidates admin and portal paths', async () => {
    await postFactAction(idle, form({ projectId: ID, type: 'quote_accepted' }));
    const paths = revalidatePath.mock.calls.map((c) => c[0]);
    expect(paths).toEqual(expect.arrayContaining(['/admin/projets', `/admin/projets/${ID}`, '/espace-client']));
  });
});

describe('revokeFactAction', () => {
  it('rejects a 9-character reason', async () => {
    const r = await revokeFactAction(idle, form({ projectId: ID, factId: '3', reason: '123456789' }));
    expect(r.status).toBe('error');
    expect(revokeProjectFact).not.toHaveBeenCalled();
  });
  it('revokes with the admin id on a valid reason', async () => {
    const r = await revokeFactAction(idle, form({ projectId: ID, factId: '3', reason: 'Saisi par erreur' }));
    expect(r.status).toBe('success');
    expect(revokeProjectFact).toHaveBeenCalledWith({
      projectId: ID,
      factId: 3,
      actorId: 'admin-1',
      reason: 'Saisi par erreur',
    });
  });
});

describe('addLinkAction', () => {
  it('rejects http URLs with the URL copy', async () => {
    const r = await addLinkAction(idle, form({ projectId: ID, title: 'x', url: 'http://x' }));
    expect(r).toEqual({ status: 'error', message: 'Saisissez une adresse complète commençant par https://' });
    expect(addProjectLink).not.toHaveBeenCalled();
  });
  it('adds a valid link', async () => {
    const r = await addLinkAction(idle, form({ projectId: ID, title: 'Maquette', url: 'https://x.fr/a' }));
    expect(r.status).toBe('success');
    expect(addProjectLink).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({ projectId: ID, title: 'Maquette', actorId: 'admin-1' }),
    );
  });
});

describe('file actions', () => {
  it('forwards the RLS client with uploaderKind admin', async () => {
    const r = await adminRequestUploadAction({ projectId: ID, filename: 'a.pdf', size: 10, mime: 'application/pdf' });
    expect(r).toEqual({ ok: true, fileId: 'f1', signedUrl: 'https://s/u' });
    expect(requestUpload).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({ uploaderKind: 'admin', uploaderId: 'admin-1' }),
    );
  });
  it('maps service errors to French copy', async () => {
    requestUpload.mockResolvedValue({ ok: false, code: 'too_large' });
    const r = await adminRequestUploadAction({ projectId: ID, filename: 'a.pdf', size: 10, mime: 'application/pdf' });
    expect(r.ok).toBe(false);
  });
  it('confirms and downloads through the RLS client', async () => {
    expect(await adminConfirmUploadAction('f1')).toEqual({ ok: true });
    expect(confirmUpload).toHaveBeenCalledWith(supabase, 'f1');
    expect(await adminDownloadAction('f1')).toEqual({ ok: true, url: 'https://s/d' });
    expect(createDownloadUrl).toHaveBeenCalledWith(supabase, 'f1');
  });
});
