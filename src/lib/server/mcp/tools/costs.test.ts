import { beforeEach, describe, expect, it, vi } from 'vitest';
import { COST_COPY } from '@/lib/server/pilotage/costSchemas';
import { runTool } from '../registry';
import { confirmTwoStep } from '../testing';

const leads = vi.hoisted(() => ({ upsertAcquisitionCost: vi.fn() }));
const w = vi.hoisted(() => ({
  addRecurringCost: vi.fn(),
  stopRecurringCost: vi.fn(),
  addProjectCost: vi.fn(),
  voidProjectCost: vi.fn(),
  addCashBalance: vi.fn(),
}));
const load = vi.hoisted(() => {
  class PilotageLoadError extends Error {}
  return { loadCostsRegister: vi.fn(), PilotageLoadError };
});
vi.mock('@/lib/server/leads/admin', () => leads);
vi.mock('@/lib/server/pilotage/adminCosts', () => w);
vi.mock('@/lib/server/pilotage/load', () => load);

import { costTools } from './costs';

const UUID = '11111111-1111-4111-8111-111111111111';
const principal = { tokenId: 't1', userId: 'admin-1' };
const audit = vi.fn();
function makeCtx(existing: unknown = null) {
  const b: Record<string, ReturnType<typeof vi.fn>> = {};
  b.select = vi.fn(() => b);
  b.eq = vi.fn(() => b);
  b.maybeSingle = vi.fn(() => Promise.resolve({ data: existing, error: null }));
  const from = vi.fn(() => b);
  return { supabase: { from } as never, user: { id: 'admin-1' } as never, from, b };
}
const ctx = { supabase: {} as never, user: { id: 'admin-1' } as never };
const tool = (name: string) => {
  const t = costTools.find((x) => x.name === name);
  if (!t) throw new Error(`missing tool ${name}`);
  return t;
};

const register = {
  recurring: [
    { id: 1, seriesId: UUID, label: 'Figma', category: 'outils', amountCents: 1250, frequency: 'monthly', startsOn: '2026-01-01', endsOn: null, stopped: false, createdAt: 'c' },
  ],
  projectCosts: [
    { id: 4, projectId: UUID, incurredOn: '2026-10-02', category: 'autre', label: 'Photos', amountCents: 1250, vatCents: null, voidsCostId: null, createdAt: 'c' },
    { id: 5, projectId: UUID, incurredOn: '2026-10-03', category: 'autre', label: 'Photos', amountCents: 1250, vatCents: null, voidsCostId: 4, createdAt: 'c' },
  ],
  balances: [
    { id: 1, asOf: '2026-01-01', amountCents: 100000, note: null, createdAt: 'c' },
    { id: 2, asOf: '2026-06-01', amountCents: 50000, note: 'maj', createdAt: 'c' },
  ],
  projects: [{ id: UUID, title: 'Refonte', clientName: 'Dupont SARL', isTest: false }],
};

beforeEach(() => {
  audit.mockReset();
  leads.upsertAcquisitionCost.mockReset();
  leads.upsertAcquisitionCost.mockResolvedValue({ ok: true, data: null });
  for (const fn of Object.values(w)) {
    fn.mockReset();
    fn.mockResolvedValue({ ok: true, data: {} });
  }
  load.loadCostsRegister.mockReset();
  load.loadCostsRegister.mockResolvedValue(register);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('costTools metadata', () => {
  it('declares exact names and covers', () => {
    expect(Object.fromEntries(costTools.map((t) => [t.name, t.covers]))).toEqual({
      get_cost_register: [],
      save_acquisition_cost: ['saveCostAction'],
      add_recurring_cost: ['addRecurringCostAction'],
      stop_recurring_cost: ['stopRecurringAction'],
      add_project_cost: ['addProjectCostAction'],
      void_project_cost: ['voidProjectCostAction'],
      save_cash_balance: ['saveBalanceAction'],
    });
  });
  it('is destructive only for the deletion (void) and the overwrite of an acquisition cost', () => {
    expect(costTools.filter((t) => t.destructive).map((t) => t.name).sort()).toEqual(['save_acquisition_cost', 'void_project_cost']);
  });
});

describe('save_acquisition_cost overwrites: preview shows the existing and the new amount', () => {
  const args = { source: 'Google', month: '2026-10', amount: '12,5' };
  it('without confirm writes nothing and shows the new amount next to the existing one (normalised key)', async () => {
    const c = makeCtx({ cost_per_rdv_cents: 900 });
    const r = await runTool(tool('save_acquisition_cost'), args, c, principal, audit);
    expect(leads.upsertAcquisitionCost).not.toHaveBeenCalled();
    expect(c.from).toHaveBeenCalledWith('sv_acquisition_costs');
    expect(c.b.eq).toHaveBeenCalledWith('source', 'google');
    expect(c.b.eq).toHaveBeenCalledWith('campaign', '');
    expect(c.b.eq).toHaveBeenCalledWith('month', '2026-10-01');
    expect(r).toMatchObject({
      ok: true,
      needsConfirmation: true,
      preview: { wouldSave: true, source: 'google', month: '2026-10-01', newAmountCents: 1250, existingAmountCents: 900, replacesExisting: true },
    });
  });
  it('previews a first entry (no existing amount)', async () => {
    const r = await runTool(tool('save_acquisition_cost'), args, makeCtx(null), principal, audit);
    expect(r).toMatchObject({ preview: { wouldSave: true, existingAmountCents: null, replacesExisting: false } });
  });
  it('previews an invalid amount as not savable', async () => {
    const r = await runTool(tool('save_acquisition_cost'), { ...args, amount: '0' }, makeCtx(null), principal, audit);
    expect(r).toMatchObject({ ok: true, needsConfirmation: true, preview: { wouldSave: false } });
  });
  it('saves after the two-step confirmation, and the existing amount changing makes the token stale', async () => {
    const c = makeCtx({ cost_per_rdv_cents: 900 });
    const first = await runTool(tool('save_acquisition_cost'), args, c, principal, audit);
    const changed = makeCtx({ cost_per_rdv_cents: 1000 });
    const stale = await runTool(tool('save_acquisition_cost'), { ...args, confirm: true, previewToken: (first as { previewToken: string }).previewToken }, changed, principal, audit);
    expect(stale).toMatchObject({ ok: false, error: 'preview_stale' });
    expect(leads.upsertAcquisitionCost).not.toHaveBeenCalled();
    const r = await confirmTwoStep(tool('save_acquisition_cost'), args, c, principal, audit);
    expect(leads.upsertAcquisitionCost).toHaveBeenCalledWith('google', '', '2026-10-01', 1250, 'admin-1');
    expect(r).toMatchObject({ ok: true, data: { ok: true } });
  });
  it('the description says the amount is a cost per appointment', () => {
    expect(tool('save_acquisition_cost').description).toMatch(/rendez-vous/);
  });
});

describe('append-only cost writes run without confirmation and delegate to the cores', () => {
  it('add_recurring_cost', async () => {
    const r = await runTool(
      tool('add_recurring_cost'),
      { label: 'Figma', category: 'outils', amount: '12,5', frequency: 'monthly', startsOn: '2026-10-01' },
      ctx,
      principal,
      audit,
    );
    expect(w.addRecurringCost).toHaveBeenCalledWith(expect.objectContaining({ amountCents: 1250, seriesId: null, endsOn: null, actor: 'admin-1' }));
    expect(r).toMatchObject({ ok: true, data: { ok: true } });
  });
  it('stop_recurring_cost', async () => {
    await runTool(tool('stop_recurring_cost'), { seriesId: UUID, fromMonth: '2026-11' }, ctx, principal, audit);
    expect(w.stopRecurringCost).toHaveBeenCalledWith({ seriesId: UUID, from: '2026-11-01', actor: 'admin-1' });
  });
  it('add_project_cost', async () => {
    await runTool(
      tool('add_project_cost'),
      { projectId: UUID, incurredOn: '2026-10-02', category: 'autre', label: 'Photos', amount: '12,5', vat: '2,5' },
      ctx,
      principal,
      audit,
    );
    expect(w.addProjectCost).toHaveBeenCalledWith(expect.objectContaining({ amountCents: 1250, vatCents: 250 }));
  });
  it('save_cash_balance', async () => {
    await runTool(tool('save_cash_balance'), { amount: '-100', asOf: '2026-10-01', note: 'x' }, ctx, principal, audit);
    expect(w.addCashBalance).toHaveBeenCalledWith({ amountCents: -10000, asOf: '2026-10-01', note: 'x', actor: 'admin-1' });
  });
  it('a core refusal is an audited error carrying the French message', async () => {
    w.addProjectCost.mockResolvedValue({ ok: false, code: 'sv_project_not_found' });
    const r = await runTool(
      tool('add_project_cost'),
      { projectId: UUID, incurredOn: '2026-10-02', category: 'autre', label: 'Photos', amount: '12,5' },
      ctx,
      principal,
      audit,
    );
    expect(r).toEqual({ ok: false, error: COST_COPY.projectUnknown });
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ outcome: 'error' }));
  });
});

describe('void_project_cost', () => {
  it('without confirm never voids and previews the cost with its project', async () => {
    const r = await runTool(tool('void_project_cost'), { costId: 4 }, ctx, principal, audit);
    expect(w.voidProjectCost).not.toHaveBeenCalled();
    expect(r).toMatchObject({ ok: true, needsConfirmation: true });
    const json = JSON.stringify(r);
    expect(json).toContain('Photos');
    expect(json).toContain('Refonte');
    expect(json).not.toContain('Dupont SARL');
  });
  it('a register that cannot be read gives an error, never a blind preview or a token', async () => {
    load.loadCostsRegister.mockRejectedValue(new load.PilotageLoadError('x'));
    const r = await runTool(tool('void_project_cost'), { costId: 4 }, ctx, principal, audit);
    expect(r).toEqual({ ok: false, error: 'tool_failed' });
    expect(JSON.stringify(r)).not.toContain('previewToken');
    expect(w.voidProjectCost).not.toHaveBeenCalled();
  });
  it('with confirm voids with the actor', async () => {
    const r = await confirmTwoStep(tool('void_project_cost'), { costId: 4 }, ctx, principal, audit);
    expect(w.voidProjectCost).toHaveBeenCalledWith({ costId: 4, actor: 'admin-1' });
    expect(r).toMatchObject({ ok: true, data: { ok: true } });
  });
  it('rejects a non-positive id as invalid_input', async () => {
    expect(await confirmTwoStep(tool('void_project_cost'), { costId: 0 }, ctx, principal, audit)).toEqual({ ok: false, error: 'invalid_input' });
  });
});

describe('get_cost_register', () => {
  it('returns the register through loadCostsRegister with the RLS client, without client names', async () => {
    const r = await runTool(tool('get_cost_register'), {}, ctx, principal, audit);
    expect(load.loadCostsRegister).toHaveBeenCalledWith(ctx.supabase);
    expect(r).toMatchObject({ ok: true });
    const data = (r as { data: Record<string, unknown> }).data as {
      recurring: { seriesId: string; versions: { status: string }[] }[];
      projectCosts: { id: number; status: string; projectTitle: string | null }[];
      balances: { id: number }[];
      currentBalance: { id: number } | null;
    };
    expect(data.recurring[0].versions[0].status).toBe('Active');
    expect(data.projectCosts).toEqual([expect.objectContaining({ id: 4, status: 'Annulé', projectTitle: 'Refonte' })]);
    expect(data.balances.map((b) => b.id)).toEqual([2, 1]);
    expect(data.currentBalance?.id).toBe(2);
    expect(JSON.stringify(r)).not.toContain('Dupont SARL');
  });
  it('fails when the read fails', async () => {
    load.loadCostsRegister.mockRejectedValue(new load.PilotageLoadError('x'));
    expect(await runTool(tool('get_cost_register'), {}, ctx, principal, audit)).toEqual({ ok: false, error: 'tool_failed' });
  });
});
