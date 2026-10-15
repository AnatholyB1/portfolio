import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { deriveProjectState } from '@/lib/projects/steps';
import { runTool } from '../registry';
import { confirmTwoStep } from '../testing';

const access = vi.hoisted(() => ({ getAccessibleProject: vi.fn() }));
const content = vi.hoisted(() => ({ addProjectLink: vi.fn() }));
const facts = vi.hoisted(() => ({ postProjectFact: vi.fn(), revokeProjectFact: vi.fn() }));
const files = vi.hoisted(() => ({ requestUpload: vi.fn(), confirmUpload: vi.fn(), createDownloadUrl: vi.fn() }));
const rpc = vi.hoisted(() => ({ callRpc: vi.fn() }));
const read = vi.hoisted(() => ({ loadProjectBundle: vi.fn(), loadAdminProjects: vi.fn(), loadPendingClientWork: vi.fn() }));
const holds = vi.hoisted(() => ({ loadReminderHold: vi.fn() }));
vi.mock('@/lib/server/projects/access', () => access);
vi.mock('@/lib/server/projects/content', () => content);
vi.mock('@/lib/server/projects/facts', () => facts);
vi.mock('@/lib/server/projects/files', () => files);
vi.mock('@/lib/server/rpc', () => rpc);
vi.mock('@/lib/server/projects/read', () => read);
vi.mock('@/lib/server/reminders/holds', () => holds);
const projectsCore = vi.hoisted(() => ({ createProjectCore: vi.fn() }));
vi.mock('@/lib/server/admin/core/projects', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...projectsCore,
}));

import { projectTools } from './projects';

const ID = '11111111-1111-4111-8111-111111111111';
const FID = '22222222-2222-4222-8222-222222222222';
const principal = { tokenId: 't1', userId: 'admin-1' };
const audit = vi.fn();
const supabase = { tag: 'rls' };
const ctx = { supabase: supabase as never, user: { id: 'admin-1' } as never };
const tool = (name: string) => {
  const t = projectTools.find((x) => x.name === name);
  if (!t) throw new Error(`missing tool ${name}`);
  return t;
};
function fileCtx(row: unknown) {
  const b: Record<string, ReturnType<typeof vi.fn>> = {};
  b.select = vi.fn(() => b);
  b.eq = vi.fn(() => b);
  b.maybeSingle = vi.fn(() => Promise.resolve({ data: row, error: null }));
  return { supabase: { from: vi.fn(() => b) } as never, user: { id: 'admin-1' } as never };
}
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
const bundle = {
  project: { id: ID, clientId: 'c1', title: 'Refonte', offer: 'site-vitrine', startedAt: '2026-01-01' },
  facts: [{ id: 5, type: 'deposit_received', targetFactId: null, actorKind: 'admin', createdAt: '2026-02-01' }],
  notes: { 5: 'acompte reçu' },
  state: { currentStep: 3, done: false, waitingOn: 'client', expectedAction: 'Signer', steps: [], sinceAt: 'x' },
};

beforeEach(() => {
  audit.mockReset();
  for (const f of [
    ...Object.values(projectsCore),
    ...Object.values(access),
    ...Object.values(content),
    ...Object.values(facts),
    ...Object.values(files),
    ...Object.values(rpc),
    ...Object.values(read),
    ...Object.values(holds),
  ]) f.mockReset();
  read.loadPendingClientWork.mockResolvedValue(null);
  holds.loadReminderHold.mockResolvedValue({ suspended: false, since: null });
  access.getAccessibleProject.mockResolvedValue({ id: ID, clientId: 'c1' });
  read.loadProjectBundle.mockResolvedValue(bundle);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('projectTools metadata', () => {
  it('declares exact names, covers and destructive flags', () => {
    const map = Object.fromEntries(projectTools.map((t) => [t.name, t.covers]));
    expect(map).toMatchObject({
      create_project: ['createProjectAction'],
      post_project_fact: ['postFactAction'],
      revoke_project_fact: ['revokeFactAction'],
      add_project_link: ['addLinkAction'],
      request_project_upload: ['adminRequestUploadAction'],
      confirm_project_upload: ['adminConfirmUploadAction'],
      get_project_file_url: ['adminDownloadAction'],
      suspend_reminders: ['setReminderHoldAction'],
      resume_reminders: ['setReminderHoldAction'],
    });
    expect(projectTools.filter((t) => t.destructive).map((t) => t.name).sort()).toEqual([
      'add_project_link',
      'confirm_project_upload',
      'create_project',
      'post_project_fact',
      'revoke_project_fact',
      'suspend_reminders',
    ]);
  });
});

describe('create_project (destructive: irreversible creation, no client e-mail)', () => {
  const CID = '33333333-3333-4333-8333-333333333333';
  const args = { clientId: CID, offer: 'site-vitrine', projectTitle: 'Refonte du site' };
  function clientCtx(row: unknown, error: unknown = null) {
    const b: Record<string, ReturnType<typeof vi.fn>> = {};
    b.select = vi.fn(() => b);
    b.eq = vi.fn(() => b);
    b.maybeSingle = vi.fn(() => Promise.resolve({ data: row, error }));
    return { supabase: { from: vi.fn(() => b) } as never, user: { id: 'admin-1' } as never };
  }
  it('without confirm creates nothing and previews client, title, offer and the absence of e-mail', async () => {
    const c = clientCtx({ id: CID, name: 'ACME SAS' });
    const r = await runTool(tool('create_project'), args, c, principal, audit);
    expect(projectsCore.createProjectCore).not.toHaveBeenCalled();
    expect(r).toMatchObject({
      ok: true,
      needsConfirmation: true,
      preview: { clientId: CID, clientName: 'ACME SAS', offer: 'site-vitrine', projectTitle: 'Refonte du site', mail: 'Aucun e-mail envoyé au client' },
    });
  });
  it('creates through the core with the exact input after the two-step flow', async () => {
    projectsCore.createProjectCore.mockResolvedValue({ ok: true, data: { projectId: ID, title: 'Refonte du site' } });
    const c = clientCtx({ id: CID, name: 'ACME SAS' });
    const r = await confirmTwoStep(tool('create_project'), { ...args }, c, principal, audit);
    expect(projectsCore.createProjectCore).toHaveBeenCalledTimes(1);
    expect(projectsCore.createProjectCore).toHaveBeenCalledWith(expect.anything(), args);
    expect(r).toMatchObject({ ok: true });
  });
  it('an unknown or unreadable client gives an error, never a token nor a creation', async () => {
    const r1 = await runTool(tool('create_project'), args, clientCtx(null), principal, audit);
    const r2 = await runTool(tool('create_project'), args, clientCtx(null, { message: 'x' }), principal, audit);
    expect(r1).toEqual({ ok: false, error: 'tool_failed' });
    expect(r2).toEqual({ ok: false, error: 'tool_failed' });
    expect(JSON.stringify([r1, r2])).not.toContain('previewToken');
    expect(projectsCore.createProjectCore).not.toHaveBeenCalled();
  });
  it('rejects an unknown offer, an empty title and a non-uuid client as invalid_input', async () => {
    const c = clientCtx({ id: CID, name: 'ACME SAS' });
    for (const bad of [{ ...args, offer: 'inconnue' }, { ...args, projectTitle: '' }, { ...args, clientId: 'x' }]) {
      expect(await runTool(tool('create_project'), bad, c, principal, audit)).toEqual({ ok: false, error: 'invalid_input' });
    }
    expect(projectsCore.createProjectCore).not.toHaveBeenCalled();
  });
});

describe('post_project_fact', () => {
  const args = { projectId: ID, type: 'deposit_received', note: 'acompte' };
  it('without confirm never posts and previews project, fact and the client e-mail effect', async () => {
    const r = await runTool(tool('post_project_fact'), args, ctx, principal, audit);
    expect(facts.postProjectFact).not.toHaveBeenCalled();
    expect(r).toMatchObject({ ok: true, needsConfirmation: true });
    const json = JSON.stringify(r);
    expect(json).toContain('Refonte');
    expect(json).toContain('deposit_received');
    expect(json).toMatch(/e-mail/);
  });
  it('a project that cannot be read gives an error, never a blind preview or a token', async () => {
    read.loadProjectBundle.mockResolvedValue(null);
    const r = await runTool(tool('post_project_fact'), args, ctx, principal, audit);
    expect(r).toEqual({ ok: false, error: 'tool_failed' });
    expect(JSON.stringify(r)).not.toContain('previewToken');
    read.loadProjectBundle.mockRejectedValue(new Error('x'));
    expect(await runTool(tool('revoke_project_fact'), { projectId: ID, factId: 5, reason: 'Erreur de saisie du fait' }, ctx, principal, audit)).toEqual({ ok: false, error: 'tool_failed' });
    expect(await runTool(tool('add_project_link'), { projectId: ID, title: 'M', url: 'https://example.com' }, ctx, principal, audit)).toEqual({ ok: false, error: 'tool_failed' });
    expect(facts.postProjectFact).not.toHaveBeenCalled();
  });
  it('with confirm posts as admin and reports the mail line', async () => {
    facts.postProjectFact.mockResolvedValue(okFact());
    const r = await confirmTwoStep(tool('post_project_fact'), { ...args }, ctx, principal, audit);
    expect(facts.postProjectFact).toHaveBeenCalledWith(expect.objectContaining({ actorKind: 'admin', actorId: 'admin-1', reason: 'acompte' }));
    expect(r).toMatchObject({ ok: true, data: { ok: true, data: { mailLine: PROJECT_COPY.facts.mailSent } } });
  });
  it('rejects an unknown fact type as invalid_input; already recorded is an audited error', async () => {
    expect(await confirmTwoStep(tool('post_project_fact'), { ...args, type: 'nope' }, ctx, principal, audit)).toEqual({ ok: false, error: 'invalid_input' });
    facts.postProjectFact.mockResolvedValue(okFact({ changed: false }));
    const r = await confirmTwoStep(tool('post_project_fact'), { ...args }, ctx, principal, audit);
    expect(r).toEqual({ ok: false, error: PROJECT_COPY.facts.alreadyRecorded });
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ outcome: 'error' }));
  });
});

describe('revoke_project_fact', () => {
  const args = { projectId: ID, factId: 5, reason: 'Erreur de saisie du fait' };
  it('without confirm never revokes and previews the targeted fact', async () => {
    const r = await runTool(tool('revoke_project_fact'), args, ctx, principal, audit);
    expect(facts.revokeProjectFact).not.toHaveBeenCalled();
    expect(r).toMatchObject({ ok: true, needsConfirmation: true });
    const json = JSON.stringify(r);
    expect(json).toContain('deposit_received');
    expect(json).toContain('Refonte');
  });
  it('with confirm revokes with the actor', async () => {
    facts.revokeProjectFact.mockResolvedValue(okFact({ mail: 'none' }));
    const r = await confirmTwoStep(tool('revoke_project_fact'), { ...args }, ctx, principal, audit);
    expect(facts.revokeProjectFact).toHaveBeenCalledWith({ projectId: ID, factId: 5, actorId: 'admin-1', reason: args.reason });
    expect(r).toMatchObject({ ok: true, data: { ok: true } });
  });
  it('rejects a short reason as invalid_input', async () => {
    expect(await confirmTwoStep(tool('revoke_project_fact'), { ...args, reason: 'court' }, ctx, principal, audit)).toEqual({ ok: false, error: 'invalid_input' });
  });
});

describe('add_project_link (destructive: publishes to the client sheet)', () => {
  const args = { projectId: ID, title: 'Maquette', url: 'https://example.com/x' };
  it('without confirm adds nothing and previews the project, the title, the url and its host', async () => {
    const r = await runTool(tool('add_project_link'), args, ctx, principal, audit);
    expect(content.addProjectLink).not.toHaveBeenCalled();
    expect(r).toMatchObject({
      ok: true,
      needsConfirmation: true,
      preview: { wouldAdd: true, projectTitle: 'Refonte', title: 'Maquette', url: 'https://example.com/x', host: 'example.com', https: true },
    });
  });
  it('the preview flags a non-https url as not addable and shows its host', async () => {
    const r = await runTool(tool('add_project_link'), { ...args, url: 'http://example.com/x' }, ctx, principal, audit);
    expect(r).toMatchObject({ ok: true, needsConfirmation: true, preview: { wouldAdd: false, https: false, host: 'example.com' } });
  });
  it('adds the link after the two-step confirmation', async () => {
    content.addProjectLink.mockResolvedValue({ ok: true });
    const r = await confirmTwoStep(tool('add_project_link'), args, ctx, principal, audit);
    expect(content.addProjectLink).toHaveBeenCalledWith(supabase, { projectId: ID, title: 'Maquette', url: 'https://example.com/x', actorId: 'admin-1' });
    expect(r).toMatchObject({ ok: true, data: { ok: true, message: PROJECT_COPY.links.add } });
  });
  it('a non-https url is an audited error with the url message even when confirmed', async () => {
    const r = await confirmTwoStep(tool('add_project_link'), { ...args, url: 'http://example.com' }, ctx, principal, audit);
    expect(r).toEqual({ ok: false, error: PROJECT_COPY.errors.url });
    expect(content.addProjectLink).not.toHaveBeenCalled();
  });
});

describe('upload flow', () => {
  it('request_project_upload returns the signed url and file id, and the description explains the PUT', async () => {
    files.requestUpload.mockResolvedValue({ ok: true, fileId: FID, signedUrl: 'https://s/u', token: 'secret-token', path: 'secret/path' });
    const args = { projectId: ID, filename: 'a.pdf', size: 100, mime: 'application/pdf' };
    const r = await runTool(tool('request_project_upload'), args, ctx, principal, audit);
    expect(files.requestUpload).toHaveBeenCalledWith(supabase, { ...args, uploaderKind: 'admin', uploaderId: 'admin-1' });
    expect(r).toMatchObject({ ok: true, data: { ok: true, data: { fileId: FID, signedUrl: 'https://s/u' } } });
    expect(JSON.stringify(r)).not.toContain('secret');
    const d = tool('request_project_upload').description;
    expect(d).toContain('PUT');
    expect(d).toContain('multipart');
    expect(d).toContain('confirm_project_upload');
  });
  it('request_project_upload caps the size at the schema limit', async () => {
    const r = await runTool(tool('request_project_upload'), { projectId: ID, filename: 'a.pdf', size: 26214401, mime: 'application/pdf' }, ctx, principal, audit);
    expect(r).toEqual({ ok: false, error: 'invalid_input' });
  });
  it('confirm_project_upload without confirm publishes nothing and previews the file name and size', async () => {
    const c = fileCtx({ id: FID, filename: 'devis.pdf', size_bytes: 123456, status: 'pending', project_id: ID });
    const r = await runTool(tool('confirm_project_upload'), { fileId: FID }, c, principal, audit);
    expect(files.confirmUpload).not.toHaveBeenCalled();
    expect(r).toMatchObject({ ok: true, needsConfirmation: true, preview: { found: true, filename: 'devis.pdf', sizeBytes: 123456, status: 'pending' } });
    expect(JSON.stringify(r)).toMatch(/client/);
  });
  it('the preview says when the file is unknown', async () => {
    const r = await runTool(tool('confirm_project_upload'), { fileId: FID }, fileCtx(null), principal, audit);
    expect(r).toMatchObject({ ok: true, needsConfirmation: true, preview: { found: false } });
  });
  it('confirm_project_upload confirms after the two-step flow; a missing file is an audited error', async () => {
    const c = fileCtx({ id: FID, filename: 'devis.pdf', size_bytes: 1, status: 'pending', project_id: ID });
    files.confirmUpload.mockResolvedValue({ ok: true });
    expect(await confirmTwoStep(tool('confirm_project_upload'), { fileId: FID }, c, principal, audit)).toMatchObject({ ok: true });
    expect(files.confirmUpload).toHaveBeenCalledWith(c.supabase, FID);
    files.confirmUpload.mockResolvedValue({ ok: false, code: 'missing' });
    expect(await confirmTwoStep(tool('confirm_project_upload'), { fileId: FID }, c, principal, audit)).toEqual({ ok: false, error: PROJECT_COPY.errors.generic });
  });
  it('get_project_file_url returns the signed url only', async () => {
    files.createDownloadUrl.mockResolvedValue({ ok: true, url: 'https://s/d' });
    const r = await runTool(tool('get_project_file_url'), { fileId: FID }, ctx, principal, audit);
    expect(r).toMatchObject({ ok: true, data: { ok: true, data: { url: 'https://s/d' } } });
    expect(tool('get_project_file_url').description).toMatch(/URL/);
  });
});

describe('reminder hold', () => {
  it('suspend_reminders without confirm suspends nothing and previews the project, the hold and the permanent effect', async () => {
    const r = await runTool(tool('suspend_reminders'), { projectId: ID }, ctx, principal, audit);
    expect(rpc.callRpc).not.toHaveBeenCalled();
    expect(r).toMatchObject({ ok: true, needsConfirmation: true, preview: { projectTitle: 'Refonte', currentHold: { suspended: false } } });
    expect(JSON.stringify(r)).toMatch(/jamais/);
  });
  it('suspend_reminders suspends with the actor after the two-step flow', async () => {
    rpc.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'suspended' } });
    const r = await confirmTwoStep(tool('suspend_reminders'), { projectId: ID }, ctx, principal, audit);
    expect(rpc.callRpc).toHaveBeenCalledWith('admin/projets', 'sv_set_reminder_hold', { p_project_id: ID, p_action: 'suspend', p_actor_id: 'admin-1' });
    expect(r).toMatchObject({ ok: true, data: { ok: true, message: 'Relances suspendues.' } });
  });
  it('resume_reminders resumes without confirmation but warns in its description that skipped e-mails are not requeued', async () => {
    rpc.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'resumed' } });
    const r = await runTool(tool('resume_reminders'), { projectId: ID }, ctx, principal, audit);
    expect(rpc.callRpc).toHaveBeenCalledWith('admin/projets', 'sv_set_reminder_hold', { p_project_id: ID, p_action: 'resume', p_actor_id: 'admin-1' });
    expect(r).toMatchObject({ ok: true, data: { ok: true, message: 'Relances reprises.' } });
    expect(tool('resume_reminders').destructive).toBeFalsy();
    expect(tool('resume_reminders').description).toMatch(/ne remet pas|ne rétablit pas|pas remis/);
    expect(tool('suspend_reminders').description).toMatch(/définitiv/);
  });
  it('rejects a bad project id as invalid_input', async () => {
    expect(await runTool(tool('resume_reminders'), { projectId: 'x' }, ctx, principal, audit)).toEqual({ ok: false, error: 'invalid_input' });
  });
});

const STATE = deriveProjectState([], '2026-01-01T00:00:00Z');
const fullBundle = {
  ...bundle,
  state: STATE,
  client: { id: 'c1', name: 'Jean Dupont', siret: '12345678901234', company: { nom: 'ACME SAS' } },
  onboarding: {
    companyConfirmedAt: '2026-01-02',
    signatoryName: 'Jean Dupont',
    signatoryRole: 'Gérant',
    projectContactName: 'Alice',
    projectContactEmail: 'alice@dupont.fr',
    projectContactPhone: '06 12 34 56 78',
    billingSameAsCompany: false,
    billingAddress: { adresse: '1 rue Secrète', code_postal: '75001', commune: 'Paris' },
    vatStatus: 'number',
    vatNumber: 'FR123',
    existingSiteUrl: null,
    socialLinks: [],
    projectGoal: 'Vendre',
  },
  files: [
    { id: FID, projectId: ID, storagePath: 'secret/path/f.pdf', filename: 'f.pdf', mime: 'application/pdf', sizeBytes: 10, uploadedByKind: 'admin', status: 'ready', createdAt: 'c', readyAt: 'r' },
  ],
  links: [{ id: 'l1', projectId: ID, title: 'Maquette', url: 'https://example.com/m', createdAt: 'c' }],
  consents: [{ id: 1, projectId: ID, granted: true, textVersion: 'v1', textSnapshot: 'texte long', createdAt: 'c' }],
  lastActivityAt: '2026-02-01T00:00:00Z',
};

describe('get_project', () => {
  it('has no covers and is not destructive', () => {
    expect(tool('get_project').covers).toEqual([]);
    expect(tool('get_project').destructive).toBeFalsy();
  });
  it('returns what the admin sheet shows, masking contact data and hiding storage paths', async () => {
    read.loadProjectBundle.mockResolvedValue(fullBundle);
    const r = await runTool(tool('get_project'), { projectId: ID }, ctx, principal, audit);
    expect(read.loadProjectBundle).toHaveBeenCalledWith(supabase, ID, expect.any(Date));
    expect(holds.loadReminderHold).toHaveBeenCalledWith(supabase, ID);
    expect(r).toMatchObject({
      ok: true,
      data: {
        project: { id: ID, title: 'Refonte' },
        client: { name: 'ACME SAS', siret: '12345678901234' },
        facts: [{ id: 5, type: 'deposit_received', note: 'acompte reçu' }],
        files: [{ id: FID, filename: 'f.pdf', status: 'ready' }],
        links: [{ title: 'Maquette', url: 'https://example.com/m' }],
        consent: { granted: true, version: 'v1' },
        reminderHold: { suspended: false },
      },
    });
    const json = JSON.stringify(r);
    expect(json).toContain('a***@d***.fr');
    expect(json).toContain('***78');
    for (const secret of ['alice@dupont.fr', '06 12 34 56 78', 'secret/path', '1 rue Secrète', 'texte long']) {
      expect(json).not.toContain(secret);
    }
  });
  it('resolves who is waiting with the pending client work and tolerates an unreadable hold', async () => {
    read.loadProjectBundle.mockResolvedValue(fullBundle);
    read.loadPendingClientWork.mockResolvedValue(new Map([[ID, { toSign: 0, toPay: 0 }]]));
    holds.loadReminderHold.mockRejectedValue(new Error('x'));
    const r = await runTool(tool('get_project'), { projectId: ID }, ctx, principal, audit);
    expect(r).toMatchObject({ ok: true, data: { reminderHold: null } });
    expect(read.loadPendingClientWork).toHaveBeenCalledWith(supabase, [ID], expect.any(Map));
  });
  it('fails when the project does not exist', async () => {
    read.loadProjectBundle.mockResolvedValue(null);
    const r = await runTool(tool('get_project'), { projectId: ID }, ctx, principal, audit);
    expect(r).toMatchObject({ ok: false });
  });
});

describe('list_projects', () => {
  const row = (id: string, over: Record<string, unknown> = {}) => ({
    projectId: id,
    clientName: 'ACME SAS',
    title: 'Refonte ' + id,
    offer: 'site-vitrine',
    state: { ...STATE, waitingOn: 'client' },
    lastActivityAt: '2026-02-01',
    daysWaiting: 3,
    isDormant: false,
    blockers: ['client'],
    ...over,
  });
  it('reads through loadAdminProjects with the RLS client, filters and paginates', async () => {
    read.loadAdminProjects.mockResolvedValue([row('a'), row('b', { blockers: ['admin'], state: { ...STATE, waitingOn: 'admin' } }), row('c')]);
    const r = await runTool(tool('list_projects'), { blocage: 'client', limit: 1 }, ctx, principal, audit);
    expect(read.loadAdminProjects).toHaveBeenCalledWith(supabase, expect.any(Date));
    expect(r).toMatchObject({ ok: true, data: { total: 2, page: 1, hasNext: true, projects: [{ projectId: expect.any(String), clientName: 'ACME SAS' }] } });
    expect((r as { data: { projects: unknown[] } }).data.projects).toHaveLength(1);
  });
  it('rejects an unknown filter as invalid_input', async () => {
    expect(await runTool(tool('list_projects'), { etape: '9' }, ctx, principal, audit)).toEqual({ ok: false, error: 'invalid_input' });
  });
});

describe('review fixes: masking and bounds', () => {
  it('get_project reduces signatory and contact names to initials', async () => {
    read.loadProjectBundle.mockResolvedValue(fullBundle);
    const r = await runTool(tool('get_project'), { projectId: ID }, ctx, principal, audit);
    expect(r).toMatchObject({ ok: true, data: { onboarding: { signatory: { name: 'J. D.' }, contact: { name: 'A.' } } } });
    const json = JSON.stringify(r);
    expect(json).not.toContain('Jean Dupont');
    expect(json).not.toContain('"Alice"');
  });
  it('list_projects caps page at 100', async () => {
    expect(await runTool(tool('list_projects'), { page: 101 }, ctx, principal, audit)).toEqual({ ok: false, error: 'invalid_input' });
  });
});

describe('suspend_reminders previews are never blind', () => {
  it('an unreadable hold (null) or a failing read gives an error and no token', async () => {
    holds.loadReminderHold.mockResolvedValue(null);
    const r1 = await runTool(tool('suspend_reminders'), { projectId: ID }, ctx, principal, audit);
    expect(r1).toEqual({ ok: false, error: 'tool_failed' });
    holds.loadReminderHold.mockRejectedValue(new Error('x'));
    const r2 = await runTool(tool('suspend_reminders'), { projectId: ID }, ctx, principal, audit);
    expect(r2).toEqual({ ok: false, error: 'tool_failed' });
    expect(JSON.stringify([r1, r2])).not.toContain('previewToken');
    expect(rpc.callRpc).not.toHaveBeenCalled();
  });
});
