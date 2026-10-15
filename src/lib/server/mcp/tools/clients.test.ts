import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INVITE_COPY } from '@/lib/admin/inviteSchema';
import { runTool } from '../registry';
import { confirmTwoStep } from '../testing';

const siret = vi.hoisted(() => ({ lookupSiret: vi.fn() }));
const invite = vi.hoisted(() => ({ inviteClient: vi.fn(), resendInvitation: vi.fn() }));
const throttle = vi.hoisted(() => ({ hitThrottle: vi.fn() }));
vi.mock('@/lib/server/clients/siret', () => siret);
vi.mock('@/lib/server/clients/invite', () => invite);
vi.mock('@/lib/server/auth/throttle', () => throttle);

import { clientTools } from './clients';

const principal = { tokenId: 't1', userId: 'admin-1' };
const audit = vi.fn();
const CID = '11111111-1111-4111-8111-111111111111';
function makeCtx(rows: Record<string, unknown> = { sv_client_members: { invited_email: 'client@acme.fr' }, sv_clients: { name: 'Acme' } }) {
  const from = vi.fn((table: string) => {
    const b: Record<string, ReturnType<typeof vi.fn>> = {};
    b.select = vi.fn(() => b);
    b.eq = vi.fn(() => b);
    b.order = vi.fn(() => b);
    b.limit = vi.fn(() => Promise.resolve({ data: rows[table] ? [rows[table]] : [], error: null }));
    b.maybeSingle = vi.fn(() => Promise.resolve({ data: rows[table] ?? null, error: null }));
    return b;
  });
  return { supabase: { from } as never, user: { id: 'admin-1' } as never };
}
let ctx = makeCtx();
const tool = (name: string) => {
  const t = clientTools.find((x) => x.name === name);
  if (!t) throw new Error(`missing tool ${name}`);
  return t;
};

beforeEach(() => {
  audit.mockReset();
  siret.lookupSiret.mockReset();
  invite.inviteClient.mockReset();
  invite.resendInvitation.mockReset();
  throttle.hitThrottle.mockReset();
  throttle.hitThrottle.mockResolvedValue(true);
  ctx = makeCtx();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('clientTools metadata', () => {
  it('declares exact names, covers and destructive flags', () => {
    expect(Object.fromEntries(clientTools.map((t) => [t.name, t.covers]))).toEqual({
      lookup_siret: ['lookupSiretAction'],
      invite_client: ['inviteClientAction'],
      resend_invitation: ['resendInvitationAction'],
    });
    expect(clientTools.filter((t) => t.destructive).map((t) => t.name)).toEqual(['invite_client', 'resend_invitation']);
  });
});

describe('lookup_siret', () => {
  it('returns the lookup result', async () => {
    const result = { ok: true, data: { siret: '12345678901234', nom: 'ACME' } };
    siret.lookupSiret.mockResolvedValue(result);
    expect(await runTool(tool('lookup_siret'), { siret: '12345678901234' }, ctx, principal, audit)).toEqual({ ok: true, data: result });
  });
  it.each([
    ['invalid', INVITE_COPY.siretInvalid],
    ['not_found', INVITE_COPY.siretNotFound],
    ['rate_limited', INVITE_COPY.siretNotFound],
    ['unavailable', INVITE_COPY.siretNotFound],
  ])('a %s lookup carries a message so it is audited as an error', async (reason, message) => {
    siret.lookupSiret.mockResolvedValue({ ok: false, reason });
    const r = await runTool(tool('lookup_siret'), { siret: '12345678901234' }, ctx, principal, audit);
    expect(r).toEqual({ ok: false, error: message });
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ tool: 'lookup_siret', outcome: 'error' }));
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

  it('the preview says "nouveau client" when no client has this SIRET (read through RLS by siret)', async () => {
    ctx = makeCtx({});
    const r = await runTool(tool('invite_client'), args, ctx, principal, audit);
    expect(r).toMatchObject({ ok: true, needsConfirmation: true, preview: { clientStatus: 'nouveau client' } });
    expect((ctx.supabase as unknown as { from: ReturnType<typeof vi.fn> }).from).toHaveBeenCalledWith('sv_clients');
  });
  it('the preview names the existing client and the masked address that will get a new access', async () => {
    ctx = makeCtx({ sv_clients: { id: 'c9', name: 'ACME SAS' } });
    const r = await runTool(tool('invite_client'), args, ctx, principal, audit);
    expect(r).toMatchObject({
      ok: true,
      needsConfirmation: true,
      preview: { clientStatus: 'client existant ACME SAS: un nouvel accès sera ajouté pour c***@a***.fr' },
    });
    expect(JSON.stringify(r)).not.toContain('client@acme.fr');
  });
  it('the preview flags a malformed siret without querying', async () => {
    ctx = makeCtx({});
    const r = await runTool(tool('invite_client'), { ...args, siret: '123' }, ctx, principal, audit);
    expect(r).toMatchObject({ ok: true, needsConfirmation: true, preview: { clientStatus: INVITE_COPY.siretInvalid } });
  });
  it('companySource defaults to manual for tool-supplied company objects', async () => {
    invite.inviteClient.mockResolvedValue({ ok: false, code: 'error' });
    await confirmTwoStep(tool('invite_client'), { ...args }, ctx, principal, audit);
    expect(invite.inviteClient.mock.calls[0][0]).toMatchObject({ companySource: 'manual' });
  });
  it('with confirm invites with the actor and never returns the clear e-mail', async () => {
    invite.inviteClient.mockResolvedValue({ ok: true, clientId: 'c1', email: 'client@acme.fr', mailSent: true });
    const r = await confirmTwoStep(tool('invite_client'), { ...args }, ctx, principal, audit);
    expect(invite.inviteClient).toHaveBeenCalledWith(
      { name: 'Acme', email: 'client@acme.fr', siret: '12345678901234', company: { nom: 'ACME SAS' }, companySource: 'manual' },
      { userId: 'admin-1' },
    );
    expect(r).toMatchObject({ ok: true, data: { invited: true } });
    expect(JSON.stringify(r)).not.toContain('client@acme.fr');
  });

  it('passes a null company when none is given', async () => {
    invite.inviteClient.mockResolvedValue({ ok: false, code: 'error' });
    const { company: _c, ...noCompany } = args;
    void _c;
    await confirmTwoStep(tool('invite_client'), { ...noCompany, companySource: 'manual' }, ctx, principal, audit);
    expect(invite.inviteClient.mock.calls[0][0]).toMatchObject({ company: null, companySource: 'manual' });
  });

  it('turns a core refusal into an audited error', async () => {
    invite.inviteClient.mockResolvedValue({ ok: false, code: 'already_member' });
    const r = await confirmTwoStep(tool('invite_client'), { ...args }, ctx, principal, audit);
    expect(r).toEqual({ ok: false, error: INVITE_COPY.alreadyMember });
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ tool: 'invite_client', outcome: 'error' }));
  });
});

describe('invite_client partial success', () => {
  const args = { name: 'Acme', email: 'client@acme.fr', siret: '12345678901234' };
  it('tells the caller the client was created but the mail was not sent', async () => {
    invite.inviteClient.mockResolvedValue({ ok: true, clientId: 'c1', email: 'client@acme.fr', mailSent: false });
    const r = await confirmTwoStep(tool('invite_client'), args, ctx, principal, audit);
    expect(r).toMatchObject({ ok: true, data: { invited: false, partial: true, clientCreated: true, mailSent: false, clientId: 'c1' } });
    expect(JSON.stringify(r)).not.toContain('client@acme.fr');
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ tool: 'invite_client', outcome: 'ok' }));
  });
});

describe('resend_invitation', () => {
  it('without confirm never sends and previews a masked address', async () => {
    const r = await runTool(tool('resend_invitation'), { clientId: CID }, ctx, principal, audit);
    expect(invite.resendInvitation).not.toHaveBeenCalled();
    expect(throttle.hitThrottle).not.toHaveBeenCalled();
    expect(r).toMatchObject({ ok: true, needsConfirmation: true });
    const json = JSON.stringify(r);
    expect(json).toContain('c***@a***.fr');
    expect(json).not.toContain('client@acme.fr');
    expect(json).toContain('Acme');
  });
  it('previews without address when the client has no invitation', async () => {
    ctx = makeCtx({});
    const r = await runTool(tool('resend_invitation'), { clientId: CID }, ctx, principal, audit);
    expect(r).toMatchObject({ ok: true, needsConfirmation: true });
  });
  it('with confirm resends and never returns the clear e-mail', async () => {
    invite.resendInvitation.mockResolvedValue({ ok: true, email: 'client@acme.fr' });
    const r = await confirmTwoStep(tool('resend_invitation'), { clientId: CID }, ctx, principal, audit);
    expect(invite.resendInvitation).toHaveBeenCalledWith(CID);
    expect(r).toMatchObject({ ok: true, data: { resent: true, email: 'c***@a***.fr' } });
    expect(JSON.stringify(r)).not.toContain('client@acme.fr');
  });
  it('rate limiting is an audited error', async () => {
    throttle.hitThrottle.mockResolvedValue(false);
    const r = await confirmTwoStep(tool('resend_invitation'), { clientId: CID }, ctx, principal, audit);
    expect(r).toEqual({ ok: false, error: INVITE_COPY.resendRateLimited });
    expect(invite.resendInvitation).not.toHaveBeenCalled();
  });
});
