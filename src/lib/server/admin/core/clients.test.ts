import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INVITE_COPY } from '@/lib/admin/inviteSchema';

const siret = vi.hoisted(() => ({ lookupSiret: vi.fn() }));
const invite = vi.hoisted(() => ({ inviteClient: vi.fn(), resendInvitation: vi.fn() }));
const throttle = vi.hoisted(() => ({ hitThrottle: vi.fn() }));
vi.mock('@/lib/server/clients/siret', () => siret);
vi.mock('@/lib/server/clients/invite', () => invite);
vi.mock('@/lib/server/auth/throttle', () => throttle);

import { inviteClientCore, lookupSiretCore, resendInvitationCore } from './clients';

const ctx = { supabase: {} as never, user: { id: 'admin-1' } as never };
const base = { name: 'Acme', email: 'client@acme.fr', siret: '123 456 789 01234', company: null, companySource: 'api' };

beforeEach(() => {
  siret.lookupSiret.mockReset();
  invite.inviteClient.mockReset();
  invite.resendInvitation.mockReset();
  throttle.hitThrottle.mockReset();
  throttle.hitThrottle.mockResolvedValue(true);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('lookupSiretCore', () => {
  it('passes the lookup result through unchanged', async () => {
    const result = { ok: false, reason: 'not_found' };
    siret.lookupSiret.mockResolvedValue(result);
    expect(await lookupSiretCore(ctx, { siret: '12345678901234' })).toBe(result);
    expect(siret.lookupSiret).toHaveBeenCalledWith('12345678901234');
  });
  it('coerces a missing siret to an empty string', async () => {
    siret.lookupSiret.mockResolvedValue({ ok: false, reason: 'invalid' });
    await lookupSiretCore(ctx, {});
    expect(siret.lookupSiret).toHaveBeenCalledWith('');
  });
});

describe('inviteClientCore', () => {
  it('invites with the session user as actor and returns the success message', async () => {
    invite.inviteClient.mockResolvedValue({ ok: true, clientId: 'c1', email: 'client@acme.fr', mailSent: true });
    const r = await inviteClientCore(ctx, base);
    expect(r).toEqual({ ok: true, message: INVITE_COPY.success('client@acme.fr'), data: { email: 'client@acme.fr' } });
    expect(invite.inviteClient).toHaveBeenCalledWith(base, { userId: 'admin-1' });
  });
  it('maps ok without mail to the generic error', async () => {
    invite.inviteClient.mockResolvedValue({ ok: true, clientId: 'c1', email: 'x@y.fr', mailSent: false });
    expect(await inviteClientCore(ctx, base)).toEqual({
      ok: false,
      message: INVITE_COPY.generic,
      data: { email: 'x@y.fr', clientId: 'c1', mailSent: false },
    });
  });
  it.each([
    ['role_conflict', INVITE_COPY.roleConflict],
    ['already_member', INVITE_COPY.alreadyMember],
    ['existing_account', INVITE_COPY.existingAccount],
    ['mail_disabled', INVITE_COPY.generic],
    ['error', INVITE_COPY.generic],
  ])('maps %s', async (code, message) => {
    invite.inviteClient.mockResolvedValue({ ok: false, code });
    expect(await inviteClientCore(ctx, base)).toEqual({ ok: false, message });
  });
  it('maps invalid to the precise siret message, else generic', async () => {
    invite.inviteClient.mockResolvedValue({ ok: false, code: 'invalid' });
    expect(await inviteClientCore(ctx, { ...base, siret: '123' })).toEqual({ ok: false, message: INVITE_COPY.siretInvalid });
    expect(await inviteClientCore(ctx, base)).toEqual({ ok: false, message: INVITE_COPY.generic });
    expect(await inviteClientCore(ctx, { ...base, email: 'nope' })).toEqual({ ok: false, message: INVITE_COPY.emailInvalid });
  });
});

describe('resendInvitationCore', () => {
  const CID = '11111111-1111-1111-1111-111111111111';
  it('is rate limited before sending', async () => {
    throttle.hitThrottle.mockResolvedValueOnce(false);
    expect(await resendInvitationCore(ctx, { clientId: CID })).toEqual({ ok: false, message: INVITE_COPY.resendRateLimited });
    expect(invite.resendInvitation).not.toHaveBeenCalled();
  });
  it('throttles per client then per admin with hashed keys', async () => {
    invite.resendInvitation.mockResolvedValue({ ok: true, email: 'client@acme.fr' });
    await resendInvitationCore(ctx, { clientId: CID });
    const [a, b] = throttle.hitThrottle.mock.calls;
    expect(a[0]).toMatch(/^invite-resend-client:[0-9a-f]{64}$/);
    expect(b[0]).toMatch(/^invite-resend-admin:[0-9a-f]{64}$/);
    expect(a.slice(1)).toEqual([600, 3]);
    expect(b.slice(1)).toEqual([600, 20]);
  });
  it('re-sends and reports success', async () => {
    invite.resendInvitation.mockResolvedValue({ ok: true, email: 'client@acme.fr' });
    expect(await resendInvitationCore(ctx, { clientId: CID })).toEqual({
      ok: true,
      message: INVITE_COPY.resendSuccess('client@acme.fr'),
      data: { email: 'client@acme.fr' },
    });
    expect(invite.resendInvitation).toHaveBeenCalledWith(CID);
  });
  it('maps failures', async () => {
    invite.resendInvitation.mockResolvedValue({ ok: false, code: 'not_found' });
    expect(await resendInvitationCore(ctx, { clientId: CID })).toEqual({ ok: false, message: INVITE_COPY.resendNotFound });
    invite.resendInvitation.mockResolvedValue({ ok: false, code: 'mail_failed' });
    expect(await resendInvitationCore(ctx, { clientId: CID })).toEqual({ ok: false, message: INVITE_COPY.generic });
    invite.resendInvitation.mockResolvedValue({ ok: false, code: 'invalid' });
    expect(await resendInvitationCore(ctx, { clientId: 'x' })).toEqual({ ok: false, message: INVITE_COPY.generic });
  });
});
