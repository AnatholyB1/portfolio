import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireClient = vi.fn();
vi.mock('@/lib/server/auth/dal', () => ({ requireClient: () => requireClient() }));

const saveOnboardingBlock = vi.fn();
const confirmCompany = vi.fn();
vi.mock('@/lib/server/projects/onboarding', () => ({
  saveOnboardingBlock: (...a: unknown[]) => saveOnboardingBlock(...a),
  confirmCompany: (...a: unknown[]) => confirmCompany(...a),
}));

const setPresentationConsent = vi.fn();
vi.mock('@/lib/server/projects/content', () => ({
  setPresentationConsent: (...a: unknown[]) => setPresentationConsent(...a),
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
  saveOnboardingAction,
  confirmCompanyAction,
  setConsentAction,
  requestUploadAction,
  confirmUploadAction,
  downloadAction,
} = await import('./actions');
const { PROJECT_COPY } = await import('@/lib/projects/copy');

const idle = { status: 'idle' as const };
const OTHER = '99999999-9999-4999-8999-999999999999';
const supabase = { tag: 'rls' };

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireClient.mockResolvedValue({
    status: 'ok',
    supabase,
    user: { id: 'user-1' },
    client: { id: 'client-1', name: 'Acme' },
  });
});

describe('no_access guard', () => {
  beforeEach(() => requireClient.mockResolvedValue({ status: 'no_access', user: { id: 'u' } }));

  it('refuses every action without calling a service', async () => {
    expect((await saveOnboardingAction(idle, form({ block: 'signataire' }))).status).toBe('error');
    expect((await confirmCompanyAction(idle, form({}))).status).toBe('error');
    expect((await setConsentAction(idle, form({ projectId: 'p', granted: 'true', version: 'v' }))).status).toBe('error');
    expect((await requestUploadAction({ projectId: 'p', filename: 'a.pdf', size: 1, mime: 'application/pdf' })).ok).toBe(false);
    expect((await confirmUploadAction('f')).ok).toBe(false);
    expect((await downloadAction('f')).ok).toBe(false);
    for (const m of [saveOnboardingBlock, confirmCompany, setPresentationConsent, requestUpload, confirmUpload, createDownloadUrl]) {
      expect(m).not.toHaveBeenCalled();
    }
  });
});

describe('saveOnboardingAction', () => {
  it('uses the session client id, ignoring a clientId form field', async () => {
    saveOnboardingBlock.mockResolvedValue({ ok: true, complete: false, blocks: {}, savedAt: '2026-10-03T12:30:00Z' });
    await saveOnboardingAction(idle, form({ block: 'signataire', signatoryName: 'Jean', signatoryRole: 'Gérant', clientId: OTHER }));
    expect(saveOnboardingBlock).toHaveBeenCalledTimes(1);
    const [clientId, actorId, input] = saveOnboardingBlock.mock.calls[0];
    expect(clientId).toBe('client-1');
    expect(actorId).toBe('user-1');
    expect(JSON.stringify(input)).not.toContain(OTHER);
  });

  it('returns the Paris-time message and the complete flag on success', async () => {
    saveOnboardingBlock.mockResolvedValue({ ok: true, complete: true, blocks: {}, savedAt: '2026-10-03T12:30:00Z' });
    const res = await saveOnboardingAction(idle, form({ block: 'signataire', signatoryName: 'J', signatoryRole: 'G' }));
    expect(res.status).toBe('success');
    expect(res.message).toBe('Enregistré à 14:30');
    expect(res.complete).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith('/espace-client');
  });

  it('forwards field errors mapped to copy', async () => {
    saveOnboardingBlock.mockResolvedValue({ ok: false, code: 'invalid', fieldErrors: { signatoryName: 'required' } });
    const res = await saveOnboardingAction(idle, form({ block: 'signataire' }));
    expect(res.status).toBe('error');
    expect(res.fieldErrors).toEqual({ signatoryName: PROJECT_COPY.errors.required });
  });

  it('builds facturation input with a billing address when not same as company', async () => {
    saveOnboardingBlock.mockResolvedValue({ ok: true, complete: false, blocks: {}, savedAt: '2026-10-03T12:30:00Z' });
    await saveOnboardingAction(
      idle,
      form({ block: 'facturation', vatStatus: 'not_subject', billingAdresse: '1 rue A', billingCodePostal: '75001', billingCommune: 'Paris' }),
    );
    const input = saveOnboardingBlock.mock.calls[0][2] as { data: { billingSameAsCompany: boolean; billingAddress: unknown } };
    expect(input.data.billingSameAsCompany).toBe(false);
    expect(input.data.billingAddress).toEqual({ adresse: '1 rue A', code_postal: '75001', commune: 'Paris' });
  });
});

describe('confirmCompanyAction', () => {
  it('confirms for the session client', async () => {
    confirmCompany.mockResolvedValue({ ok: true, complete: false, blocks: {}, savedAt: '2026-10-03T12:30:00Z' });
    const res = await confirmCompanyAction(idle, form({ clientId: OTHER }));
    expect(confirmCompany).toHaveBeenCalledWith('client-1', 'user-1');
    expect(res.status).toBe('success');
  });
});

describe('setConsentAction', () => {
  it('maps stale_version to the reload message', async () => {
    setPresentationConsent.mockResolvedValue({ ok: false, code: 'stale_version' });
    const res = await setConsentAction(idle, form({ projectId: 'p', granted: 'true', version: 'old' }));
    expect(res).toEqual({ status: 'error', message: 'Le texte a été mis à jour. Rechargez la page pour le relire avant de confirmer.' });
  });

  it('granted success message', async () => {
    setPresentationConsent.mockResolvedValue({ ok: true, createdAt: '2026-10-03T12:30:00Z' });
    const res = await setConsentAction(idle, form({ projectId: 'p', granted: 'true', version: 'v' }));
    expect(res.message).toBe('Accord donné le 03/10/2026.');
    expect(setPresentationConsent).toHaveBeenCalledWith(supabase, { projectId: 'p', granted: true, version: 'v', actorId: 'user-1' });
    expect(revalidatePath).toHaveBeenCalledWith('/espace-client');
  });

  it('withdrawn success message', async () => {
    setPresentationConsent.mockResolvedValue({ ok: true, createdAt: '2026-10-03T12:30:00Z' });
    const res = await setConsentAction(idle, form({ projectId: 'p', granted: 'false', version: 'v' }));
    expect(res.message).toBe('Accord retiré le 03/10/2026. Vous pouvez le redonner à tout moment.');
  });
});

describe('file actions', () => {
  const input = { projectId: 'p', filename: 'a.pdf', size: 10, mime: 'application/pdf' };

  it('requestUploadAction forwards the RLS client and client uploader', async () => {
    requestUpload.mockResolvedValue({ ok: true, fileId: 'f1', signedUrl: 'https://u', token: 't', path: 'x' });
    const res = await requestUploadAction(input);
    expect(res).toEqual({ ok: true, fileId: 'f1', signedUrl: 'https://u' });
    expect(requestUpload).toHaveBeenCalledWith(supabase, expect.objectContaining({ uploaderKind: 'client', uploaderId: 'user-1' }));
  });

  it('maps too_large and bad_type to copy', async () => {
    requestUpload.mockResolvedValueOnce({ ok: false, code: 'too_large' });
    expect(await requestUploadAction(input)).toEqual({ ok: false, message: PROJECT_COPY.errors.fileTooLarge });
    requestUpload.mockResolvedValueOnce({ ok: false, code: 'bad_type' });
    expect(await requestUploadAction(input)).toEqual({ ok: false, message: PROJECT_COPY.errors.fileType });
  });

  it('confirmUploadAction uses the RLS client', async () => {
    confirmUpload.mockResolvedValue({ ok: true });
    expect(await confirmUploadAction('f1')).toEqual({ ok: true });
    expect(confirmUpload).toHaveBeenCalledWith(supabase, 'f1');
  });

  it('downloadAction failure returns the download error copy', async () => {
    createDownloadUrl.mockResolvedValue({ ok: false, code: 'not_found' });
    expect(await downloadAction('f1')).toEqual({ ok: false, message: PROJECT_COPY.errors.downloadFailed });
  });
});
