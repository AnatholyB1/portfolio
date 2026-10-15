import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { DONE_COPY } from '@/lib/projects/steps';

const access = vi.hoisted(() => ({ getAccessibleProject: vi.fn() }));
const content = vi.hoisted(() => ({ addProjectLink: vi.fn() }));
const facts = vi.hoisted(() => ({ postProjectFact: vi.fn(), revokeProjectFact: vi.fn() }));
const files = vi.hoisted(() => ({ requestUpload: vi.fn(), confirmUpload: vi.fn(), createDownloadUrl: vi.fn() }));
const rpc = vi.hoisted(() => ({ callRpc: vi.fn() }));
vi.mock('@/lib/server/projects/access', () => access);
vi.mock('@/lib/server/projects/content', () => content);
vi.mock('@/lib/server/projects/facts', () => facts);
vi.mock('@/lib/server/projects/files', () => files);
const create = vi.hoisted(() => ({ createProject: vi.fn() }));
vi.mock('@/lib/server/projects/create', () => create);
vi.mock('@/lib/server/rpc', () => rpc);

import {
  addProjectLinkCore,
  confirmProjectUploadCore,
  createProjectCore,
  downloadProjectFileCore,
  postProjectFactCore,
  requestProjectUploadCore,
  revokeProjectFactCore,
  setReminderHoldCore,
} from './projects';

const ID = '11111111-1111-4111-8111-111111111111';
const supabase = { tag: 'rls' };
const ctx = { supabase: supabase as never, user: { id: 'admin-1' } as never };
const GENERIC = PROJECT_COPY.errors.generic;

const okFact = (over: Record<string, unknown> = {}) => ({
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
  for (const f of [
    ...Object.values(access),
    ...Object.values(content),
    ...Object.values(facts),
    ...Object.values(files),
    ...Object.values(rpc),
    ...Object.values(create),
  ]) f.mockReset();
  access.getAccessibleProject.mockResolvedValue({ id: ID, clientId: 'c1' });
});

describe('postProjectFactCore', () => {
  const base = { projectId: ID, type: 'deposit_received', note: ' acompte ' };
  it('posts as admin with the session user and trimmed note, returns the mail line', async () => {
    facts.postProjectFact.mockResolvedValue(okFact());
    const r = await postProjectFactCore(ctx, base);
    expect(access.getAccessibleProject).toHaveBeenCalledWith(supabase, ID);
    expect(facts.postProjectFact).toHaveBeenCalledWith({
      projectId: ID,
      type: 'deposit_received',
      actorKind: 'admin',
      actorId: 'admin-1',
      reason: 'acompte',
    });
    expect(r).toMatchObject({ ok: true, data: { mailLine: PROJECT_COPY.facts.mailSent } });
  });
  it('passes a null reason without a note and omits the mail line when none', async () => {
    facts.postProjectFact.mockResolvedValue(okFact({ mail: 'none' }));
    const r = await postProjectFactCore(ctx, { projectId: ID, type: 'quote_accepted' });
    expect(facts.postProjectFact.mock.calls[0][0]).toMatchObject({ reason: null });
    expect(r).toMatchObject({ ok: true });
    expect(r.ok && r.data?.mailLine).toBeUndefined();
  });
  it('rejects invalid input and inaccessible projects without writing', async () => {
    expect(await postProjectFactCore(ctx, { ...base, type: 'nope' })).toEqual({ ok: false, message: GENERIC });
    access.getAccessibleProject.mockResolvedValue(null);
    expect(await postProjectFactCore(ctx, base)).toEqual({ ok: false, message: GENERIC });
    expect(facts.postProjectFact).not.toHaveBeenCalled();
  });
  it('maps already recorded and failures', async () => {
    facts.postProjectFact.mockResolvedValue(okFact({ changed: false }));
    expect(await postProjectFactCore(ctx, base)).toEqual({ ok: false, message: PROJECT_COPY.facts.alreadyRecorded });
    facts.postProjectFact.mockResolvedValue({ ok: false, code: 'x' });
    expect(await postProjectFactCore(ctx, base)).toEqual({ ok: false, message: GENERIC });
  });
  it('names the done step when the project is finished', async () => {
    facts.postProjectFact.mockResolvedValue(okFact({ done: true, stepAfter: null }));
    const r = await postProjectFactCore(ctx, base);
    expect(r.ok && r.message).toBe(PROJECT_COPY.facts.recorded(DONE_COPY.name));
  });
});

describe('revokeProjectFactCore', () => {
  const base = { projectId: ID, factId: '5', reason: 'Erreur de saisie du fait' };
  it('revokes with the actor and accepts string or numeric ids', async () => {
    facts.revokeProjectFact.mockResolvedValue(okFact({ mail: 'none' }));
    expect((await revokeProjectFactCore(ctx, base)).ok).toBe(true);
    await revokeProjectFactCore(ctx, { ...base, factId: 7 });
    expect(facts.revokeProjectFact).toHaveBeenNthCalledWith(1, { projectId: ID, factId: 5, actorId: 'admin-1', reason: base.reason });
    expect(facts.revokeProjectFact.mock.calls[1][0]).toMatchObject({ factId: 7 });
  });
  it('rejects short reasons and inaccessible projects', async () => {
    expect(await revokeProjectFactCore(ctx, { ...base, reason: 'court' })).toEqual({ ok: false, message: GENERIC });
    access.getAccessibleProject.mockResolvedValue(null);
    expect(await revokeProjectFactCore(ctx, base)).toEqual({ ok: false, message: GENERIC });
    expect(facts.revokeProjectFact).not.toHaveBeenCalled();
  });
});

describe('addProjectLinkCore', () => {
  const base = { projectId: ID, title: 'Maquette', url: ' https://example.com/x ' };
  it('adds with the RLS client and the actor, trimming the url', async () => {
    content.addProjectLink.mockResolvedValue({ ok: true });
    expect(await addProjectLinkCore(ctx, base)).toEqual({ ok: true, message: PROJECT_COPY.links.add });
    expect(content.addProjectLink).toHaveBeenCalledWith(supabase, {
      projectId: ID,
      title: 'Maquette',
      url: 'https://example.com/x',
      actorId: 'admin-1',
    });
  });
  it('maps a bad url to the url message, other invalid input and failures to generic', async () => {
    expect(await addProjectLinkCore(ctx, { ...base, url: 'http://insecure.com' })).toEqual({ ok: false, message: PROJECT_COPY.errors.url });
    expect(await addProjectLinkCore(ctx, { ...base, title: '' })).toEqual({ ok: false, message: GENERIC });
    content.addProjectLink.mockResolvedValue({ ok: false, code: 'error' });
    expect(await addProjectLinkCore(ctx, base)).toEqual({ ok: false, message: GENERIC });
  });
});

describe('requestProjectUploadCore', () => {
  const base = { projectId: ID, filename: 'a.pdf', size: 100, mime: 'application/pdf' };
  it('requests an admin upload and returns the file id and signed url only', async () => {
    files.requestUpload.mockResolvedValue({ ok: true, fileId: 'f1', signedUrl: 'https://s/u', token: 't', path: 'p' });
    const r = await requestProjectUploadCore(ctx, base);
    expect(files.requestUpload).toHaveBeenCalledWith(supabase, { ...base, uploaderKind: 'admin', uploaderId: 'admin-1' });
    expect(r).toEqual({ ok: true, message: '', data: { fileId: 'f1', signedUrl: 'https://s/u' } });
  });
  it('maps codes', async () => {
    files.requestUpload.mockResolvedValue({ ok: false, code: 'too_large' });
    expect(await requestProjectUploadCore(ctx, base)).toEqual({ ok: false, message: PROJECT_COPY.errors.fileTooLarge });
    files.requestUpload.mockResolvedValue({ ok: false, code: 'bad_type' });
    expect(await requestProjectUploadCore(ctx, base)).toEqual({ ok: false, message: PROJECT_COPY.errors.fileType });
    files.requestUpload.mockResolvedValue({ ok: false, code: 'not_found' });
    expect(await requestProjectUploadCore(ctx, base)).toEqual({ ok: false, message: GENERIC });
  });
  it('rejects invalid input without calling the module', async () => {
    expect(await requestProjectUploadCore(ctx, { ...base, size: 0 })).toEqual({ ok: false, message: GENERIC });
    expect(await requestProjectUploadCore(ctx, null)).toEqual({ ok: false, message: GENERIC });
    expect(files.requestUpload).not.toHaveBeenCalled();
  });
});

describe('confirmProjectUploadCore', () => {
  it('confirms through the RLS client', async () => {
    files.confirmUpload.mockResolvedValue({ ok: true });
    expect((await confirmProjectUploadCore(ctx, { fileId: 'f1' })).ok).toBe(true);
    expect(files.confirmUpload).toHaveBeenCalledWith(supabase, 'f1');
  });
  it('rejects an empty id and maps failures to generic', async () => {
    expect(await confirmProjectUploadCore(ctx, { fileId: '' })).toEqual({ ok: false, message: GENERIC });
    expect(files.confirmUpload).not.toHaveBeenCalled();
    files.confirmUpload.mockResolvedValue({ ok: false, code: 'missing' });
    expect(await confirmProjectUploadCore(ctx, { fileId: 'f1' })).toEqual({ ok: false, message: GENERIC });
  });
});

describe('downloadProjectFileCore', () => {
  it('returns the signed url', async () => {
    files.createDownloadUrl.mockResolvedValue({ ok: true, url: 'https://s/d' });
    expect(await downloadProjectFileCore(ctx, { fileId: 'f1' })).toEqual({ ok: true, message: '', data: { url: 'https://s/d' } });
    expect(files.createDownloadUrl).toHaveBeenCalledWith(supabase, 'f1');
  });
  it('maps an empty id and failures to downloadFailed', async () => {
    expect(await downloadProjectFileCore(ctx, { fileId: '' })).toEqual({ ok: false, message: PROJECT_COPY.errors.downloadFailed });
    files.createDownloadUrl.mockResolvedValue({ ok: false, code: 'not_found' });
    expect(await downloadProjectFileCore(ctx, { fileId: 'f1' })).toEqual({ ok: false, message: PROJECT_COPY.errors.downloadFailed });
  });
});

describe('setReminderHoldCore', () => {
  const GEN = 'Le changement a échoué. Réessayez dans un instant.';
  it('suspends, resumes and reports unchanged', async () => {
    rpc.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'suspended' } });
    expect(await setReminderHoldCore(ctx, { projectId: ID, action: 'suspend' })).toEqual({ ok: true, message: 'Relances suspendues.' });
    expect(rpc.callRpc).toHaveBeenCalledWith('admin/projets', 'sv_set_reminder_hold', { p_project_id: ID, p_action: 'suspend', p_actor_id: 'admin-1' });
    rpc.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'resumed' } });
    expect(await setReminderHoldCore(ctx, { projectId: ID, action: 'resume' })).toEqual({ ok: true, message: 'Relances reprises.' });
    rpc.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'unchanged' } });
    expect(await setReminderHoldCore(ctx, { projectId: ID, action: 'resume' })).toEqual({ ok: true, message: 'Aucun changement.' });
  });
  it('rejects bad input and maps failures', async () => {
    expect(await setReminderHoldCore(ctx, { projectId: 'x', action: 'suspend' })).toEqual({ ok: false, message: GEN });
    expect(await setReminderHoldCore(ctx, { projectId: ID, action: 'pause' })).toEqual({ ok: false, message: GEN });
    expect(rpc.callRpc).not.toHaveBeenCalled();
    rpc.callRpc.mockResolvedValue({ ok: false, code: 'unknown' });
    expect(await setReminderHoldCore(ctx, { projectId: ID, action: 'suspend' })).toEqual({ ok: false, message: GEN });
    rpc.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'weird' } });
    expect(await setReminderHoldCore(ctx, { projectId: ID, action: 'suspend' })).toEqual({ ok: false, message: GEN });
  });
});

describe('createProjectCore', () => {
  const input = { clientId: ID, offer: 'site-vitrine', projectTitle: 'Site Acme' };
  it("cree le projet avec l'admin de la session et renvoie le message de succes", async () => {
    create.createProject.mockResolvedValue({ ok: true, projectId: 'p1', title: 'Site Acme' });
    const r = await createProjectCore(ctx, input);
    expect(create.createProject).toHaveBeenCalledWith(input, { userId: 'admin-1' });
    expect(r).toEqual({
      ok: true,
      message: PROJECT_COPY.creation.success('Site Acme'),
      data: { projectId: 'p1', title: 'Site Acme' },
    });
  });
  it('tolere une entree non objet (champs vides transmis)', async () => {
    create.createProject.mockResolvedValue({ ok: false, code: 'invalid' });
    await createProjectCore(ctx, null);
    expect(create.createProject).toHaveBeenCalledWith(
      { clientId: '', offer: '', projectTitle: '' },
      { userId: 'admin-1' },
    );
  });
  it.each([
    ['invalid', PROJECT_COPY.creation.invalid],
    ['client_not_found', PROJECT_COPY.creation.clientNotFound],
    ['error', GENERIC],
  ])('mappe %s vers le message francais', async (code, message) => {
    create.createProject.mockResolvedValue({ ok: false, code });
    expect(await createProjectCore(ctx, input)).toEqual({ ok: false, message });
  });
});
