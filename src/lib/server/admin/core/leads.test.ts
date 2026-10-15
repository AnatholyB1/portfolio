import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN_COPY, STATUS_LABELS } from '@/lib/admin/leadLabels';
import { INVITE_COPY } from '@/lib/admin/inviteSchema';
import { PROJECT_COPY } from '@/lib/projects/copy';

const admin = vi.hoisted(() => ({
  setLeadStatus: vi.fn(),
  correctLeadSource: vi.fn(),
  eraseLead: vi.fn(),
  markReturnSeen: vi.fn(),
}));
const convert = vi.hoisted(() => ({ convertLead: vi.fn() }));
vi.mock('@/lib/server/leads/admin', () => admin);
vi.mock('@/lib/server/projects/convert', () => convert);

import {
  convertLeadCore,
  correctLeadSourceCore,
  eraseLeadCore,
  markLeadLostCore,
  markReturnSeenCore,
  setLeadStatusCore,
  siretExistsCore,
} from './leads';

const ID = '11111111-1111-4111-8111-111111111111';

function makeCtx(row: unknown = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { ctx: { supabase: { from } as never, user: { id: 'admin-1' } as never }, from, select, eq };
}

beforeEach(() => {
  for (const f of [...Object.values(admin), ...Object.values(convert)]) f.mockReset();
});

describe('setLeadStatusCore', () => {
  it('refuses lost with lostReasonRequired', async () => {
    const { ctx } = makeCtx();
    expect(await setLeadStatusCore(ctx, { leadId: ID, status: 'lost' })).toEqual({
      ok: false,
      message: ADMIN_COPY.lostReasonRequired,
    });
    expect(admin.setLeadStatus).not.toHaveBeenCalled();
  });
  it('maps invalid uuid to statusError', async () => {
    const { ctx } = makeCtx();
    expect(await setLeadStatusCore(ctx, { leadId: 'x', status: 'rdv' })).toEqual({
      ok: false,
      message: ADMIN_COPY.statusError,
    });
  });
  it('calls setLeadStatus with actor = ctx.user.id', async () => {
    admin.setLeadStatus.mockResolvedValue({ ok: true });
    const { ctx } = makeCtx();
    const r = await setLeadStatusCore(ctx, { leadId: ID, status: 'rdv' });
    expect(admin.setLeadStatus).toHaveBeenCalledWith({ leadId: ID, status: 'rdv', actor: 'admin-1' });
    expect(r).toEqual({ ok: true, message: ADMIN_COPY.statusSuccess(STATUS_LABELS.rdv) });
  });
  it('maps service failure to statusError', async () => {
    admin.setLeadStatus.mockResolvedValue({ ok: false });
    const { ctx } = makeCtx();
    expect(await setLeadStatusCore(ctx, { leadId: ID, status: 'rdv' })).toEqual({
      ok: false,
      message: ADMIN_COPY.statusError,
    });
  });
});

describe('markLeadLostCore', () => {
  it('requires a reason', async () => {
    const { ctx } = makeCtx();
    expect(await markLeadLostCore(ctx, { leadId: ID, reason: '' })).toEqual({
      ok: false,
      message: ADMIN_COPY.lostReasonRequired,
    });
  });
  it('invalid uuid gives statusError', async () => {
    const { ctx } = makeCtx();
    expect(await markLeadLostCore(ctx, { leadId: 'x', reason: 'autre' })).toEqual({
      ok: false,
      message: ADMIN_COPY.statusError,
    });
  });
  it('trims the note, drops empty ones and passes the actor', async () => {
    admin.setLeadStatus.mockResolvedValue({ ok: true });
    const { ctx } = makeCtx();
    const r = await markLeadLostCore(ctx, { leadId: ID, reason: 'autre', note: '   ' });
    expect(admin.setLeadStatus).toHaveBeenCalledWith({
      leadId: ID,
      status: 'lost',
      actor: 'admin-1',
      lostReason: 'autre',
      note: null,
    });
    expect(r).toEqual({ ok: true, message: ADMIN_COPY.statusSuccess(STATUS_LABELS.lost) });
  });
});

describe('correctLeadSourceCore', () => {
  const base = { leadId: ID, source: 'google', medium: 'cpc', campaign: '', reason: 'raison assez longue' };
  it('short reason gives correctionReasonRequired', async () => {
    const { ctx } = makeCtx();
    expect(await correctLeadSourceCore(ctx, { ...base, reason: 'court' })).toEqual({
      ok: false,
      message: ADMIN_COPY.correctionReasonRequired,
    });
  });
  it('other invalid gives genericError', async () => {
    const { ctx } = makeCtx();
    expect(await correctLeadSourceCore(ctx, { ...base, source: '' })).toEqual({
      ok: false,
      message: ADMIN_COPY.genericError,
    });
  });
  it('succeeds with actor', async () => {
    admin.correctLeadSource.mockResolvedValue({ ok: true });
    const { ctx } = makeCtx();
    const r = await correctLeadSourceCore(ctx, base);
    expect(admin.correctLeadSource).toHaveBeenCalledWith({ ...base, actor: 'admin-1' });
    expect(r).toEqual({ ok: true, message: ADMIN_COPY.correctionSuccess });
  });
});

describe('eraseLeadCore', () => {
  const input = { leadId: ID, reason: 'doublon', confirmEmail: 'A@B.fr' };
  it('invalid input gives genericError without reading', async () => {
    const { ctx, from } = makeCtx();
    expect(await eraseLeadCore(ctx, { ...input, reason: 'nope' })).toEqual({ ok: false, message: ADMIN_COPY.genericError });
    expect(from).not.toHaveBeenCalled();
  });
  it('mismatched email gives eraseConfirmMismatch and never erases', async () => {
    const { ctx } = makeCtx({ contact_email: 'other@b.fr' });
    expect(await eraseLeadCore(ctx, input)).toEqual({ ok: false, message: ADMIN_COPY.eraseConfirmMismatch });
    expect(admin.eraseLead).not.toHaveBeenCalled();
  });
  it('missing lead gives eraseConfirmMismatch', async () => {
    const { ctx } = makeCtx(null);
    expect((await eraseLeadCore(ctx, input)).ok).toBe(false);
    expect(admin.eraseLead).not.toHaveBeenCalled();
  });
  it('matching email (case-insensitive) erases', async () => {
    admin.eraseLead.mockResolvedValue({ ok: true });
    const { ctx, from, eq } = makeCtx({ contact_email: ' a@b.fr ' });
    expect(await eraseLeadCore(ctx, input)).toEqual({ ok: true, message: ADMIN_COPY.eraseSuccess });
    expect(from).toHaveBeenCalledWith('sv_leads_admin_v');
    expect(eq).toHaveBeenCalledWith('id', ID);
    expect(admin.eraseLead).toHaveBeenCalledWith(ID, 'admin-1', 'doublon');
  });
  it('service failure gives genericError', async () => {
    admin.eraseLead.mockResolvedValue({ ok: false });
    const { ctx } = makeCtx({ contact_email: 'a@b.fr' });
    expect(await eraseLeadCore(ctx, input)).toEqual({ ok: false, message: ADMIN_COPY.genericError });
  });
});

describe('markReturnSeenCore', () => {
  it('invalid id gives genericError', async () => {
    const { ctx } = makeCtx();
    expect(await markReturnSeenCore(ctx, { leadId: 'x' })).toEqual({ ok: false, message: ADMIN_COPY.genericError });
  });
  it('calls markReturnSeen with actor', async () => {
    admin.markReturnSeen.mockResolvedValue({ ok: true });
    const { ctx } = makeCtx();
    expect(await markReturnSeenCore(ctx, { leadId: ID })).toEqual({ ok: true, message: ADMIN_COPY.returnSeenSuccess });
    expect(admin.markReturnSeen).toHaveBeenCalledWith(ID, 'admin-1');
  });
  it('service failure gives genericError', async () => {
    admin.markReturnSeen.mockResolvedValue({ ok: false });
    const { ctx } = makeCtx();
    expect((await markReturnSeenCore(ctx, { leadId: ID })).ok).toBe(false);
  });
});

describe('siretExistsCore', () => {
  it('non 14-digit siret is false without querying', async () => {
    const { ctx, from } = makeCtx();
    expect(await siretExistsCore(ctx, { siret: '123' })).toMatchObject({ ok: true, data: { exists: false } });
    expect(from).not.toHaveBeenCalled();
  });
  it('strips whitespace and reports existence', async () => {
    const { ctx, from, eq } = makeCtx({ id: 'c1' });
    expect(await siretExistsCore(ctx, { siret: '123 456 789 01234' })).toMatchObject({ ok: true, data: { exists: true } });
    expect(from).toHaveBeenCalledWith('sv_clients');
    expect(eq).toHaveBeenCalledWith('siret', '12345678901234');
  });
  it('non-string siret is false', async () => {
    const { ctx } = makeCtx();
    expect(await siretExistsCore(ctx, { siret: 5 })).toMatchObject({ data: { exists: false } });
  });
});

describe('convertLeadCore', () => {
  const input = {
    leadId: ID,
    name: 'Acme',
    email: 'a@acme.fr',
    siret: '12345678901234',
    company: null,
    companySource: 'api',
    offer: 'x',
    projectTitle: 'T',
  };
  it('passes the input through with actor and maps success', async () => {
    convert.convertLead.mockResolvedValue({ ok: true, clientId: 'c', projectId: 'p', clientReused: true, email: 'a@acme.fr', mailSent: true });
    const { ctx } = makeCtx();
    const r = await convertLeadCore(ctx, input);
    expect(convert.convertLead).toHaveBeenCalledWith(input, { userId: 'admin-1' });
    expect(r).toEqual({
      ok: true,
      message: PROJECT_COPY.conversion.success('a@acme.fr'),
      data: { projectId: 'p', mailSent: true, clientReused: true },
    });
  });
  it('mailSent=false uses mailFailed', async () => {
    convert.convertLead.mockResolvedValue({ ok: true, clientId: 'c', projectId: 'p', clientReused: false, email: 'e', mailSent: false });
    const { ctx } = makeCtx();
    expect(await convertLeadCore(ctx, input)).toMatchObject({ ok: true, message: PROJECT_COPY.conversion.mailFailed });
  });
  it.each([
    ['role_conflict', PROJECT_COPY.conversion.emailTaken],
    ['already_member', PROJECT_COPY.conversion.emailTaken],
    ['existing_account', PROJECT_COPY.conversion.emailTaken],
    ['already_converted', PROJECT_COPY.conversion.alreadyConverted],
    ['not_convertible', PROJECT_COPY.conversion.statusNotAllowed],
    ['error', INVITE_COPY.generic],
    ['mail_disabled', INVITE_COPY.generic],
  ])('maps %s', async (code, message) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    convert.convertLead.mockResolvedValue({ ok: false, code });
    const { ctx } = makeCtx();
    expect(await convertLeadCore(ctx, input)).toEqual({ ok: false, message });
  });
  it('invalid with valid siret gives generic, with bad siret gives siretInvalid', async () => {
    convert.convertLead.mockResolvedValue({ ok: false, code: 'invalid' });
    const { ctx } = makeCtx();
    expect(await convertLeadCore(ctx, input)).toEqual({ ok: false, message: INVITE_COPY.generic });
    expect(await convertLeadCore(ctx, { ...input, siret: '12' })).toEqual({ ok: false, message: INVITE_COPY.siretInvalid });
  });
});
