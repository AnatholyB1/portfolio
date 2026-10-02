import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAdmin = vi.fn();
vi.mock('@/lib/server/auth/dal', () => ({ requireAdmin: () => requireAdmin() }));

const lookupSiret = vi.fn();
vi.mock('@/lib/server/clients/siret', () => ({ lookupSiret: (s: string) => lookupSiret(s) }));

const inviteClient = vi.fn();
vi.mock('@/lib/server/clients/invite', () => ({
  inviteClient: (input: unknown, actor: unknown) => inviteClient(input, actor),
}));

const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: (p: string) => revalidatePath(p) }));

const { lookupSiretAction, inviteClientAction } = await import('./actions');
const { INVITE_COPY } = await import('@/lib/admin/inviteSchema');

const idle = { status: 'idle' as const };

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const base = { name: 'Acme', email: 'Client@Acme.fr', siret: '123 456 789 01234' };

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ user: { id: 'admin-1' } });
});

describe('lookupSiretAction', () => {
  it('does not call lookupSiret when requireAdmin throws', async () => {
    requireAdmin.mockRejectedValue(new Error('NOT_FOUND'));
    await expect(lookupSiretAction('12345678901234')).rejects.toThrow('NOT_FOUND');
    expect(lookupSiret).not.toHaveBeenCalled();
  });
  it('passes the lookup result through', async () => {
    const result = { ok: false, reason: 'not_found' };
    lookupSiret.mockResolvedValue(result);
    expect(await lookupSiretAction('12345678901234')).toBe(result);
    expect(lookupSiret).toHaveBeenCalledWith('12345678901234');
  });
});

describe('inviteClientAction', () => {
  it('does not call inviteClient when requireAdmin throws', async () => {
    requireAdmin.mockRejectedValue(new Error('NOT_FOUND'));
    await expect(inviteClientAction(idle, form(base))).rejects.toThrow('NOT_FOUND');
    expect(inviteClient).not.toHaveBeenCalled();
  });

  it('succeeds with the session user id as actor and revalidates /admin', async () => {
    inviteClient.mockResolvedValue({ ok: true, clientId: 'c1', email: 'client@acme.fr', mailSent: true });
    const res = await inviteClientAction(idle, form({ ...base, userId: 'attacker' }));
    expect(res).toEqual({ status: 'success', message: 'Invitation envoyée à client@acme.fr.' });
    expect(inviteClient.mock.calls[0][1]).toEqual({ userId: 'admin-1' });
    expect(revalidatePath).toHaveBeenCalledWith('/admin');
  });

  it('maps ok without mail to the generic error and does not revalidate', async () => {
    inviteClient.mockResolvedValue({ ok: true, clientId: 'c1', email: 'x@y.fr', mailSent: false });
    const res = await inviteClientAction(idle, form(base));
    expect(res).toEqual({ status: 'error', message: INVITE_COPY.generic });
  });

  it.each([
    ['role_conflict', INVITE_COPY.roleConflict],
    ['already_member', INVITE_COPY.alreadyMember],
    ['existing_account', INVITE_COPY.existingAccount],
    ['mail_disabled', INVITE_COPY.generic],
    ['error', INVITE_COPY.generic],
  ])('maps %s', async (code, message) => {
    inviteClient.mockResolvedValue({ ok: false, code });
    expect(await inviteClientAction(idle, form(base))).toEqual({ status: 'error', message });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('maps invalid to siretInvalid when the SIRET is malformed', async () => {
    inviteClient.mockResolvedValue({ ok: false, code: 'invalid' });
    const res = await inviteClientAction(idle, form({ ...base, siret: '123' }));
    expect(res.message).toBe(INVITE_COPY.siretInvalid);
  });

  it('maps invalid to generic when the SIRET is well formed', async () => {
    inviteClient.mockResolvedValue({ ok: false, code: 'invalid' });
    const res = await inviteClientAction(idle, form(base));
    expect(res.message).toBe(INVITE_COPY.generic);
  });

  it('assembles company fields from the form (api source)', async () => {
    inviteClient.mockResolvedValue({ ok: false, code: 'error' });
    await inviteClientAction(
      idle,
      form({
        ...base,
        company_source: 'api',
        company_nom: 'ACME SAS',
        company_adresse: '1 rue X',
        company_code_postal: '75001',
        company_commune: 'Paris',
        company_naf: '62.01Z',
        company_siren: '123456789',
        company_etat_administratif: 'A',
      }),
    );
    const input = inviteClient.mock.calls[0][0];
    expect(input.companySource).toBe('api');
    expect(input.company).toMatchObject({
      nom: 'ACME SAS',
      code_postal: '75001',
      commune: 'Paris',
      naf: '62.01Z',
      siren: '123456789',
      etat_administratif: 'A',
    });
  });

  it('uses manual source and null company when nothing was entered', async () => {
    inviteClient.mockResolvedValue({ ok: false, code: 'error' });
    await inviteClientAction(idle, form({ ...base, company_source: 'manual' }));
    const input = inviteClient.mock.calls[0][0];
    expect(input.companySource).toBe('manual');
    expect(input.company).toBeNull();
  });

  it('omits empty optional company fields', async () => {
    inviteClient.mockResolvedValue({ ok: false, code: 'error' });
    await inviteClientAction(
      idle,
      form({ ...base, company_source: 'manual', company_nom: 'Saisie', company_code_postal: '' }),
    );
    const company = inviteClient.mock.calls[0][0].company;
    expect(company).toEqual({ nom: 'Saisie' });
  });
});
