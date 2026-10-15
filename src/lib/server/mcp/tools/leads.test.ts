import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN_COPY } from '@/lib/admin/leadLabels';
import { runTool } from '../registry';
import { confirmTwoStep } from '../testing';

const admin = vi.hoisted(() => ({
  setLeadStatus: vi.fn(),
  correctLeadSource: vi.fn(),
  eraseLead: vi.fn(),
  markReturnSeen: vi.fn(),
}));
const convert = vi.hoisted(() => ({ convertLead: vi.fn() }));
vi.mock('@/lib/server/leads/admin', () => admin);
vi.mock('@/lib/server/projects/convert', () => convert);

import { leadTools, maskEmail } from './leads';

const ID = '11111111-1111-4111-8111-111111111111';
const principal = { tokenId: 't1', userId: 'admin-1' };
const audit = vi.fn();

type Builder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
};
function makeCtx(row: unknown = { contact_email: 'alice@dupont.fr' }, list: unknown[] = []) {
  const b = {} as Builder;
  b.select = vi.fn(() => b);
  b.eq = vi.fn(() => b);
  b.order = vi.fn(() => b);
  b.limit = vi.fn(() => Promise.resolve({ data: list, error: null }));
  b.maybeSingle = vi.fn(() => Promise.resolve({ data: row, error: null }));
  const from = vi.fn(() => b);
  return { ctx: { supabase: { from } as never, user: { id: 'admin-1' } as never }, from, b };
}
const tool = (name: string) => {
  const t = leadTools.find((x) => x.name === name);
  if (!t) throw new Error(`missing tool ${name}`);
  return t;
};

beforeEach(() => {
  audit.mockReset();
  for (const f of [...Object.values(admin), ...Object.values(convert)]) f.mockReset();
});

describe('leadTools metadata', () => {
  it('declares exact names and covers', () => {
    const map = Object.fromEntries(leadTools.map((t) => [t.name, t.covers]));
    expect(map).toEqual({
      list_leads: [],
      get_lead: [],
      set_lead_status: ['setStatusAction'],
      mark_lead_lost: ['markLostAction'],
      correct_lead_source: ['correctSourceAction'],
      mark_lead_return_seen: ['markReturnSeenAction'],
      lookup_siret_exists: ['siretExistsAction'],
      erase_lead: ['eraseLeadAction'],
      convert_lead_to_client: ['convertLeadAction'],
    });
    expect(leadTools.filter((t) => t.destructive).map((t) => t.name).sort()).toEqual([
      'convert_lead_to_client',
      'erase_lead',
    ]);
  });
});

describe('maskEmail', () => {
  it('masks local part and domain name', () => {
    expect(maskEmail('alice@dupont.fr')).toBe('a***@d***.fr');
    expect(maskEmail('  alice@dupont.fr ')).toBe('a***@d***.fr');
    expect(maskEmail('bad')).toBe('***');
  });
  it.each(['a@.fr', 'a@b', '@x.fr', 'x@', 'a@@b.fr', '', '   ', 'é@ü.fr'])('is safe on %j', (input) => {
    const out = maskEmail(input);
    expect(out).not.toContain('undefined');
    expect(out).not.toBe(input);
    expect(out).toMatch(/\*\*\*/);
  });
  it('handles astral first characters and tolerates non-strings', () => {
    expect(maskEmail('\u{1D4D0}x@d.fr')).toBe('\u{1D4D0}***@d***.fr');
    expect(maskEmail(undefined as never)).toBe('***');
  });
});

describe('erase_lead', () => {
  const args = { leadId: ID, reason: 'doublon', confirmEmail: 'alice@dupont.fr' };
  it('without confirm never erases and previews a masked email', async () => {
    const { ctx } = makeCtx();
    const r = await runTool(tool('erase_lead'), args, ctx, principal, audit);
    expect(admin.eraseLead).not.toHaveBeenCalled();
    expect(r).toMatchObject({ ok: true, needsConfirmation: true });
    const json = JSON.stringify(r);
    expect(json).toContain('a***@d***.fr');
    expect(json).not.toContain('alice@dupont.fr');
    expect(json).toContain(ID);
    expect(json).toContain('doublon');
  });
  it('with confirm erases', async () => {
    admin.eraseLead.mockResolvedValue({ ok: true });
    const { ctx } = makeCtx();
    const r = await confirmTwoStep(tool('erase_lead'), { ...args }, ctx, principal, audit);
    expect(admin.eraseLead).toHaveBeenCalledWith(ID, 'admin-1', 'doublon');
    expect(r).toMatchObject({ ok: true, data: { ok: true } });
  });
  it('with confirm but wrong email does not erase', async () => {
    const { ctx } = makeCtx();
    const r = await confirmTwoStep(tool('erase_lead'), { ...args, confirmEmail: 'x@y.fr' }, ctx, principal, audit);
    expect(admin.eraseLead).not.toHaveBeenCalled();
    expect(r).toEqual({ ok: false, error: ADMIN_COPY.eraseConfirmMismatch });
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ tool: 'erase_lead', outcome: 'error' }));
  });
});

describe('convert_lead_to_client', () => {
  const args = {
    leadId: ID,
    name: 'Acme',
    email: 'contact@acme.fr',
    siret: '12345678901234',
    offer: 'site-vitrine',
    projectTitle: 'Refonte',
    company: { nom: 'ACME SAS', code_postal: '75001' },
  };
  it('without confirm never converts and previews who/what', async () => {
    const { ctx } = makeCtx();
    const r = await runTool(tool('convert_lead_to_client'), args, ctx, principal, audit);
    expect(convert.convertLead).not.toHaveBeenCalled();
    expect(r).toMatchObject({ ok: true, needsConfirmation: true });
    const json = JSON.stringify(r);
    expect(json).toContain('Acme');
    expect(json).toContain('contact@acme.fr');
    expect(json).toContain('site-vitrine');
  });
  it('with confirm converts, mapping the structured company', async () => {
    convert.convertLead.mockResolvedValue({ ok: true, clientId: 'c', projectId: 'p', clientReused: false, email: 'contact@acme.fr', mailSent: true });
    const { ctx } = makeCtx();
    const r = await confirmTwoStep(tool('convert_lead_to_client'), { ...args }, ctx, principal, audit);
    expect(convert.convertLead).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: ID,
        siret: '12345678901234',
        company: { nom: 'ACME SAS', code_postal: '75001' },
        companySource: 'api',
        offer: 'site-vitrine',
        projectTitle: 'Refonte',
      }),
      { userId: 'admin-1' },
    );
    expect(r).toMatchObject({ ok: true, data: { ok: true, data: { projectId: 'p' } } });
  });
  it('rejects an unknown offer as invalid_input', async () => {
    const { ctx } = makeCtx();
    const r = await confirmTwoStep(tool('convert_lead_to_client'), { ...args, offer: 'nope' }, ctx, principal, audit);
    expect(r).toEqual({ ok: false, error: 'invalid_input' });
    expect(convert.convertLead).not.toHaveBeenCalled();
  });
});

describe('write tools', () => {
  it('set_lead_status delegates to the core with the actor', async () => {
    admin.setLeadStatus.mockResolvedValue({ ok: true });
    const { ctx } = makeCtx();
    const r = await runTool(tool('set_lead_status'), { leadId: ID, status: 'rdv' }, ctx, principal, audit);
    expect(admin.setLeadStatus).toHaveBeenCalledWith({ leadId: ID, status: 'rdv', actor: 'admin-1' });
    expect(r).toMatchObject({ ok: true, data: { ok: true } });
  });
  it('mark_lead_lost, correct_lead_source, mark_lead_return_seen delegate', async () => {
    admin.setLeadStatus.mockResolvedValue({ ok: true });
    admin.correctLeadSource.mockResolvedValue({ ok: true });
    admin.markReturnSeen.mockResolvedValue({ ok: true });
    const { ctx } = makeCtx();
    await runTool(tool('mark_lead_lost'), { leadId: ID, reason: 'autre' }, ctx, principal, audit);
    await runTool(tool('correct_lead_source'), { leadId: ID, source: 's', medium: 'm', reason: 'une raison valable' }, ctx, principal, audit);
    await runTool(tool('mark_lead_return_seen'), { leadId: ID }, ctx, principal, audit);
    expect(admin.setLeadStatus).toHaveBeenCalledWith(expect.objectContaining({ status: 'lost', lostReason: 'autre' }));
    expect(admin.correctLeadSource).toHaveBeenCalledWith(expect.objectContaining({ campaign: '', actor: 'admin-1' }));
    expect(admin.markReturnSeen).toHaveBeenCalledWith(ID, 'admin-1');
  });
  it('lookup_siret_exists returns the boolean', async () => {
    const { ctx } = makeCtx({ id: 'c1' });
    const r = await runTool(tool('lookup_siret_exists'), { siret: '12345678901234' }, ctx, principal, audit);
    expect(r).toEqual({ ok: true, data: { exists: true } });
  });
});

describe('read tools', () => {
  it('list_leads projects explicit columns, orders desc and caps the limit', async () => {
    const { ctx, from, b } = makeCtx(null, [{ id: ID }]);
    const r = await runTool(tool('list_leads'), { status: 'new' }, ctx, principal, audit);
    expect(from).toHaveBeenCalledWith('sv_leads_admin_v');
    const cols = b.select.mock.calls[0]![0] as string;
    expect(cols).not.toBe('*');
    expect(cols).toContain('contact_email');
    expect(b.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(b.eq).toHaveBeenCalledWith('status', 'new');
    expect(b.limit).toHaveBeenCalledWith(20);
    expect(r).toEqual({ ok: true, data: { leads: [{ id: ID, contact_nom: null, contact_email: null }] } });
    expect((await runTool(tool('list_leads'), { limit: 51 }, ctx, principal, audit)).ok).toBe(false);
  });
  it('list_leads masks contact PII and drops the phone', async () => {
    const row = { id: ID, contact_nom: 'Alice Dupont', contact_email: 'alice@dupont.fr', contact_telephone: '0600000000', status: 'new' };
    const { ctx } = makeCtx(null, [row]);
    const r = await runTool(tool('list_leads'), {}, ctx, principal, audit);
    expect(r).toEqual({
      ok: true,
      data: { leads: [{ id: ID, status: 'new', contact_nom: 'A.', contact_email: 'a***@d***.fr' }] },
    });
    expect(JSON.stringify(r)).not.toContain('0600000000');
  });
  it('list_leads tolerates leads without contact', async () => {
    const { ctx } = makeCtx(null, [{ id: ID, contact_nom: null, contact_email: null, contact_telephone: null }]);
    const r = await runTool(tool('list_leads'), {}, ctx, principal, audit);
    expect(r).toEqual({ ok: true, data: { leads: [{ id: ID, contact_nom: null, contact_email: null }] } });
  });
  it('get_lead reads one lead by id, null when absent', async () => {
    const { ctx, b } = makeCtx({ id: ID });
    expect(await runTool(tool('get_lead'), { leadId: ID }, ctx, principal, audit)).toEqual({ ok: true, data: { lead: { id: ID } } });
    expect(b.eq).toHaveBeenCalledWith('id', ID);
    const none = makeCtx(null);
    expect(await runTool(tool('get_lead'), { leadId: ID }, none.ctx, principal, audit)).toEqual({ ok: true, data: { lead: null } });
  });
});

describe('input trimming and company cleanup', () => {
  it('applies limits after trimming', async () => {
    const { ctx } = makeCtx();
    const base = { leadId: ID, name: 'Acme', email: 'a@acme.fr', siret: '12345678901234', offer: 'site-vitrine' };
    expect(await runTool(tool('convert_lead_to_client'), { ...base, projectTitle: '   ' }, ctx, principal, audit)).toEqual({ ok: false, error: 'invalid_input' });
    expect(await runTool(tool('correct_lead_source'), { leadId: ID, source: ' ', medium: 'm', reason: 'une raison valable' }, ctx, principal, audit)).toEqual({ ok: false, error: 'invalid_input' });
    expect(await runTool(tool('correct_lead_source'), { leadId: ID, source: 's', medium: 'm', reason: '   court   ' }, ctx, principal, audit)).toEqual({ ok: false, error: 'invalid_input' });
  });
  it('strips empty company fields and trims the others', async () => {
    convert.convertLead.mockResolvedValue({ ok: true, clientId: 'c', projectId: 'p', clientReused: false, email: 'e', mailSent: true });
    const { ctx } = makeCtx();
    const r = await confirmTwoStep(
      tool('convert_lead_to_client'),
      {
        leadId: ID, name: ' Acme ', email: 'a@acme.fr', siret: '12345678901234', offer: 'site-vitrine', projectTitle: ' T ',
        company: { nom: ' X ', code_postal: '', adresse: '  ', commune: ' Paris ' },
      },
      ctx, principal, audit,
    );
    expect(r.ok).toBe(true);
    expect(convert.convertLead).toHaveBeenCalledWith(
      expect.objectContaining({ company: { nom: 'X', commune: 'Paris' }, name: 'Acme', projectTitle: 'T' }),
      { userId: 'admin-1' },
    );
  });
  it('lookup_siret_exists flags a malformed siret without querying', async () => {
    const { ctx, from } = makeCtx({ id: 'c1' });
    const r = await runTool(tool('lookup_siret_exists'), { siret: '123' }, ctx, principal, audit);
    expect(r).toEqual({ ok: true, data: { exists: false, reason: 'invalid_siret' } });
    expect(from).not.toHaveBeenCalled();
  });
});
