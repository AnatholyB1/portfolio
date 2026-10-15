import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INVITE_COPY } from '@/lib/admin/inviteSchema';
import { runTool } from '../registry';

const siret = vi.hoisted(() => ({ lookupSiret: vi.fn() }));
const invite = vi.hoisted(() => ({ inviteClient: vi.fn() }));
vi.mock('@/lib/server/clients/siret', () => siret);
vi.mock('@/lib/server/clients/invite', () => invite);

import { clientTools } from './clients';

const principal = { tokenId: 't1', userId: 'admin-1' };
const audit = vi.fn();
const ctx = { supabase: {} as never, user: { id: 'admin-1' } as never };
const tool = (name: string) => {
  const t = clientTools.find((x) => x.name === name);
  if (!t) throw new Error(`missing tool ${name}`);
  return t;
};

beforeEach(() => {
  audit.mockReset();
  siret.lookupSiret.mockReset();
  invite.inviteClient.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('clientTools metadata', () => {
  it('declares exact names, covers and destructive flags', () => {
    expect(Object.fromEntries(clientTools.map((t) => [t.name, t.covers]))).toEqual({
      lookup_siret: ['lookupSiretAction'],
      invite_client: ['inviteClientAction'],
    });
    expect(clientTools.filter((t) => t.destructive).map((t) => t.name)).toEqual(['invite_client']);
  });
});

describe('lookup_siret', () => {
  it('returns the lookup result', async () => {
    const result = { ok: true, data: { siret: '12345678901234', nom: 'ACME' } };
    siret.lookupSiret.mockResolvedValue(result);
    expect(await runTool(tool('lookup_siret'), { siret: '12345678901234' }, ctx, principal, audit)).toEqual({ ok: true, data: result });
  });
});

describe('invite_client', () => {
  const args = { name: 'Acme', email: 'client@acme.fr', siret: '12345678901234', company: { nom: 'ACME SAS' } };

  it('without confirm never invites and previews who/what with a masked email', async () => {
    const r = await runTool(tool('invite_client'), args, ctx, principal, audit);
    expect(invite.inviteClient).not.toHaveBeenCalled();
    expect(r).toMatchObject({ ok: true, needsConfirmation: true });
    const json = JSON.stringify(r);
    expect(json).toContain('Acme');
    expect(json).toContain('c***@a***.fr');
    expect(json).not.toContain('client@acme.fr');
    expect(json).toContain('12345678901234');
  });

  it('with confirm invites with the actor and never returns the clear e-mail', async () => {
    invite.inviteClient.mockResolvedValue({ ok: true, clientId: 'c1', email: 'client@acme.fr', mailSent: true });
    const r = await runTool(tool('invite_client'), { ...args, confirm: true }, ctx, principal, audit);
    expect(invite.inviteClient).toHaveBeenCalledWith(
      { name: 'Acme', email: 'client@acme.fr', siret: '12345678901234', company: { nom: 'ACME SAS' }, companySource: 'api' },
      { userId: 'admin-1' },
    );
    expect(r).toMatchObject({ ok: true, data: { invited: true } });
    expect(JSON.stringify(r)).not.toContain('client@acme.fr');
  });

  it('passes a null company when none is given', async () => {
    invite.inviteClient.mockResolvedValue({ ok: false, code: 'error' });
    const { company: _c, ...noCompany } = args;
    void _c;
    await runTool(tool('invite_client'), { ...noCompany, companySource: 'manual', confirm: true }, ctx, principal, audit);
    expect(invite.inviteClient.mock.calls[0][0]).toMatchObject({ company: null, companySource: 'manual' });
  });

  it('turns a core refusal into an audited error', async () => {
    invite.inviteClient.mockResolvedValue({ ok: false, code: 'already_member' });
    const r = await runTool(tool('invite_client'), { ...args, confirm: true }, ctx, principal, audit);
    expect(r).toEqual({ ok: false, error: INVITE_COPY.alreadyMember });
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ tool: 'invite_client', outcome: 'error' }));
  });
});
